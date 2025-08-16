import { readFile, unlink, writeFile } from 'fs/promises';
import * as path from "node:path";
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { Storage } from '@google-cloud/storage';
import { db } from './db.ts';
import { videos, moderationDecisions, videoComments, threadMessages } from  "../shared/schema.ts";
import { eq } from 'drizzle-orm';
import { bunnyService } from './bunnyService.ts';
import { storage as dbStorage } from './storage.ts';
import { xpService } from './xpService.ts';
import { join } from "path";
type DBVideoCommentInsert = typeof videoComments.$inferInsert;
type DBVideoInsert = typeof videos.$inferInsert;
type DBVideoModerationInsert = typeof moderationDecisions.$inferInsert;


interface ProcessingMetadata {
  title?: string;
  description?: string;
  category?: string;
  latitude?: string;
  longitude?: string;
  visibility?: string;
  groupId?: string;
  questId?: string;
  userId?: string;
  frontendDuration?: number;
  duration?: number;
  // Video comment specific fields
  videoType?: string;
  commentId?: number;
  videoId?: string;
  threadId?: string;
  messageId?: string;
}

interface ModerationResult {
  approved: boolean;
  flagReason?: string;
  videoModeration: boolean;
  audioModeration: string;
  extractedKeywords?: string[];
  transcription?: string;
}

