import { spawn } from 'child_process';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from "node:path";
import { db } from './db.ts';
import { videos } from '../shared/schema.ts';
import { eq } from 'drizzle-orm';
import { bunnyService } from './bunnyService.ts';

interface VideoProcessingJob {
  videoId: string;
  tempFilePath: string;
  originalFilename: string;
  frontendDuration?: number;
  userId: string;
  metadata: {
    title: string;
    description?: string;
    category: string;
    latitude?: string;
    longitude?: string;
    visibility: string;
    groupId?: string;
  };
}

class VideoProcessingService {
  private storage: Storage;
  private gcsBucket: string;
  private processingQueue: VideoProcessingJob[] = [];
  private isProcessing = false;

   constructor(opts?: { storage?: Storage; gcsBucket?: string }) {
    this.storage = opts?.storage ?? new Storage();
    this.gcsBucket =
      opts?.gcsBucket ??
      process.env.GCS_BUCKET ??
      process.env.GOOGLE_CLOUD_BUCKET ??
      '';

    if (!this.gcsBucket) {
      throw new Error(
        'Missing GCS bucket name. Set GCS_BUCKET or GOOGLE_CLOUD_BUCKET in env.'
      );
    }
  }
  async queueVideoForProcessing(job: VideoProcessingJob): Promise<void> {
    console.log(`Queuing video ${job.videoId} for processing`);
    this.processingQueue.push(job);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    this.isProcessing = true;

    while (this.processingQueue.length > 0) {
      const job = this.processingQueue.shift();
      if (job) {
        try {
          await this.processVideo(job);
        } catch (error) {
          console.error(`Failed to process video ${job.videoId}:`, error);
          await this.markVideoAsFailed(job.videoId, error instanceof Error ? error.message : 'Unknown error');
        }
      }
    }

    this.isProcessing = false;
  }

  private async processVideo(job: VideoProcessingJob): Promise<void> {
    const { videoId, tempFilePath, originalFilename, frontendDuration, metadata } = job;
    
    console.log(`Processing video ${videoId}: ${originalFilename}`);
    
    let processedVideoPath: string | null = null;

    try {
      // Step 1: FFmpeg preprocessing to fix browser recording issues
      processedVideoPath = await this.preprocessVideo(tempFilePath, videoId, frontendDuration);
      
      // Step 2: Basic content validation (file size, duration, format)
      const isValid = await this.validateVideoContent(processedVideoPath);
      
      if (isValid) {
        await this.approveVideo(videoId, processedVideoPath, metadata);
      } else {
        await this.flagVideo(videoId, processedVideoPath, metadata, 'Video failed basic validation checks');
      }

    } catch (error) {
      console.error(`Video processing failed for ${videoId}:`, error);
      throw error;
    } finally {
      // Cleanup temporary files
      if (processedVideoPath) {
        try { await unlink(processedVideoPath); } catch {}
      }
      try { await unlink(tempFilePath); } catch {}
    }
  }

  private async preprocessVideo(inputPath: string, videoId: string, duration?: number): Promise<string> {
    const outputPath = join('/tmp', `${videoId}_processed.mp4`);
    
    return new Promise((resolve, reject) => {
      const ffmpegArgs = [
        '-err_detect', 'ignore_err',
        '-fflags', '+genpts+discardcorrupt+igndts+ignidx',
        '-analyzeduration', '100M',
        '-probesize', '100M',
        '-i', inputPath
      ];

      if (duration && duration > 0) {
        ffmpegArgs.push('-t', duration.toString());
      }

      ffmpegArgs.push(
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-pix_fmt', 'yuv420p',
        '-profile:v', 'high',
        '-level', '4.0',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', 'faststart',
        '-y',
        outputPath
      );

      const ffmpeg = spawn('ffmpeg', ffmpegArgs);
      
      let stderr = '';
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log(`Video preprocessing completed for ${videoId}`);
          resolve(outputPath);
        } else {
          reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
        }
      });

