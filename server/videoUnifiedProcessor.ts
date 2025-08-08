import { readFile, unlink, writeFile } from 'fs/promises';
import { join } from "node:path";
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { Storage } from '@google-cloud/storage';
import { db } from './db.js';
import { videos, moderationDecisions, videoComments, threadMessages } from '@shared/schema.ts';
import { eq } from 'drizzle-orm';
import { bunnyService } from './bunnyService.js';

interface ProcessingMetadata {
  title?: string;
  description?: string;
  category?: string;
  latitude?: string;
  longitude?: string;
  visibility?: string;
  groupId?: string;
  questId?: string;
  userId: string;
  frontendDuration?: number;
  duration?: number;
  // Video type for unified processing
  videoType: 'main' | 'video_comment' | 'thread_message';
  // Type-specific IDs
  commentId?: number;
  videoId?: string;
  messageId?: number;
  threadId?: string;
}

interface ModerationResult {
  approved: boolean;
  flagReason?: string;
  videoModeration: boolean;
  audioModeration: string;
  extractedKeywords?: string[];
  transcription?: string;
}

export class VideoUnifiedProcessor {
  private storage: Storage;
  public lastProcessingResult: any = null;

  constructor() {
    // Initialize Google Cloud Storage with CONTENT MODERATION credentials
    try {
      const contentModerationCredentials = process.env.CONTENT_MODERATION_WORKER_JUN_26_2025;
      
      if (!contentModerationCredentials) {
        throw new Error('CONTENT_MODERATION_WORKER_JUN_26_2025 credentials not found - required for GCS upload');
      }

      const credentials = JSON.parse(contentModerationCredentials);
      
      this.storage = new Storage({
        credentials: credentials,
        projectId: credentials.project_id || 'steam-house-461401-t7'
      });
      console.log('🔧 UNIFIED-PROCESSOR: Initialized with CONTENT_MODERATION_WORKER credentials for GCS uploads');
    } catch (error) {
      console.error('❌ UNIFIED-PROCESSOR: Failed to initialize Google Cloud Storage:', error);
      throw error;
    }
  }

  async processVideo(videoPath: string, metadata: ProcessingMetadata): Promise<boolean> {
    let processedVideoPath: string | null = null;
    let gcsUri: string | null = null;
    const videoId = randomUUID();

    try {
      console.log(`🚀 UNIFIED: ===== STARTING ${metadata.videoType.toUpperCase()} PROCESSING =====`);
      console.log(`🚀 UNIFIED: Video path: ${videoPath}`);
      console.log(`🚀 UNIFIED: Metadata:`, JSON.stringify(metadata, null, 2));
      console.log(`📋 PIPELINE: Preprocess → GCS → AI Analysis → Bunny Upload → Database Update`);

      // Verify the initial video file exists
      const fs = await import('fs/promises');
      try {
        await fs.access(videoPath);
        console.log(`🚀 UNIFIED: ✅ Video file exists at: ${videoPath}`);
      } catch (accessError) {
        console.error(`🚀 UNIFIED: ❌ Video file missing at: ${videoPath}`);
        throw new Error('Video file could not be accessed for processing. Please try uploading again.');
      }

      // Step 1: Preprocess video (WebM to MP4 conversion)
      console.log(`🔧 STEP 1: Preprocessing video`);
      processedVideoPath = await this.preprocessVideo(videoPath, videoId, metadata.frontendDuration);
      console.log(`✅ STEP 1: Preprocessing completed - new path: ${processedVideoPath}`);

      // Step 2: Upload to GCS for AI analysis (MANDATORY SECURITY STEP)
      console.log(`📤 STEP 2: ===== UPLOADING TO GCS FOR AI ANALYSIS =====`);
      gcsUri = await this.uploadToGCS(videoId, processedVideoPath);
      console.log(`✅ STEP 2: Video uploaded to GCS: ${gcsUri}`);

      // Step 3: Run AI moderation (MANDATORY SECURITY)
      console.log(`🤖 STEP 3: ===== RUNNING AI MODERATION ANALYSIS =====`);
      const moderationResult = await this.runAIModeration(videoId, gcsUri);
      console.log(`✅ STEP 3: AI moderation completed - approved: ${moderationResult.approved}`);

      // Step 4: Process based on video type and moderation result
      console.log(`💾 STEP 4: ===== UPDATING DATABASE AND STORAGE =====`);
      
      if (moderationResult.approved) {
        console.log(`✅ STEP 4: Video passed AI moderation - uploading to Bunny CDN`);
        
        // Upload to Bunny CDN for approved videos
        const bunnyResult = await bunnyService.uploadVideo(processedVideoPath, `${videoId}.mp4`);
        
        // Update appropriate database table based on video type
        await this.updateDatabaseByType(videoId, metadata, moderationResult, bunnyResult.videoUrl, bunnyResult.thumbnailUrl, bunnyResult.videoId);
        
        console.log(`🎉 STEP 4: ${metadata.videoType} processing completed successfully - now live on platform`);
      } else {
        console.log(`❌ STEP 4: Video rejected by AI moderation: ${moderationResult.flagReason}`);
        await this.markVideoAsFailed(videoId, metadata, moderationResult.flagReason || 'Content policy violation');
      }

      // Step 5: Cleanup
      await this.cleanupTempFile(videoPath);
      if (processedVideoPath) {
        await this.cleanupTempFile(processedVideoPath);
      }
      if (gcsUri) {
        await this.cleanupGCS(gcsUri);
      }

      return moderationResult.approved;

    } catch (error) {
      console.error(`❌ UNIFIED: Processing failed for ${metadata.videoType}:`, error);
      
      // Cleanup on error
      if (processedVideoPath) {
        await this.cleanupTempFile(processedVideoPath);
      }
      if (gcsUri) {
        await this.cleanupGCS(gcsUri);
      }
      
      await this.markVideoAsFailed(videoId, metadata, error instanceof Error ? error.message : 'Processing failed');
      return false;
    }
  }