export class UploadFirstProcessor {
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
      console.log('🔧 UPLOAD-PROCESSOR: Initialized with CONTENT_MODERATION_WORKER credentials for GCS uploads');
    } catch (error) {
      console.error('❌ UPLOAD-PROCESSOR: Failed to initialize Google Cloud Storage:', error);
      throw error;
    }
  }

  async processVideo(videoId: string, videoPath: string, metadata: ProcessingMetadata, isAsync: boolean = true): Promise<boolean> {
    let processedVideoPath: string | null = null;
    let gcsUri: string | null = null;

    try {
      console.log(`🚀 UPLOAD-PROCESSOR: ===== STARTING VIDEO PROCESSING =====`);
      console.log(`🚀 Video ID: ${videoId}`);
      console.log(`🚀 Video path: ${videoPath}`);
      console.log(`🚀 Metadata:`, JSON.stringify(metadata, null, 2));

      // Step 1: Preprocess video (WebM to MP4 conversion with iOS support)
      console.log(`🔧 STEP 1: Preprocessing video with enhanced iOS compatibility`);
      try {
        processedVideoPath = await this.preprocessVideo(videoPath, videoId, metadata.frontendDuration);
        console.log(`✅ STEP 1: Preprocessing completed - new path: ${processedVideoPath}`);
        
        // Store preprocessing data in database immediately after successful preprocessing
        await this.storePreprocessingData(videoId, videoPath, processedVideoPath, metadata);
        console.log(`📋 STEP 1: Preprocessing data stored in database`);
        
      } catch (preprocessError: any) {
        console.error(`❌ STEP 1: Video preprocessing failed:`, preprocessError.message);
        
        // Enhanced error messaging for video format issues
        let userFriendlyError = 'Video processing temporarily unavailable';
        if (preprocessError.message.includes('Invalid data found')) {
          userFriendlyError = 'Video format not supported - please try recording again';
        } else if (preprocessError.message.includes('No such file')) {
          userFriendlyError = 'Video file was not found - please try uploading again';
        } else if (preprocessError.message.includes('Permission denied')) {
          userFriendlyError = 'Video processing error - please try again';
        }
        
        throw new Error(userFriendlyError);
      }

      // Step 2: Upload to GCS for AI analysis (MANDATORY SECURITY STEP)
      console.log(`📤 STEP 2: ===== UPLOADING TO GCS FOR AI ANALYSIS =====`);
      gcsUri = await this.uploadToGCS(videoId, processedVideoPath);
      console.log(`✅ STEP 2: Video uploaded to GCS: ${gcsUri}`);
      
      // Update database with GCS URL immediately after successful upload
      await this.updateGCSUrl(videoId, gcsUri, metadata);
      console.log(`📋 STEP 2: GCS URL stored in database`);

      // Step 3: Run AI moderation (MANDATORY SECURITY)
      console.log(`🤖 STEP 3: ===== RUNNING AI MODERATION ANALYSIS =====`);
      const moderationResult = await this.runAIModeration(videoId, gcsUri);
      console.log(`✅ STEP 3: AI moderation completed - approved: ${moderationResult.approved}`);

      // Step 4: Update database based on moderation result
      console.log(`💾 STEP 4: ===== UPDATING DATABASE =====`);
      
      if (moderationResult.approved) {
        console.log(`✅ STEP 4: Video passed AI moderation - uploading to Bunny CDN`);
        
        // Read processed video file for Bunny upload
        const videoBuffer = await readFile(processedVideoPath);
        
        // Upload to Bunny CDN for approved videos
        const bunnyResult = await bunnyService.uploadVideo(videoBuffer, `${videoId}.mp4`);
        
        // Update database with approved status (handles both videos and video comments)
        await this.updateVideoDatabase(videoId, metadata, moderationResult, bunnyResult.videoUrl, bunnyResult.thumbnailUrl, bunnyResult.videoId);
        
        // Award XP for successful video upload
        if (metadata.userId) {
          try {
            const xpType = metadata.videoType === 'video_comment' ? 'VIDEO_COMMENT' : 'POST_VIDEO';
            const xpResult = await xpService.awardXP(metadata.userId, xpType);
            if (xpResult.leveledUp) {
              console.log(`🎉 LEVEL UP: User ${metadata.userId} leveled up to ${xpResult.newLevel} after ${xpType}!`);
            }
          } catch (xpError) {
            console.error('Error awarding XP for video upload:', xpError);
          }
        }
        
        console.log(`🎉 STEP 4: Video processing completed successfully - now live on platform`);
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
      console.error(`❌ UPLOAD-PROCESSOR: Processing failed:`, error);
      
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
    console.log(`🔧 PREPROCESS: Starting enhanced iOS-compatible preprocessing for ${videoId}`);
    
    const outputPath = join('./uploads/temp-uploads/', `${videoId}_processed.mp4`);
    
    return new Promise((resolve, reject) => {
      // Enhanced FFmpeg args with iOS/iPad compatibility
      let ffmpegArgs = [
        // Input handling with error resilience
        '-fflags', '+genpts+discardcorrupt+igndts+ignidx',
        '-err_detect', 'ignore_err',
        '-analyzeduration', '100M',
        '-probesize', '100M',
        '-i', inputPath
      ];

      // Add duration limit if specified (before output encoding options)
      if (duration && duration > 0) {
        ffmpegArgs.push('-t', duration.toString());
      }

      // Add encoding and output options
      ffmpegArgs.push(
        // Video encoding optimized for iOS formats (.mov, H.265)
        '-c:v', 'libx264',
        '-preset', 'medium', // Better quality for iOS videos
        '-crf', '23',
        '-profile:v', 'main', // Better iOS compatibility
        '-level', '4.0',
        '-pix_fmt', 'yuv420p', // Ensure compatibility
        
        // Scale handling for odd dimensions (common in iOS)
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        
        // Audio encoding compatible with iOS audio
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', '44100', // Standard sample rate
        
        // MP4 optimization
        '-movflags', '+faststart',
        '-f', 'mp4', // Force MP4 format
        '-y', // Overwrite output file
        outputPath
      );

      console.log(`🍎 PREPROCESS: Enhanced iOS preprocessing - Input: ${inputPath}`);
      console.log(`🔧 PREPROCESS: Running FFmpeg with iOS-optimized args`);
      
      const ffmpeg = spawn('ffmpeg', ffmpegArgs);
      
      let stderr = '';
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ PREPROCESS: iOS video preprocessing completed successfully`);
          resolve(outputPath);
        } else {
          console.error(`❌ PREPROCESS: FFmpeg failed with code ${code}`);
          console.error(`❌ PREPROCESS: FFmpeg stderr:`, stderr);
          reject(new Error(`iOS video preprocessing failed - exit code ${code}: ${stderr.slice(-500)}`));
        }
      });
      
      ffmpeg.on('error', (error) => {
        console.error(`❌ PREPROCESS: FFmpeg spawn error:`, error);
        reject(new Error(`iOS video preprocessing failed: ${error.message}`));
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

  async runAIModeration(videoId: string, gcsUri: string): Promise<ModerationResult> {
    console.log(`🤖 AI: Starting comprehensive AI moderation analysis for ${videoId}`);
    
    try {
      // Import AI moderation services
      const { audioProcessingService } = await import('./audioProcessingService.js');
      const { videoModerationService } = await import('./videoModerationService.js');
      
      // Run both audio and video AI analysis in parallel
      console.log(`🎵 AI: Starting audio analysis for ${videoId}`);
      const audioModerationPromise = audioProcessingService.processAudio(videoId, gcsUri);
      
      console.log(`🎬 AI: Starting video content analysis for ${videoId}`);
      const videoModerationPromise = videoModerationService.analyzeVideoFromGCS(gcsUri);
      
      // Wait for both analyses to complete with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AI moderation timeout after 5 minutes')), 5 * 60 * 1000);
      });
      
      const [audioResult, videoResult] = await Promise.race([
        Promise.all([audioModerationPromise, videoModerationPromise]),
        timeoutPromise
      ]) as [any, any];
      
      console.log(`🎵 AI: Audio analysis result - ${audioResult.moderationStatus}`);
      console.log(`🎬 AI: Video analysis result - ${videoResult.approved ? 'approved' : 'rejected'}`);
      
      // Determine overall approval (both audio AND video must pass)
      const audioApproved = audioResult.success && audioResult.moderationStatus === 'passed';
      const videoApproved = videoResult.approved;
      const overallApproved = audioApproved && videoApproved;
      
      // Determine primary flag reason
      let flagReason = null;
      if (!audioApproved && !videoApproved) {
        flagReason = `Audio: ${audioResult.flagReason || 'inappropriate content'} | Video: ${videoResult.reason || 'inappropriate content'}`;
      } else if (!audioApproved) {
        flagReason = audioResult.flagReason || 'Inappropriate audio content detected';
      } else if (!videoApproved) {
        flagReason = videoResult.reason || 'Inappropriate video content detected';
      }
      
      console.log(`✅ AI: Complete moderation analysis finished - Overall: ${overallApproved ? 'APPROVED' : 'REJECTED'}`);
      
      return {
        approved: overallApproved,
        flagReason: flagReason,
        videoModeration: videoApproved,
        audioModeration: audioResult.moderationStatus || 'failed',
        transcription: audioResult.transcription || null,
        extractedKeywords: audioResult.extractedKeywords || null
      };
      
    } catch (error) {
      console.error(`❌ AI: Comprehensive moderation failed for ${videoId}:`, error);
      
      // Fail-closed: reject video if AI analysis fails
      return {
        approved: false,
        flagReason: 'AI moderation system temporarily unavailable',
        videoModeration: false,
        audioModeration: 'failed'
      };
    }
  }

  private async updateVideoDatabase(
    videoId: string, 
    metadata: ProcessingMetadata, 
    moderationResult: ModerationResult, 
    cdnUrl: string, 
    thumbnailUrl: string, 
    bunnyVideoId: string
  ): Promise<void> {
    console.log(`💾 DB: Updating database with approved content`);

    // Handle video comments differently from regular videos
    if (metadata.videoType === 'video_comment' && metadata.commentId) {
      console.log(`💬 DB: Updating video comment ${metadata.commentId} as approved`);
      
      // Update video comment with Bunny URLs and thumbnail
      await db.update(videoComments)
        .set({
          processingStatus: 'approved',
          bunnyVideoId: bunnyVideoId,
          commentVideoUrl: cdnUrl, 
          thumbnailUrl: thumbnailUrl,
        } as Partial<DBVideoCommentInsert>)
        .where(eq(videoComments.id, metadata.commentId));
        
      console.log(`✅ DB: Video comment updated successfully`);
    } else if (metadata.videoType === 'thread_message' && metadata.messageId) {
      console.log(`📩 DB: Updating thread message ${metadata.messageId} as approved`);
      
      // Update thread message with Bunny URLs and thumbnail
      await dbStorage.updateThreadMessageStatus(
        parseInt(metadata.messageId),
        'approved',
        null,
        cdnUrl,
        thumbnailUrl,
        bunnyVideoId
      );
        
      console.log(`✅ DB: Thread message updated successfully`);
    } else {
      console.log(`🎬 DB: Updating regular video ${videoId} as approved`);
      
      // Create moderation decision record
      await db.insert(moderationDecisions).values({
        videoId: videoId,
        moderatorId: null, // AI/system decision
        decision: 'approved',
        reason: 'AI moderation passed',
        decisionType: 'ai_moderation',
        createdAt: new Date()
      } as DBVideoModerationInsert );

      // Update videos table
      await db.update(videos)
        .set({
          videoUrl: cdnUrl,
          thumbnailUrl: thumbnailUrl,
          processingStatus: 'approved',
          bunnyVideoId: bunnyVideoId,
          transcriptionText: moderationResult.transcription,
          extractedKeywords: moderationResult.extractedKeywords
        } as Partial<DBVideoInsert>)
        .where(eq(videos.id, videoId));

      console.log(`✅ DB: Regular video updated successfully`);
    }
  }

  private async markVideoAsFailed(videoId: string, metadata: ProcessingMetadata, reason: string): Promise<void> {
    console.log(`❌ DB: Marking content as failed: ${reason}`);

    // Handle video comments differently from regular videos
    if (metadata.videoType === 'video_comment' && metadata.commentId) {
      console.log(`💬 DB: Updating video comment ${metadata.commentId} as failed`);
      
      // Update video comment status
      await db.update(videoComments)
        .set({
          processingStatus: 'failed',
          flaggedReason: reason
        } as Partial<DBVideoCommentInsert>)
        .where(eq(videoComments.id, metadata.commentId));
        
      console.log(`✅ DB: Video comment marked as failed`);
    } else if (metadata.videoType === 'thread_message' && metadata.messageId) {
      console.log(`📩 DB: Updating thread message ${metadata.messageId} as failed`);
      
      // Update thread message status
      await dbStorage.updateThreadMessageStatus(
        parseInt(metadata.messageId),
        'failed',
        reason
      );
        
      console.log(`✅ DB: Thread message marked as failed`);
    } else {
      console.log(`🎬 DB: Updating regular video ${videoId} as failed`);
      
      // Create moderation decision record for rejection
      await db.insert(moderationDecisions).values({
        videoId: videoId,
        moderatorId: null, // AI/system decision
        decision: 'rejected',
        reason: reason,
        decisionType: 'ai_moderation',
        createdAt: new Date()
      } as DBVideoModerationInsert);

      // Update videos table
      await db.update(videos)
        .set({
          processingStatus: 'rejected',
          flaggedReason: reason
        } as Partial<DBVideoInsert>)
        .where(eq(videos.id, videoId));

      console.log(`✅ DB: Regular video marked as failed`);
    }
  }

  private async cleanupTempFile(filePath: string): Promise<void> {
    try {
      await unlink(filePath);
      console.log(`🧹 CLEANUP: Removed temp file: ${filePath}`);
    } catch (error) {
      console.warn(`⚠️ CLEANUP: Could not remove temp file ${filePath}:`, error instanceof Error ? error.message : String(error));
    }
  }

  private async storePreprocessingData(videoId: string, originalPath: string, processedPath: string, metadata: ProcessingMetadata): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('node:path');
      
      // Get file stats for both original and processed files
      const originalStats = await fs.stat(originalPath);
      const processedStats = await fs.stat(processedPath);
      
      // Extract original filename from path
      const originalFilename = path.basename(originalPath);
      
      console.log(`📊 PREPROCESSING DATA: Original file: ${originalFilename} (${originalStats.size} bytes)`);
      console.log(`📊 PREPROCESSING DATA: Processed file: ${processedStats.size} bytes`);
      
      // Handle different video types for preprocessing data storage
      if (metadata.videoType === 'video_comment' && metadata.commentId) {
        // Video comment preprocessing data - no storage needed in videos table
        console.log(`💬 PREPROCESSING: Video comment preprocessing complete for comment ${metadata.commentId}`);
      } else if (metadata.videoType === 'thread_message' && metadata.messageId) {
        // Thread message preprocessing data - no storage needed in videos table  
        console.log(`📩 PREPROCESSING: Thread message preprocessing complete for message ${metadata.messageId}`);
      } else {
        // Regular video - store preprocessing data in videos table
        console.log(`🎬 PREPROCESSING: Storing data for regular video ${videoId}`);
        
        await db.update(videos)
          .set({
            originalFilename: originalFilename,
            originalFileSize: originalStats.size,
            duration: String(metadata.duration || metadata.frontendDuration || 0),
            processingStatus: 'pending_ai_analysis'
          } as Partial<DBVideoInsert>)
          .where(eq(videos.id, videoId));
        
        console.log(`✅ PREPROCESSING: Data stored successfully for video ${videoId}`);
      }
    } catch (error) {
      console.error(`❌ PREPROCESSING: Failed to store preprocessing data for ${videoId}:`, error);
      // Don't throw error - preprocessing data storage is informational, not critical
    }
  }

  private async updateGCSUrl(videoId: string, gcsUri: string, metadata: ProcessingMetadata): Promise<void> {
    try {
      // Handle different video types for GCS URL storage
      if (metadata.videoType === 'video_comment' && metadata.commentId) {
        // Video comment - no GCS URL storage needed in videos table
        console.log(`💬 GCS: Video comment uploaded to GCS for moderation analysis`);
      } else if (metadata.videoType === 'thread_message' && metadata.messageId) {
        // Thread message - no GCS URL storage needed in videos table
        console.log(`📩 GCS: Thread message uploaded to GCS for moderation analysis`);
      } else {
        // Regular video - store GCS URL in videos table
        await db.update(videos)
          .set({
            gcsProcessingUrl: gcsUri,
            processingStatus: 'pending_ai_analysis'
          } as Partial<DBVideoInsert>)
          .where(eq(videos.id, videoId));
        
        console.log(`✅ GCS: URL stored in database for video ${videoId}`);
      }
    } catch (error) {
      console.error(`❌ GCS: Failed to store GCS URL for ${videoId}:`, error);
      // Don't throw error - GCS URL storage is informational for tracking
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

export const uploadFirstProcessor = new UploadFirstProcessor();