      ffmpeg.on('error', (err) => {
        reject(new Error(`FFmpeg process error: ${err.message}`));
      });
    });
  }

  private async uploadToGCS(videoPath: string, videoId: string, originalFilename: string): Promise<string> {
    const fileName = `processing/${videoId}/${originalFilename}.mp4`;
    const bucket = this.storage.bucket(this.gcsBucket);
    const file = bucket.file(fileName);

    await file.save(await readFile(videoPath), {
      metadata: {
        contentType: 'video/mp4',
      },
    });

    console.log(`Uploaded to GCS: gs://${this.gcsBucket}/${fileName}`);
    return `gs://${this.gcsBucket}/${fileName}`;
  }

  private async analyzeVideoContent(gcsUri: string): Promise<any> {
    console.log(`Starting Video AI analysis for: ${gcsUri}`);
    
    const request = {
      inputUri: gcsUri,
      features: ['EXPLICIT_CONTENT_DETECTION' as const],
      locationId: 'us-east1'
    };

    const [operation] = await this.videoAI.annotateVideo(request);
    const [result] = await operation.promise();
    
    console.log('Video AI analysis completed');
    return result;
  }

  private evaluateModerationResults(results: any): { approved: boolean; reason?: string } {
    const explicitContentAnnotation = results.annotationResults?.[0]?.explicitContentAnnotation;
    
    if (!explicitContentAnnotation) {
      return { approved: true };
    }

    // Check for explicit content in frames
    const flaggedFrames = explicitContentAnnotation.frames?.filter((frame: any) => 
      frame.pornographyLikelihood === 'LIKELY' || 
      frame.pornographyLikelihood === 'VERY_LIKELY'
    ) || [];

    if (flaggedFrames.length > 0) {
      return { 
        approved: false, 
        reason: `Explicit content detected in ${flaggedFrames.length} frames` 
      };
    }

    return { approved: true };
  }

  private async approveVideo(videoId: string, videoPath: string, moderationResults: any): Promise<void> {
    console.log(`Approving video ${videoId}`);
    
    // Upload to Bunny.net Stream for long-term hosting
    const videoBuffer = await readFile(videoPath);
    const bunnyFileName = await bunnyService.uploadVideo(videoBuffer, `${videoId}.mp4`);
    const cdnUrl = bunnyService.getStreamUrl(bunnyFileName.videoId);

    // Update database
    await db.update(videos)
      .set({ 
        processingStatus: 'approved',
        videoUrl: cdnUrl,
        bunnyVideoId: bunnyFileName,
        moderationResults: JSON.stringify(moderationResults),
        gcsProcessingUrl: null
      }as Partial<typeof videos.$inferInsert>)
      .where(eq(videos.id, videoId));

    console.log(`Video ${videoId} approved and uploaded to Bunny.net`);
  }

  private async flagVideo(videoId: string, videoPath: string, moderationResults: any, reason: string): Promise<void> {
    console.log(`Flagging video ${videoId}: ${reason}`);
    
    // For now, just mark as flagged in database
    // In production, you might upload to a separate Bunny.net storage zone
    await db.update(videos)
      .set({ 
        processingStatus: 'flagged',
        flaggedReason: reason,
        moderationResults: JSON.stringify(moderationResults),
        gcsProcessingUrl: null,
        isActive: false
      } as Partial<typeof videos.$inferInsert>)
      .where(eq(videos.id, videoId));

    console.log(`Video ${videoId} flagged and marked inactive`);
  }

  private async cleanupGCS(gcsUri: string): Promise<void> {
    try {
      const fileName = gcsUri.replace(`gs://${this.gcsBucket}/`, '');
      await this.storage.bucket(this.gcsBucket).file(fileName).delete();
      console.log(`Cleaned up GCS file: ${fileName}`);
    } catch (error) {
      console.warn('GCS cleanup failed:', error.message);
    }
  }

  private async markVideoAsFailed(videoId: string, error: string): Promise<void> {
    await db.update(videos)
      .set({ 
        processingStatus: 'flagged',
        flaggedReason: `Processing failed: ${error}`,
        gcsProcessingUrl: null,
        isActive: false
      }as Partial<typeof videos.$inferInsert>)
      .where(eq(videos.id, videoId));
  }

  async getVideoStatus(videoId: string): Promise<any> {
    const [video] = await db.select().from(videos).where(eq(videos.id, videoId));
    return video;
  }

   private async deleteFromGcs(fileName: string) {
    await this.storage
      .bucket(this.gcsBucket)
      .file(fileName)
      .delete({ ignoreNotFound: true });
  }
}

export const videoProcessingService = new VideoProcessingService();