  private async preprocessVideo(inputPath: string, videoId: string, duration?: number): Promise<string> {
    console.log(`🔧 PREPROCESS: Starting preprocessing for ${videoId}`);
    
    const outputPath = join('./uploads/temp-uploads/', `${videoId}_processed.mp4`);
    
    return new Promise((resolve, reject) => {
      let ffmpegArgs = [
        '-i', inputPath,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-y', // Overwrite output file
        outputPath
      ];

      // Add duration limit if specified
      if (duration && duration > 0) {
        ffmpegArgs.splice(2, 0, '-t', duration.toString());
      }

      console.log(`🔧 PREPROCESS: Running FFmpeg with args:`, ffmpegArgs);
      
      const ffmpeg = spawn('ffmpeg', ffmpegArgs);
      
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ PREPROCESS: Video preprocessing completed successfully`);
          resolve(outputPath);
        } else {
          console.error(`❌ PREPROCESS: FFmpeg failed with code ${code}`);
          reject(new Error(`Video preprocessing failed with exit code ${code}`));
        }
      });
      
      ffmpeg.on('error', (error) => {
        console.error(`❌ PREPROCESS: FFmpeg spawn error:`, error);
        reject(new Error(`Video preprocessing failed: ${error.message}`));
      });
    });
  }

  private async uploadToGCS(videoId: string, videoPath: string): Promise<string> {
    console.log(`📤 GCS: Uploading ${videoId} to GCS for AI analysis`);
    
    const bucket = this.storage.bucket('jemzy-video-moderation-steam-house-461401-t7');
    const fileName = `${videoId}.mp4`;
    const file = bucket.file(`raw-videos/${fileName}`);
    
    await file.save(await readFile(videoPath), {
      metadata: {
        contentType: 'video/mp4',
      },
    });
    
    const gcsUri = `gs://${bucket.name}/raw-videos/${fileName}`;
    console.log(`✅ GCS: Upload completed - URI: ${gcsUri}`);
    
    return gcsUri;
  }

  private async runAIModeration(videoId: string, gcsUri: string): Promise<ModerationResult> {
    console.log(`🤖 AI: Running AI moderation for ${videoId}`);
    
    // Import AI moderation services
    const { uploadFirstProcessor } = await import('./uploadFirstProcessor.js');
    
    // Use the existing AI moderation logic
    return await uploadFirstProcessor.runAIModeration(videoId, gcsUri);
  }

  private async updateDatabaseByType(
    videoId: string, 
    metadata: ProcessingMetadata, 
    moderationResult: ModerationResult, 
    cdnUrl: string, 
    thumbnailUrl: string, 
    bunnyVideoId: string
  ): Promise<void> {
    console.log(`💾 DB: Updating ${metadata.videoType} database with approved content`);

    // Create moderation decision record
    await db.insert(moderationDecisions).values({
      id: randomUUID(),
      userId: metadata.userId,
      contentType: metadata.videoType,
      contentId: videoId,
      decision: 'approved',
      flagReason: null,
      videoModeration: moderationResult.videoModeration,
      audioModeration: moderationResult.audioModeration,
      extractedKeywords: moderationResult.extractedKeywords,
      transcriptionText: moderationResult.transcription,
      createdAt: new Date()
    });

    switch (metadata.videoType) {
      case 'main':
        // Update main videos table
        await db.update(videos)
          .set({
            videoUrl: cdnUrl,
            thumbnailUrl: thumbnailUrl,
            processingStatus: 'approved',
            bunnyVideoId: bunnyVideoId,
            transcriptionText: moderationResult.transcription,
            extractedKeywords: moderationResult.extractedKeywords
          })
          .where(eq(videos.id, videoId));
        break;

      case 'video_comment':
        // Update video comments table
        if (metadata.commentId) {
          await db.update(videoComments)
            .set({
              videoUrl: cdnUrl,
              processingStatus: 'approved',
              thumbnailUrl: thumbnailUrl
            })
            .where(eq(videoComments.id, metadata.commentId));
        }
        break;

      case 'thread_message':
        // Update thread messages table
        if (metadata.messageId) {
          await db.update(threadMessages)
            .set({
              videoUrl: cdnUrl,
              processingStatus: 'approved',
              thumbnailUrl: thumbnailUrl
            })
            .where(eq(threadMessages.id, metadata.messageId));
        }
        break;

      default:
        throw new Error(`Unknown video type: ${metadata.videoType}`);
    }

    console.log(`✅ DB: ${metadata.videoType} database updated successfully`);
  }

  private async markVideoAsFailed(videoId: string, metadata: ProcessingMetadata, reason: string): Promise<void> {
    console.log(`❌ DB: Marking ${metadata.videoType} as failed: ${reason}`);

    // Create moderation decision record for rejection
    await db.insert(moderationDecisions).values({
      id: randomUUID(),
      userId: metadata.userId,
      contentType: metadata.videoType,
      contentId: videoId,
      decision: 'rejected',
      flagReason: reason,
      videoModeration: false,
      audioModeration: 'failed',
      extractedKeywords: null,
      transcriptionText: null,
      createdAt: new Date()
    });

    switch (metadata.videoType) {
      case 'main':
        await db.update(videos)
          .set({
            processingStatus: 'rejected',
            processingError: reason
          })
          .where(eq(videos.id, videoId));
        break;

      case 'video_comment':
        if (metadata.commentId) {
          await db.update(videoComments)
            .set({
              processingStatus: 'rejected',
              processingError: reason
            })
            .where(eq(videoComments.id, metadata.commentId));
        }
        break;

      case 'thread_message':
        if (metadata.messageId) {
          await db.update(threadMessages)
            .set({
              processingStatus: 'rejected',
              processingError: reason
            })
            .where(eq(threadMessages.id, metadata.messageId));
        }
        break;
    }

    console.log(`✅ DB: ${metadata.videoType} marked as failed`);
  }

  private async cleanupTempFile(filePath: string): Promise<void> {
    try {
      await unlink(filePath);
      console.log(`🧹 CLEANUP: Removed temp file: ${filePath}`);
    } catch (error) {
      console.warn(`⚠️ CLEANUP: Could not remove temp file ${filePath}:`, error instanceof Error ? error.message : String(error));
    }
  }

  private async cleanupGCS(gcsUri: string): Promise<void> {
    try {
      const bucket = this.storage.bucket('jemzy-video-moderation-steam-house-461401-t7');
      const fileName = gcsUri.split('/').pop();
      if (fileName) {
        const file = bucket.file(`raw-videos/${fileName}`);
        await file.delete();
        console.log(`🧹 CLEANUP: Removed GCS file: ${gcsUri}`);
      }
    } catch (error) {
      console.warn(`⚠️ CLEANUP: Could not remove GCS file ${gcsUri}:`, error instanceof Error ? error.message : String(error));
    }
  }
}

export const videoUnifiedProcessor = new VideoUnifiedProcessor();