import { spawn } from 'child_process';
import { join } from "node:path";
import { readFile, unlink, stat } from 'fs/promises';
import { videos } from '@shared/schema.ts';
import { db } from './db.ts';
import { eq } from 'drizzle-orm';
import { bunnyService } from './bunnyService.ts';
import { Storage } from '@google-cloud/storage';
import { VideoIntelligenceServiceClient, protos  } from '@google-cloud/video-intelligence';
import { audioProcessingService } from './audioProcessingService.ts';


type DBVideoRow    = typeof videos.$inferSelect;
type DBVideoInsert = typeof videos.$inferInsert;
const Feature = protos.google.cloud.videointelligence.v1.Feature; 


interface VideoProcessingJob {
  videoId: string;
  tempFilePath: string;
  originalFilename: string;
  frontendDuration?: number;
  userId: string;
  metadata?: VideoMetadata;
}

export type VideoMetadata = {
  title?: string;
  description?: string;
  category?: string;
  latitude?: string;
  longitude?: string;
  visibility?: string;
  groupId?: string;
  duration?: number | null;
  [k: string]: any;
};


class SimpleVideoProcessor {
  private processingQueue: VideoProcessingJob[] = [];
  private isProcessing = false;

 enqueue(job: VideoProcessingJob) {
    this.processingQueue.push(job);
    if (!this.isProcessing) void this.processQueue();
  }

  constructor() {
    console.log('Simple Video Processor initialized');
  }

  async queueVideoForProcessing(job: VideoProcessingJob): Promise<void> {
    console.log(`Queuing video ${job.videoId} for processing`);
    this.processingQueue.push(job);
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  addToQueue(videoId: string, tempFilePath: string, metadata: any, frontendDuration?: number): void {
    const job: VideoProcessingJob = {
      videoId,
      tempFilePath,
      originalFilename: metadata.title || 'recorded-video',
      frontendDuration,
      userId: '', // Will be set by routes
      metadata: {
        title: metadata.title,
        description: metadata.description,
        category: metadata.category,
        latitude: metadata.latitude?.toString(),
        longitude: metadata.longitude?.toString(),
        visibility: metadata.visibility,
        groupId: metadata.groupId
      }
    };
    
    this.queueVideoForProcessing(job);
  }

  private async processQueue(): Promise<void> {
    if (this.processingQueue.length === 0 || this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    while (this.processingQueue.length > 0) {
      const job = this.processingQueue.shift()!;
      console.log(`Processing video ${job.videoId}: ${job.originalFilename}`);

      try {
        await this.processVideo(job);
        console.log(`Successfully processed video ${job.videoId}`);
      } catch (error) {
        console.error(`Failed to process video ${job.videoId}:`, error);
        await this.markVideoAsFailed(job.videoId, `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        // Clean up temp file after all processing attempts complete
        try { 
          await unlink(job.tempFilePath); 
          console.log(`Cleaned up temp file: ${job.tempFilePath}`);
        } catch (cleanupError) {
          console.log(`Temp file already cleaned up: ${job.tempFilePath}`);
        }
      }
    }

    this.isProcessing = false;
  }

  
  private async processVideo(job: VideoProcessingJob): Promise<void> {
    const { videoId, tempFilePath, metadata } = job;
    
    try {
      console.log(`🔒 SECURITY-FIRST: Starting video ${videoId}: ${job.originalFilename}`);
      console.log(`📁 PROCESSING: Temp file path: ${tempFilePath}`);
      console.log(`📊 PROCESSING: Metadata:`, metadata);
      
      // Check if temp file exists before processing
      try {
        await stat(tempFilePath);
        console.log(`✅ PROCESSING: Temp file exists before processing`);
      } catch (error) {
        console.error(`❌ PROCESSING: Temp file missing before processing: ${tempFilePath}`);
        throw new Error(`Temp file missing: ${tempFilePath}`);
      }
      
      // Import and use the new upload-first processor
      const { uploadFirstProcessor } = await import('./uploadFirstProcessor.ts');
      
      const success = await uploadFirstProcessor.processVideo(videoId, tempFilePath, {
        title: metadata.title,
        description: metadata.description,
        category: metadata.category,
        latitude: metadata.latitude,
        longitude: metadata.longitude,
        visibility: metadata.visibility,
        groupId: metadata.groupId,
        frontendDuration: job.frontendDuration
      }, true); // true = needs preprocessing for WebM
      
      if (!success) {
        console.error(`❌ PROCESSING: Security-first processing returned false for ${videoId}`);
        throw new Error('Video processing failed after security checks');
      }
      
      console.log(`✅ PROCESSING: Video ${videoId} completed successfully`);
      
    } catch (error) {
      console.error(`❌ PROCESSING: Video processing failed for ${videoId}:`, error);
      throw error;
    }
    // Note: Temp file cleanup handled in processQueue after all recovery attempts
  }

  private async preprocessVideo(inputPath: string, videoId: string, duration?: number): Promise<string> {
    console.log(`Starting two-stage FFmpeg preprocessing for ${videoId}`);
    
    // Stage 1: WebM Header Repair (Remuxing)
    const remuxedPath = join('/tmp', `${videoId}_remuxed.webm`);
    await this.stageOneRemuxWebM(inputPath, remuxedPath, videoId);
    
    // Stage 2: Transcode Remuxed WebM to MP4
    const finalPath = join('/tmp', `${videoId}_processed.mp4`);
    await this.stageTwoTranscodeToMP4(remuxedPath, finalPath, videoId, duration);
    
    // Clean up intermediate file
    try {
      await unlink(remuxedPath);
      console.log(`Cleaned up intermediate remuxed file: ${remuxedPath}`);
    } catch (error) {
      console.log(`Note: Could not clean up intermediate file: ${remuxedPath}`);
    }
    
    return finalPath;
  }

  private async stageOneRemuxWebM(inputPath: string, outputPath: string, videoId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`STAGE 1: Aggressive WebM Recovery for ${videoId}`);
      console.log(`Input: ${inputPath} -> Output: ${outputPath}`);
      
      // First attempt: Standard remux
      const standardRemuxArgs = [
        '-hide_banner',
        '-loglevel', 'info',
        '-i', inputPath,
        '-c', 'copy',
        '-avoid_negative_ts', 'make_zero',
        '-f', 'webm',
        '-y',
        outputPath
      ];

      console.log('Attempting standard remux:', 'ffmpeg', standardRemuxArgs.join(' '));
      const ffmpeg = spawn('ffmpeg', standardRemuxArgs);

      let stdout = '';
      let stderr = '';
      
      ffmpeg.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        console.log(`Standard remux exit code: ${code}`);
        console.log('Standard remux stderr:', stderr);
        
        if (code === 0) {
          console.log(`✅ Standard remux successful for ${videoId}`);
          resolve();
        } else {
          console.log(`Standard remux failed, attempting aggressive recovery...`);
          this.attemptAggressiveRecovery(inputPath, outputPath, videoId)
            .then(resolve)
            .catch(reject);
        }
      });

      ffmpeg.on('error', (err) => {
        console.error(`Standard remux process error:`, err);
        this.attemptAggressiveRecovery(inputPath, outputPath, videoId)
          .then(resolve)
          .catch(reject);
      });

      // Timeout for standard remux
      setTimeout(() => {
        ffmpeg.kill('SIGKILL');
        console.log('Standard remux timed out, trying aggressive recovery...');
        this.attemptAggressiveRecovery(inputPath, outputPath, videoId)
          .then(resolve)
          .catch(reject);
      }, 60000); // 1 minute
    });
  }

  private async attemptAggressiveRecovery(inputPath: string, outputPath: string, videoId: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      console.log(`AGGRESSIVE RECOVERY: Forcing raw stream extraction for ${videoId}`);
      console.log(`Input file path: ${inputPath}`);
      
      // Check if input file exists before attempting recovery
      try {
        await stat(inputPath);
        console.log(`✅ Input file exists: ${inputPath}`);
      } catch (error) {
        console.error(`❌ Input file does not exist: ${inputPath}`);
        return reject(new Error(`Input file not found: ${inputPath}`));
      }
      
      // Extremely aggressive approach that forces FFmpeg to ignore header corruption
      const aggressiveArgs = [
        '-hide_banner',
        '-loglevel', 'warning',
        '-f', 'matroska',                    // Force format detection
        '-fflags', '+genpts+igndts+ignidx+discardcorrupt+nobuffer',
        '-analyzeduration', '2147483647',
        '-probesize', '2147483647',
        '-err_detect', 'ignore_err',
        '-i', inputPath,
        '-avoid_negative_ts', 'make_zero',
        '-c:v', 'copy',
        '-c:a', 'copy',
        '-f', 'webm',
        '-y',
        outputPath
      ];

      console.log('Aggressive recovery command:', 'ffmpeg', aggressiveArgs.join(' '));
      const ffmpeg = spawn('ffmpeg', aggressiveArgs);

      let stderr = '';
      
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        console.log(`Aggressive recovery exit code: ${code}`);
        console.log('Aggressive recovery stderr:', stderr);
        
        if (code === 0) {
          console.log(`✅ Aggressive recovery successful for ${videoId}`);
          resolve();
        } else {
          console.error(`❌ All recovery attempts failed for ${videoId}`);
          reject(new Error(`All WebM recovery attempts failed. The browser-generated file may be completely corrupted.`));
        }
      });

      ffmpeg.on('error', (err) => {
        console.error(`Aggressive recovery process error:`, err);
        reject(new Error(`Aggressive recovery failed: ${err.message}`));
      });

      // Timeout for aggressive recovery
      setTimeout(() => {
        ffmpeg.kill('SIGKILL');
        reject(new Error('Aggressive recovery timed out'));
      }, 90000); // 1.5 minutes
    });
  }

  private async stageTwoTranscodeToMP4(inputPath: string, outputPath: string, videoId: string, duration?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`STAGE 2: Transcode Remuxed WebM to MP4 for ${videoId}`);
      console.log(`Input: ${inputPath} -> Output: ${outputPath}`);
      
      const transcodeArgs = [
        '-hide_banner',
        '-loglevel', 'info',
        '-i', inputPath
      ];

      // Add duration override if provided
      if (duration && duration > 0) {
        transcodeArgs.push('-t', duration.toString());
        console.log(`Using frontend duration override: ${duration} seconds`);
      }

      transcodeArgs.push(
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-pix_fmt', 'yuv420p',
        '-profile:v', 'main',
        '-level', '4.0',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', '44100',
        '-ac', '2',
        '-movflags', '+faststart',
        '-f', 'mp4',
        '-y',
        outputPath
      );

      console.log('Stage 2 FFmpeg command:', 'ffmpeg', transcodeArgs.join(' '));
      const ffmpeg = spawn('ffmpeg', transcodeArgs);

      let stdout = '';
      let stderr = '';
      
      ffmpeg.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        console.log(`STAGE 2 FFmpeg exit code: ${code}`);
        console.log('STAGE 2 FFmpeg stderr output:', stderr);
        console.log('STAGE 2 FFmpeg stdout output:', stdout);
        
        if (code === 0) {
          console.log(`✅ Stage 2 (MP4 Transcode) completed successfully for ${videoId}`);
          resolve();
        } else {
          console.error(`❌ Stage 2 (MP4 Transcode) failed for ${videoId} with code ${code}`);
          reject(new Error(`Stage 2 MP4 transcoding failed: ${stderr.slice(0, 300)}`));
        }
      });

      ffmpeg.on('error', (err) => {
        console.error(`❌ Stage 2 FFmpeg process error for ${videoId}:`, err);
        reject(new Error(`Stage 2 FFmpeg process error: ${err.message}`));
      });

      // Timeout for stage 2
      setTimeout(() => {
        ffmpeg.kill('SIGKILL');
        reject(new Error('Stage 2 MP4 transcoding timed out'));
      }, 300000); // 5 minutes
    });
  }

  private async processRawWebM(videoId: string, videoPath: string, metadata: any): Promise<boolean> {
    try {
      console.log(`Processing video file for ${videoId}`);
      
      // STEP 1: Validate file size and detect format
      const stats = await stat(videoPath);
      console.log(`Video file size: ${stats.size} bytes`);
      
      if (stats.size === 0) {
        throw new Error(`Video file is empty (0 bytes): ${videoPath}`);
      }
      
      // Detect file format and choose processing strategy
      const fileFormat = await this.detectVideoFormat(videoPath);
      console.log(`Detected video format: ${fileFormat}`);
      
      // Handle different video formats with ENHANCED AUDIO PROCESSING PIPELINE
      if (fileFormat === 'webm') {
        console.log(`✅ WebM format detected - using ENHANCED pipeline with audio processing`);
        return await this.processWebMWithEnhancedPipeline(videoId, videoPath, metadata);
      } else if (fileFormat === 'mp4') {
        console.log(`✅ MP4 format detected - using ENHANCED pipeline with audio processing`);
        return await this.processMP4WithEnhancedPipeline(videoId, videoPath, metadata);
      } else {
        console.log(`⚠️ Unknown format detected - trying aggressive recovery`);
        return await this.processCorruptedFile(videoId, videoPath, metadata);
      }

    } catch (error) {
      console.error(`Video processing failed for ${videoId}:`, error);
      return false;
    }
  }

  private async detectVideoFormat(videoPath: string): Promise<string> {
    try {
      const buffer = await readFile(videoPath);
      console.log(`🔍 Format detection for ${videoPath}:`);
      console.log(`File size: ${buffer.length} bytes`);
      console.log(`First 16 bytes (hex): ${buffer.slice(0, 16).toString('hex')}`);
      console.log(`First 16 bytes (ascii): ${buffer.slice(0, 16).toString('ascii')}`);
      
      // Check for MP4 file signatures (multiple patterns for different MP4 types)
      if (buffer.length >= 8) {
        const signature = buffer.slice(4, 8).toString('ascii');
        console.log(`MP4 signature check at bytes 4-8: "${signature}"`);
        if (signature === 'ftyp') {
          console.log(`✅ MP4 format detected via ftyp signature`);
          return 'mp4';
        }
      }
      
      // Check for fragmented MP4 (fMP4) signatures - common with MediaRecorder
      // Look for 'styp' (segment type) or 'moof' (movie fragment) boxes
      for (let i = 0; i < Math.min(buffer.length - 8, 64); i += 4) {
        const boxType = buffer.slice(i + 4, i + 8).toString('ascii');
        if (boxType === 'styp' || boxType === 'moof' || boxType === 'mdat') {
          console.log(`✅ Fragmented MP4 format detected via ${boxType} box at offset ${i}`);
          return 'mp4';
        }
      }
      
      // Check for WebM/Matroska signature (EBML header)
      if (buffer.length >= 4) {
        const webmSignature = buffer.slice(0, 4);
        console.log(`WebM signature check: [${webmSignature[0]}, ${webmSignature[1]}, ${webmSignature[2]}, ${webmSignature[3]}]`);
        if (webmSignature[0] === 0x1A && webmSignature[1] === 0x45 && 
            webmSignature[2] === 0xDF && webmSignature[3] === 0xA3) {
          console.log(`✅ WebM format detected via EBML signature`);
          return 'webm';
        }
      }
      
      // Fallback to file extension
      console.log(`Checking filename extension for: ${videoPath}`);
      if (videoPath.toLowerCase().includes('.mp4')) {
        console.log(`📁 MP4 format detected via filename extension`);
        return 'mp4';
      } else if (videoPath.toLowerCase().includes('.webm')) {
        console.log(`📁 WebM format detected via filename extension`);
        return 'webm';
      }
      
      console.log(`❌ Unknown format - no signature or extension match`);
      return 'unknown';
    } catch (error) {
      console.error('Error detecting video format:', error);
      return 'unknown';
    }
  }

  private async validateMP4File(buffer: Buffer, videoId: string): Promise<boolean> {
    try {
      console.log(`🔍 MP4 validation for ${videoId}: ${buffer.length} bytes`);
      
      if (buffer.length < 32) {
        console.log(`❌ File too small: ${buffer.length} bytes`);
        return false;
      }
      
      // Check for essential MP4 structure
      let foundFtyp = false;
      let foundMdat = false;
      let foundMoov = false;
      
      // Scan first 1KB for required boxes
      for (let i = 0; i < Math.min(buffer.length - 8, 1024); i += 4) {
        const boxType = buffer.slice(i + 4, i + 8).toString('ascii');
        
        if (boxType === 'ftyp') {
          foundFtyp = true;
          console.log(`✓ Found ftyp box at offset ${i}`);
        } else if (boxType === 'mdat') {
          foundMdat = true;
          console.log(`✓ Found mdat box at offset ${i}`);
        } else if (boxType === 'moov') {
          foundMoov = true;
          console.log(`✓ Found moov box at offset ${i}`);
        } else if (boxType === 'styp' || boxType === 'moof') {
          // Fragmented MP4 indicators
          console.log(`✓ Found fragmented MP4 indicator: ${boxType} at offset ${i}`);
          foundMoov = true; // fMP4 doesn't need moov box
        }
      }
      
      // For fragmented MP4, we need either ftyp+mdat or styp+moof
      const isValidMP4 = foundFtyp && (foundMdat || foundMoov);
      const isValidFragmentedMP4 = foundMdat && (foundFtyp || foundMoov);
      
      const isValid = isValidMP4 || isValidFragmentedMP4;
      
      if (isValid) {
        console.log(`✅ MP4 validation passed for ${videoId}`);
      } else {
        console.log(`❌ MP4 validation failed for ${videoId}: ftyp=${foundFtyp}, mdat=${foundMdat}, moov=${foundMoov}`);
      }
      
      return isValid;
      
    } catch (error) {
      console.error(`MP4 validation error for ${videoId}:`, error);
      return false;
    }
  }

  private async repairFragmentedMP4(inputPath: string, videoId: string, duration?: number): Promise<string | null> {
    return new Promise((resolve, reject) => {
      console.log(`🔧 Repairing fragmented MP4 for ${videoId}`);
      
      const outputPath = join('/tmp', `${videoId}_repaired.mp4`);
      
      const repairArgs = [
        '-hide_banner',
        '-loglevel', 'info',
        '-i', inputPath
      ];

      // Add duration override if provided
      if (duration && duration > 0) {
        repairArgs.push('-t', duration.toString());
        console.log(`Using frontend duration override: ${duration} seconds`);
      }

      repairArgs.push(
        // Force proper MP4 structure with moov atom at beginning
        '-c:v', 'copy',
        '-c:a', 'copy',
        '-movflags', '+faststart',  // Move moov atom to beginning
        '-avoid_negative_ts', 'make_zero',
        '-fflags', '+genpts',
        '-y',
        outputPath
      );

      console.log('MP4 repair command:', 'ffmpeg', repairArgs.join(' '));
      const ffmpeg = spawn('ffmpeg', repairArgs);

      let stdout = '';
      let stderr = '';
      
      ffmpeg.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        console.log(`MP4 repair exit code: ${code}`);
        console.log('MP4 repair stderr:', stderr);
        
        if (code === 0) {
          console.log(`✅ MP4 repair successful for ${videoId}`);
          resolve(outputPath);
        } else {
          console.error(`❌ MP4 repair failed for ${videoId} with code ${code}`);
          resolve(null);
        }
      });

      ffmpeg.on('error', (err) => {
        console.error(`MP4 repair process error for ${videoId}:`, err);
        resolve(null);
      });

      // Timeout for repair
      setTimeout(() => {
        ffmpeg.kill('SIGKILL');
        console.error(`MP4 repair timed out for ${videoId}`);
        resolve(null);
      }, 60000); // 1 minute
    });
  }

  private async processCorruptedFile(videoId: string, videoPath: string, metadata: any): Promise<boolean> {
    try {
      console.log(`🚨 Processing corrupted/unknown file for ${videoId} using aggressive recovery`);
      
      const outputPath = join('/tmp', `${videoId}_recovered.mp4`);
      
      // Ultra-aggressive FFmpeg recovery for corrupted browser output
      const recoveryArgs = [
        '-hide_banner',
        '-loglevel', 'warning',
        '-err_detect', 'ignore_err',
        '-fflags', '+genpts+igndts+ignidx+discardcorrupt+nobuffer',
        '-analyzeduration', '2147483647',
        '-probesize', '2147483647',
        '-i', videoPath
      ];

      // Add duration override if provided
      if (metadata.frontendDuration && metadata.frontendDuration > 0) {
        recoveryArgs.push('-t', metadata.frontendDuration.toString());
        console.log(`Using frontend duration: ${metadata.frontendDuration} seconds`);
      }

      recoveryArgs.push(
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-avoid_negative_ts', 'make_zero',
        '-f', 'mp4',
        '-y',
        outputPath
      );

      console.log('Aggressive recovery command:', 'ffmpeg', recoveryArgs.join(' '));
      
      const success = await new Promise<boolean>((resolve) => {
        const ffmpeg = spawn('ffmpeg', recoveryArgs);
        
        let stderr = '';
        ffmpeg.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        ffmpeg.on('close', (code) => {
          console.log(`Aggressive recovery exit code: ${code}`);
          if (stderr) {
            console.log('Recovery stderr:', stderr.substring(0, 500));
          }
          resolve(code === 0);
        });

        ffmpeg.on('error', (err) => {
          console.error(`Recovery process error:`, err);
          resolve(false);
        });

        // 2 minute timeout for recovery
        setTimeout(() => {
          ffmpeg.kill('SIGKILL');
          console.error(`Recovery timed out for ${videoId}`);
          resolve(false);
        }, 120000);
      });

      if (!success) {
        throw new Error('Aggressive file recovery failed');
      }

      console.log(`✅ File recovery successful for ${videoId}`);
      
      // Upload recovered file to Bunny.net
      const recoveredBuffer = await readFile(outputPath);
      const bunnyVideoId = await bunnyService.uploadVideo(recoveredBuffer, `${videoId}.mp4`);
      const cdnUrl = bunnyService.getStreamUrl(bunnyVideoId.videoId);
      console.log(`✅ Recovered file uploaded to Bunny.net: ${bunnyVideoId}`);
      
      // Clean up recovered file
      try { await unlink(outputPath); } catch {}
      
      // Continue with rest of processing
      const gcsUri = await this.uploadToGCS(videoId, videoPath);
      await db.update(videos).set({ 
        processingStatus: 'processing',
        bunnyVideoId: bunnyVideoId,
        gcsProcessingUrl: gcsUri,
        videoUrl: cdnUrl,
        title: metadata.title,
        description: metadata.description,
        category: metadata.category,
        latitude: metadata.latitude,
        longitude: metadata.longitude,
        visibility: metadata.visibility,
        groupId: metadata.groupId,
        isActive: false
      }as Partial<DBVideoInsert>).where(eq(videos.id, videoId));
      
      this.pollBunnyNetAndModerate(videoId, bunnyVideoId.thumbnailUrl, gcsUri, cdnUrl).catch((error) => {
        this.markVideoAsFailed(videoId, `Processing failed: ${error.message}`);
      });
      
      return true;
      
    } catch (error) {
      console.error(`❌ Corrupted file processing failed for ${videoId}:`, error);
      throw error;
    }
  }

  private async processMP4Direct(videoId: string, videoPath: string, metadata: any): Promise<boolean> {
    try {
      console.log(`🎯 Direct MP4 processing for ${videoId} (bypassing WebM issues)`);
      
      // STEP 1: Validate MP4 file integrity before upload
      console.log(`Validating MP4 file integrity for ${videoId}`);
      const videoBuffer = await readFile(videoPath);
      const isValidMP4 = await this.validateMP4File(videoBuffer, videoId);
      
      if (!isValidMP4) {
        console.log(`❌ MP4 validation failed, attempting repair for ${videoId}`);
        // Try to repair fragmented MP4 structure
        const repairedPath = await this.repairFragmentedMP4(videoPath, videoId, metadata.frontendDuration);
        
        if (repairedPath) {
          console.log(`✅ MP4 repair successful, using repaired file for ${videoId}`);
          const repairedBuffer = await readFile(repairedPath);
          const bunnyVideoId = await bunnyService.uploadVideo(repairedBuffer, `${videoId}.mp4`);
          const cdnUrl = bunnyService.getStreamUrl(bunnyVideoId.videoId);
          console.log(`✅ Repaired MP4 uploaded to Bunny.net: ${bunnyVideoId}`);
          
          // Clean up repaired file
          try { await unlink(repairedPath); } catch {}
          
          // Continue with rest of processing
          const gcsUri = await this.uploadToGCS(videoId, videoPath);
          await db.update(videos).set({ 
            processingStatus: 'processing',
            bunnyVideoId: bunnyVideoId,
            gcsProcessingUrl: gcsUri,
            videoUrl: cdnUrl,
            title: metadata.title,
            description: metadata.description,
            category: metadata.category,
            latitude: metadata.latitude,
            longitude: metadata.longitude,
            visibility: metadata.visibility,
            groupId: metadata.groupId,
            isActive: false
          } as Partial<DBVideoInsert>).where(eq(videos.id, videoId));
          
          this.pollBunnyNetAndModerate(videoId, bunnyVideoId.videoId, gcsUri, cdnUrl).catch((error) => {
            this.markVideoAsFailed(videoId, `Processing failed: ${error.message}`);
          });
          
          return true;
        } else {
          throw new Error('MP4 repair failed - file structure is too corrupted');
        }
      }
      
      // STEP 2: Upload validated MP4 directly to Bunny.net
      console.log(`Uploading validated MP4 directly to Bunny.net for ${videoId}`);
      const bunnyVideoId = await bunnyService.uploadVideo(videoBuffer, `${videoId}.mp4`);
      const cdnUrl = bunnyService.getStreamUrl(bunnyVideoId.videoId);
      console.log(`✅ MP4 uploaded to Bunny.net: ${bunnyVideoId}`);
      
      // STEP 2: Upload to Google Cloud Storage for moderation
      console.log(`Uploading MP4 to Google Cloud Storage for moderation analysis`);
      const gcsUri = await this.uploadToGCS(videoId, videoPath);
      console.log(`✅ GCS upload successful: ${gcsUri}`);

      // STEP 3: Update database with processing status
      await db.update(videos)
        .set({ 
          processingStatus: 'processing',
          bunnyVideoId: bunnyVideoId,
          gcsProcessingUrl: gcsUri,
          videoUrl: cdnUrl,
          title: metadata.title,
          description: metadata.description,
          category: metadata.category,
          latitude: metadata.latitude,
          longitude: metadata.longitude,
          visibility: metadata.visibility,
          groupId: metadata.groupId,
          isActive: false
        } as Partial<DBVideoInsert>)
        .where(eq(videos.id, videoId));

      // STEP 4: Start processing pipeline
      console.log(`Starting processing pipeline for MP4 ${videoId}`);
      this.pollBunnyNetAndModerate(videoId, bunnyVideoId.videoId, gcsUri, cdnUrl).catch((error) => {
        console.error(`Processing pipeline failed for ${videoId}:`, error);
        this.markVideoAsFailed(videoId, `Processing failed: ${error.message}`);
      });

      console.log(`✅ MP4 ${videoId} processing initiated successfully`);
      return true;

    } catch (error) {
      console.error(`❌ MP4 direct processing failed for ${videoId}:`, error);
      return false;
    }
  }

  private async processWebMWithEnhancedPipeline(videoId: string, videoPath: string, metadata: any): Promise<boolean> {
    try {
      console.log(`🚀 ENHANCED PIPELINE: Starting WebM processing with audio analysis for ${videoId}`);
      
      // Step 1: Preprocess video
      const processedVideoPath = await this.preprocessVideo(videoPath, videoId, metadata.frontendDuration);
      console.log(`✅ Video preprocessing completed: ${processedVideoPath}`);
      
      // Step 2: Upload to Bunny.net for CDN streaming
      const videoBuffer = await readFile(processedVideoPath);
      const bunnyVideoId = await bunnyService.uploadVideo(videoBuffer, `${videoId}.mp4`);
      const cdnUrl = bunnyService.getStreamUrl(bunnyVideoId.videoId);
      console.log(`✅ Bunny.net upload completed: ${bunnyVideoId}`);
      
      // Step 3: Generate thumbnail automatically
      const thumbnailUrl = await this.generateVideoThumbnail(videoId);
      console.log(`✅ Automatic thumbnail generation completed for ${videoId}`);
      
      // Step 4: Upload to GCS for moderation analysis
      const gcsUri = await this.uploadToGCS(videoId, videoPath);
      console.log(`✅ GCS upload completed: ${gcsUri}`);
      
      // Step 5: Update database with processing status and thumbnail
      await db.update(videos)
        .set({ 
          processingStatus: 'processing',
          bunnyVideoId: bunnyVideoId,
          gcsProcessingUrl: gcsUri,
          videoUrl: cdnUrl,
          thumbnailUrl: thumbnailUrl,
          title: metadata.title,
          description: metadata.description,
          category: metadata.category,
          latitude: metadata.latitude,
          longitude: metadata.longitude,
          visibility: metadata.visibility,
          groupId: metadata.groupId,
          isActive: false // Will be activated only after both moderations pass
        } as Partial<DBVideoInsert>)
        .where(eq(videos.id, videoId));
      
      // Step 6: Start enhanced processing pipeline with concurrent audio and video moderation
      console.log(`🔄 Starting enhanced moderation pipeline for ${videoId}`);
      this.pollBunnyNetAndModerate(videoId, bunnyVideoId.videoId, gcsUri, cdnUrl).catch((error) => {
        console.error(`Enhanced processing pipeline failed for ${videoId}:`, error);
        this.markVideoAsFailed(videoId, `Enhanced pipeline failed: ${error.message}`);
      });
      
      console.log(`✅ Enhanced pipeline initiated successfully for ${videoId}`);
      return true;
      
    } catch (error) {
      console.error(`Enhanced WebM processing failed for ${videoId}:`, error);
      throw error;
    }
  }

  private async processMP4WithEnhancedPipeline(videoId: string, videoPath: string, metadata: any): Promise<boolean> {
    try {
      console.log(`🚀 ENHANCED PIPELINE: Starting MP4 processing with audio analysis for ${videoId}`);
      
      // Step 1: Upload to Bunny.net for CDN streaming
      const videoBuffer = await readFile(videoPath);
      const bunnyVideoId = await bunnyService.uploadVideo(videoBuffer, `${videoId}.mp4`);
      const cdnUrl = bunnyService.getStreamUrl(bunnyVideoId.videoId);
      console.log(`✅ Bunny.net upload completed: ${bunnyVideoId}`);
      
      // Step 2: Generate thumbnail automatically
      const thumbnailUrl = await this.generateVideoThumbnail(videoId);
      console.log(`✅ Automatic thumbnail generation completed for ${videoId}`);
      
      // Step 3: Upload to GCS for moderation analysis
      const gcsUri = await this.uploadToGCS(videoId, videoPath);
      console.log(`✅ GCS upload completed: ${gcsUri}`);
      
      // Step 4: Update database with processing status and thumbnail
      await db.update(videos)
        .set({ 
          processingStatus: 'processing',
          bunnyVideoId: bunnyVideoId,
          gcsProcessingUrl: gcsUri,
          videoUrl: cdnUrl,
          thumbnailUrl: thumbnailUrl,
          title: metadata.title,
          description: metadata.description,
          category: metadata.category,
          latitude: metadata.latitude,
          longitude: metadata.longitude,
          visibility: metadata.visibility,
          groupId: metadata.groupId,
          isActive: false // Will be activated only after both moderations pass
        } as Partial<DBVideoInsert>)
        .where(eq(videos.id, videoId));
      
      // Step 5: Start enhanced processing pipeline with concurrent audio and video moderation
      console.log(`🔄 Starting enhanced moderation pipeline for ${videoId}`);
      this.pollBunnyNetAndModerate(videoId, bunnyVideoId.videoId, gcsUri, cdnUrl).catch((error) => {
        console.error(`Enhanced processing pipeline failed for ${videoId}:`, error);
        this.markVideoAsFailed(videoId, `Enhanced pipeline failed: ${error.message}`);
      });
      
      console.log(`✅ Enhanced pipeline initiated successfully for ${videoId}`);
      return true;
      
    } catch (error) {
      console.error(`Enhanced MP4 processing failed for ${videoId}:`, error);
      throw error;
    }
  }

  private async processWebMWithPreprocessing(videoId: string, videoPath: string, metadata: any): Promise<boolean> {
    try {
      console.log(`🔧 STRICT SEQUENTIAL PIPELINE: Starting for ${videoId}`);
      console.log(`📋 PIPELINE: Task A (Preprocessing) + Task B (Moderation) → THEN Bunny.net upload`);
      
      // TASK A: Server-Side Preprocessing (REQUIRED)
      console.log(`🔄 TASK A: Starting server-side preprocessing for ${videoId}`);
      const processedVideoPath = await this.preprocessVideo(videoPath, videoId, metadata.frontendDuration);
      console.log(`✅ TASK A: Preprocessing completed successfully: ${processedVideoPath}`);
      
      // TASK B: Google Cloud Video AI Moderation (REQUIRED)
      console.log(`🔄 TASK B: Starting Google Cloud Video AI moderation for ${videoId}`);
      console.log(`📤 TASK B: Uploading raw video to GCS for moderation analysis`);
      const gcsUri = await this.uploadToGCS(videoId, videoPath);
      console.log(`✅ TASK B: GCS upload successful: ${gcsUri}`);
      
      console.log(`🔍 TASK B: Running Google Cloud Video AI analysis (AWAITING RESULTS)`);
      const moderationApproved = await this.runVideoModeration(gcsUri, videoId);
      console.log(`✅ TASK B: Moderation analysis completed - Result: ${moderationApproved ? 'APPROVED' : 'REJECTED'}`);
      
      // CONDITIONAL BUNNY.NET UPLOAD: Only if BOTH Task A & Task B succeed
      if (moderationApproved) {
        console.log(`✅ CONDITIONAL CHECK: Both preprocessing AND moderation succeeded`);
        console.log(`📤 BUNNY.NET UPLOAD: Uploading approved, preprocessed MP4 to Bunny.net`);
        
        const videoBuffer = await readFile(processedVideoPath);
        const bunnyVideoId = await bunnyService.uploadVideo(videoBuffer, `${videoId}.mp4`);
        const cdnUrl = bunnyService.getStreamUrl(bunnyVideoId.videoId);
        console.log(`✅ BUNNY.NET UPLOAD: Successful upload: ${bunnyVideoId}`);
        console.log(`🔗 BUNNY.NET CDN URL: ${cdnUrl}`);
        
        // Update database with approved status
        await db.update(videos)
          .set({ 
            processingStatus: 'approved',
            bunnyVideoId: bunnyVideoId,
            gcsProcessingUrl: gcsUri,
            videoUrl: cdnUrl,
            title: metadata.title,
            description: metadata.description,
            category: metadata.category,
            latitude: metadata.latitude,
            longitude: metadata.longitude,
            visibility: metadata.visibility,
            groupId: metadata.groupId,
            isActive: true,
            moderationResults: JSON.stringify({ 
              approved: true, 
              pipeline: 'complete'
            })
          }as Partial<DBVideoInsert>)
          .where(eq(videos.id, videoId));
          
        console.log(`✅ DATABASE: Video ${videoId} marked as APPROVED and PUBLISHED`);
        
      } else {
        console.log(`❌ CONDITIONAL CHECK: Moderation REJECTED - Bunny.net upload BLOCKED`);
        
        // Update database with rejected status
        await db.update(videos)
          .set({ 
            processingStatus: 'rejected_by_moderation',
            gcsProcessingUrl: gcsUri,
            title: metadata.title,
            description: metadata.description,
            category: metadata.category,
            latitude: metadata.latitude,
            longitude: metadata.longitude,
            visibility: metadata.visibility,
            groupId: metadata.groupId,
            isActive: false,
            moderationResults: JSON.stringify({ 
              approved: false, 
              pipeline: 'complete'
            })
          } as Partial<DBVideoInsert>)
          .where(eq(videos.id, videoId));
          
        console.log(`✅ DATABASE: Video ${videoId} marked as REJECTED_BY_MODERATION`);
      }
      
      // CLEANUP: Remove all temporary files
      try {
        await unlink(processedVideoPath);
        console.log(`🧹 CLEANUP: Removed processed MP4 file`);
      } catch (error) {
        console.log(`🧹 CLEANUP: Could not remove processed file (may already be cleaned)`);
      }

      console.log(`✅ PIPELINE COMPLETE: ${videoId} - Final status: ${moderationApproved ? 'PUBLISHED' : 'REJECTED'}`);
      return true;

    } catch (error) {
      console.error(`❌ PIPELINE FAILED: ${videoId} - Error: ${error}`);
      await this.markVideoAsFailed(videoId, `Pipeline failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  private async pollBunnyNetAndModerate(videoId: string, bunnyVideoId: string, gcsUri: string, cdnUrl: string): Promise<void> {
    try {
      console.log(`🚀 ENHANCED PIPELINE: Starting comprehensive processing for ${videoId}`);
      console.log(`📋 PIPELINE: 1) Bunny.net transcoding, 2) Video AI moderation, 3) Audio processing & moderation`);
      
      // Step 1: Poll Bunny.net until video is ready
      console.log(`📤 Step 1/3: Polling Bunny.net until transcoding complete for ${bunnyVideoId}`);
      const bunnyReady = await this.pollBunnyNetStatus(bunnyVideoId);
      
      // Steps 2 & 3: Run Video AI moderation AND audio processing concurrently
      console.log(`🔄 Steps 2&3: Running Video AI moderation AND audio processing concurrently for ${videoId}`);
      
      const [moderationApproved, audioResult] = await Promise.all([
        this.runVideoModeration(gcsUri, videoId),
        this.runAudioProcessing(videoId, gcsUri)
      ]);
      
      console.log(`✓ Google Cloud Video AI analysis completed: ${moderationApproved ? 'APPROVED' : 'FLAGGED'}`);
      console.log(`✓ Google Cloud Speech-to-Text analysis completed: ${audioResult.moderationStatus.toUpperCase()}`);
      
      // Step 4: Improved conditional publishing logic - Video must pass, audio errors don't auto-reject
      const videoPassedModeration = moderationApproved;
      const audioContentViolation = audioResult.moderationStatus === 'failed' && 
        audioResult.flagReason && 
        !audioResult.flagReason.includes('processing failed') && 
        !audioResult.flagReason.includes('technical issues') &&
        !audioResult.flagReason.includes('service unavailable');
      
      const bothModerationsPassed = videoPassedModeration && !audioContentViolation;
      
      if (bothModerationsPassed) {
        const updateData: any = {
          processingStatus: bunnyReady ? 'approved' : 'bunny_failed',
          moderationResults: JSON.stringify({ 
            approved: true, 
            timestamp: new Date().toISOString(),
            bunnyStatus: bunnyReady ? 'ready' : 'failed',
            moderationStatus: 'approved',
            audioModerationStatus: audioResult.moderationStatus,
            pipeline: 'enhanced_complete'
          }),
          bunnyVideoId: bunnyVideoId,
          transcriptionText: audioResult.transcription,
          audioModerationStatus: audioResult.moderationStatus,
          audioFlagReason: audioResult.flagReason,
          extractedKeywords: JSON.stringify(audioResult.extractedKeywords)
        };

        // Generate thumbnail from video with extended wait and retry
        let thumbnailUrl = null;
        try {
          // Wait longer for Bunny.net to generate thumbnails
          console.log(`Waiting for Bunny.net thumbnail generation for ${videoId}...`);
          await new Promise(resolve => setTimeout(resolve, 15000));
          
          // Try multiple times to get the real thumbnail
          for (let attempt = 1; attempt <= 3; attempt++) {
            console.log(`Thumbnail generation attempt ${attempt}/3 for ${videoId}`);
            thumbnailUrl = await this.generateVideoThumbnail(videoId);
            
            if (thumbnailUrl && !thumbnailUrl.includes('data:image/svg+xml')) {
              console.log(`✅ Real thumbnail generated for ${videoId} on attempt ${attempt}`);
              break;
            } else if (attempt < 3) {
              console.log(`Attempt ${attempt} returned SVG fallback, retrying in 10 seconds...`);
              await new Promise(resolve => setTimeout(resolve, 10000));
            } else {
              console.log(`All attempts failed, using SVG fallback for ${videoId}`);
            }
          }
        } catch (thumbnailError) {
          console.error(`⚠️ Thumbnail generation failed for ${videoId}:`, thumbnailError);
        }

        // Only activate and set CDN URL if Bunny.net succeeded
        if (bunnyReady) {
          updateData.videoUrl = cdnUrl;
          updateData.isActive = true;
          updateData.thumbnailUrl = thumbnailUrl;
          console.log(`✓ Video ${videoId} APPROVED - CDN streaming enabled`);
        } else {
          updateData.isActive = false;
          updateData.thumbnailUrl = thumbnailUrl;
          console.log(`⚠️ Video ${videoId} moderation passed but CDN failed - stored for fallback`);
        }

        await db.update(videos)
          .set(updateData)
          .where(eq(videos.id, videoId));
      } else {
        // Determine specific failure reason
        let flagReason = '';
        if (!moderationApproved && audioContentViolation) {
          flagReason = `Video content flagged by Google Cloud Video AI and audio content flagged: ${audioResult.flagReason}`;
        } else if (!moderationApproved) {
          flagReason = 'Explicit content detected by Google Cloud Video AI';
        } else if (audioContentViolation) {
          flagReason = `Audio content flagged: ${audioResult.flagReason}`;
        } else {
          // This shouldn't happen with the new logic, but just in case
          flagReason = 'Content moderation failed';
        }
        
        // Log audio technical issues separately (don't flag the video for these)
        if (audioResult.moderationStatus === 'failed' && !audioContentViolation) {
          console.warn(`Video ${videoId} had audio processing issues but passed video moderation: ${audioResult.flagReason}`);
        }

        // Upload flagged video to moderation zone for review
        let bunnyReviewVideoId = null;
        try {
          console.log(`Uploading flagged video ${videoId} to moderation zone`);
          // Download video from GCS first  
          const videoBuffer = await this.downloadVideoFromGCS(gcsUri);
          bunnyReviewVideoId = await bunnyService.uploadVideoForReview(videoBuffer, videoId);
          console.log(`Flagged video uploaded to moderation zone: ${bunnyReviewVideoId}`);
        } catch (bunnyError) {
          console.error(`Failed to upload flagged video ${videoId} to moderation zone:`, bunnyError);
          // Continue with flagging even if moderation zone upload fails
        }

        await db.update(videos)
          .set({ 
            processingStatus: 'flagged',
            flaggedReason: flagReason,
            bunnyReviewVideoId: bunnyReviewVideoId,
            moderationResults: JSON.stringify({ 
              approved: false, 
              timestamp: new Date().toISOString(),
              bunnyStatus: bunnyReady ? 'ready' : 'failed',
              moderationStatus: moderationApproved ? 'approved' : 'flagged',
              audioModerationStatus: audioResult.moderationStatus,
              bunnyReviewStatus: bunnyReviewVideoId ? 'uploaded' : 'failed',
              pipeline: 'enhanced_complete'
            }),
            transcriptionText: audioResult.transcription,
            audioModerationStatus: audioResult.moderationStatus,
            audioFlagReason: audioResult.flagReason,
            extractedKeywords: JSON.stringify(audioResult.extractedKeywords),
            isActive: false
          } as Partial<DBVideoInsert>)
          .where(eq(videos.id, videoId));
          
        console.log(`✗ Video ${videoId} FLAGGED - ${flagReason}`);
      }
      
    } catch (error) {
      console.error(`Comprehensive processing pipeline failed for ${videoId}:`, error);
      this.markVideoAsFailed(videoId, `Pipeline error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async pollBunnyNetStatus(bunnyVideoId: string): Promise<boolean> {
    const maxAttempts = 60;
    const pollInterval = 10000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`Polling Bunny.net status for ${bunnyVideoId} (attempt ${attempt}/${maxAttempts})`);
        
        const response = await fetch(`https://video.bunnycdn.com/library/450591/videos/${bunnyVideoId}`, {
          headers: {
            'AccessKey': process.env.BUNNY_API_KEY!
          }
        });

        if (!response.ok) {
          console.error(`Bunny.net API error: ${response.status} ${response.statusText}`);
          continue;
        }

        const videoData = await response.json();
        console.log(`Bunny.net video ${bunnyVideoId} status:`, { 
          status: videoData.status, 
          encodeProgress: videoData.encodeProgress, 
          length: videoData.length 
        });

        if ((videoData.status === 2 && videoData.encodeProgress === 100) || 
            (videoData.status === 4 && videoData.encodeProgress === 100)) {
          console.log(`✅ Bunny.net video ${bunnyVideoId} is ready`);
          return true;
        } else if (videoData.status === 5) {
          console.error(`Bunny.net video ${bunnyVideoId} failed with status 5`);
          console.error('Bunny.net error details:', {
            status: videoData.status,
            encodeProgress: videoData.encodeProgress,
            length: videoData.length,
            title: videoData.title,
            transcodingMessages: videoData.transcodingMessages
          });
          return false;
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        console.error(`Error polling Bunny.net status for ${bunnyVideoId}:`, error);
      }
    }

    console.error(`Bunny.net polling timed out for ${bunnyVideoId} after ${maxAttempts} attempts`);
    return false;
  }

  private async runAudioProcessing(videoId: string, gcsUri: string): Promise<any> {
    try {
      console.log(`🎵 AUDIO: Starting audio processing workflow for ${videoId}`);
      
      // Extract the video file path from GCS URI for local audio processing
      // We need to download the video file temporarily for FFmpeg audio extraction
      const tempVideoPath = await this.downloadVideoFromGCS(gcsUri);
      
      // Run audio processing service
      const audioResult = await audioProcessingService.processAudio(videoId, gcsUri);
      
      // Clean up temporary video file
      try {
        await unlink(tempVideoPath);
        console.log(`🎵 AUDIO: Cleaned up temp video file: ${tempVideoPath}`);
      } catch (cleanupError) {
        console.warn(`🎵 AUDIO: Failed to cleanup temp video file:`, cleanupError);
      }
      
      return audioResult;
    } catch (error) {
      console.error(`🎵 AUDIO: Processing failed for ${videoId}:`, error);
      return {
        success: false,
        moderationStatus: 'error',
        extractedKeywords: [],
        error: error instanceof Error ? error.message : 'Unknown audio processing error'
      };
    }
  }

  private async downloadVideoForAudio(gcsUri: string, videoId: string): Promise<string> {
    try {
      const serviceAccountKey = process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY!;
      const credentials = JSON.parse(serviceAccountKey);
      
      const storage = new Storage({
        credentials: credentials,
        projectId: credentials.project_id
      });

      const bucketName = gcsUri.split('/')[2];
      const fileName = gcsUri.split('/').slice(3).join('/');
      
      const tempVideoPath = join('/tmp', `${videoId}_for_audio.mp4`);
      
      console.log(`Audio processing: Downloading ${fileName} from ${bucketName} for audio extraction`);
      
      await storage
        .bucket(bucketName)
        .file(fileName)
        .download({ destination: tempVideoPath });
      
      console.log(`Audio processing: Video downloaded to ${tempVideoPath}`);
      return tempVideoPath;
    } catch (error) {
      console.error(`Audio processing: Failed to download video from GCS:`, error);
      throw error;
    }
  }

  private async runVideoModeration(gcsUri: string, videoId: string): Promise<boolean> {
    try {
      console.log(`Starting Google Cloud Video AI analysis for: ${gcsUri}`);
      
      const serviceAccountKey = process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY!;
      const credentials = JSON.parse(serviceAccountKey);
      
      const client = new VideoIntelligenceServiceClient({
        credentials: credentials,
        projectId: credentials.project_id
      });

      const request = {
        inputUri: gcsUri,
        features: ['EXPLICIT_CONTENT_DETECTION' as any],
        videoContext: {
          explicitContentDetectionConfig: {}
        }
      };

      const [operation] = await client.annotateVideo(request);

      console.log(`Video AI operation started: ${operation.name}`);
      const [result] = await operation.promise();
      
      if (result.annotationResults && result.annotationResults[0] && 
          result.annotationResults[0].explicitAnnotation) {
        const explicitAnnotation = result.annotationResults[0].explicitAnnotation;
        const frames = explicitAnnotation.frames || [];
        
        // More reasonable thresholds to prevent false positives
        let veryLikelyFrames = 0;
        let likelyFrames = 0;
        
        for (const frame of frames) {
          if (frame.pornographyLikelihood === 'VERY_LIKELY') {
            veryLikelyFrames++;
          } else if (frame.pornographyLikelihood === 'LIKELY') {
            likelyFrames++;
          }
        }
        
        const totalFrames = frames.length;
        console.log(`Video moderation analysis: ${veryLikelyFrames} very likely, ${likelyFrames} likely out of ${totalFrames} total frames`);
        
        // Only flag if we have strong evidence of inappropriate content:
        // - 3+ frames marked as VERY_LIKELY, OR
        // - More than 30% of frames marked as LIKELY/VERY_LIKELY (for short videos with few frames)
        const hasSignificantInappropriateContent = (
          veryLikelyFrames >= 3 || 
          (totalFrames > 0 && (veryLikelyFrames + likelyFrames) / totalFrames > 0.3)
        );
        
        if (hasSignificantInappropriateContent) {
          console.log(`Video flagged for explicit content: ${veryLikelyFrames} very likely, ${likelyFrames} likely frames (${totalFrames} total)`);
          return false;
        } else {
          console.log(`Video approved - insufficient evidence of explicit content (${veryLikelyFrames} very likely, ${likelyFrames} likely out of ${totalFrames} frames)`);
          return true;
        }
      }
      
    } catch (error) {
      console.error(`Video AI analysis failed:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.markVideoAsFailed(videoId, `Moderation analysis failed: ${errorMessage}`);
      return false;
    }
    
    return true;
  }

  private async uploadToGCS(videoId: string, videoPath: string): Promise<string> {
    try {
      const serviceAccountKey = process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY!;
      const credentials = JSON.parse(serviceAccountKey);
      
      console.log(`Google Cloud key length: ${serviceAccountKey.length} characters`);
      console.log(`Google Cloud key starts with: ${serviceAccountKey.substring(0, 50)}...`);
      console.log(`Google Cloud key ends with: ...${serviceAccountKey.substring(serviceAccountKey.length - 50)}`);
      console.log(`Successfully parsed Google Cloud credentials for project: ${credentials.project_id}`);
      
      const projectId = credentials.project_id;
      console.log(`Using project ID from credentials: ${projectId} (overriding env var)`);
      
      const storage = new Storage({
        credentials: credentials,
        projectId: projectId
      });
      
      const bucketName = `jemzy-video-moderation-${projectId}`;
      const bucket = storage.bucket(bucketName);
      
      try {
        await bucket.getMetadata();
        console.log(`Google Cloud Storage bucket ${bucketName} exists`);
      } catch (error) {
        console.log(`Creating Google Cloud Storage bucket: ${bucketName}`);
        await storage.createBucket(bucketName, {
          location: 'US',
        });
      }
      
      const fileName = `raw-videos/${videoId}.webm`;
      const file = bucket.file(fileName);
      
      const videoBuffer = await readFile(videoPath);
      await file.save(videoBuffer, {
        metadata: {
          contentType: 'video/webm',
        },
      });
      
      const gcsUri = `gs://${bucketName}/${fileName}`;
      console.log(`Raw WebM uploaded to GCS: ${gcsUri}`);
      
      return gcsUri;
    } catch (error) {
      console.error('Error uploading to Google Cloud Storage:', error);
      throw error;
    }
  }

  async generateVideoThumbnail(videoId: string): Promise<string | null> {
    try {
      // Get video information from database
      const [video] = await db.select().from(videos).where(eq(videos.id, videoId));
      if (!video || !video.videoUrl) {
        throw new Error('Video not found or missing URL');
      }

      // Extract Bunny video ID from the proxy URL
      const bunnyVideoIdMatch = video.videoUrl.match(/\/api\/videos\/bunny-proxy\/([^\/]+)/);
      if (!bunnyVideoIdMatch) {
        console.log(`Could not extract Bunny video ID from URL: ${video.videoUrl}`);
        return this.generateFallbackThumbnail(video);
      }

      const bunnyVideoId = bunnyVideoIdMatch[1];
      
      // Try to get thumbnail from Bunny.net's thumbnail API
      try {
        const thumbnailUrl = `https://vz-7c674c55-8ff.b-cdn.net/${bunnyVideoId}/thumbnail.jpg`;
        console.log(`Fetching Bunny.net thumbnail: ${thumbnailUrl}`);
        
        const response = await fetch(thumbnailUrl);
        if (response.ok) {
          const thumbnailBuffer = await response.arrayBuffer();
          const base64Thumbnail = `data:image/jpeg;base64,${Buffer.from(thumbnailBuffer).toString('base64')}`;
          console.log(`✅ Bunny.net thumbnail fetched for ${videoId}`);
          return base64Thumbnail;
        } else {
          console.log(`Bunny.net thumbnail not available (${response.status}), trying alternative`);
        }
      } catch (fetchError) {
        console.log(`Failed to fetch Bunny.net thumbnail: ${fetchError}`);
      }

      // Alternative: Try Bunny.net's thumbnail API with different format
      try {
        const altThumbnailUrl = `https://thumbnail.bunnycdn.com/${bunnyVideoId}.jpg`;
        console.log(`Trying alternative thumbnail URL: ${altThumbnailUrl}`);
        
        const response = await fetch(altThumbnailUrl);
        if (response.ok) {
          const thumbnailBuffer = await response.arrayBuffer();
          const base64Thumbnail = `data:image/jpeg;base64,${Buffer.from(thumbnailBuffer).toString('base64')}`;
          console.log(`✅ Alternative thumbnail fetched for ${videoId}`);
          return base64Thumbnail;
        }
      } catch (altFetchError) {
        console.log(`Alternative thumbnail fetch failed: ${altFetchError}`);
      }

      // If both Bunny.net methods fail, try direct frame extraction with optimized ffmpeg
      const directCdnUrl = `https://vz-7c674c55-8ff.b-cdn.net/${bunnyVideoId}/video.mp4`;
      console.log(`Attempting direct video frame extraction from: ${directCdnUrl}`);

      return new Promise((resolve) => {
        const thumbnailPath = join('/tmp', `${videoId}_thumbnail.jpg`);
        
        // Optimized ffmpeg command for better compatibility
        const ffmpegArgs = [
          '-user_agent', 'Mozilla/5.0',
          '-i', directCdnUrl,
          '-ss', '1',  // Seek to 1 second
          '-vframes', '1',
          '-vf', 'scale=320:240',
          '-f', 'image2',
          '-y',
          thumbnailPath
        ];

        const ffmpeg = spawn('ffmpeg', ffmpegArgs);
        let stderr = '';
        
        ffmpeg.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        ffmpeg.on('close', async (code) => {
          if (code === 0) {
            try {
              const thumbnailBuffer = await readFile(thumbnailPath);
              const base64Thumbnail = `data:image/jpeg;base64,${thumbnailBuffer.toString('base64')}`;
              await unlink(thumbnailPath).catch(() => {});
              console.log(`✅ Direct video frame extracted for ${videoId}`);
              resolve(base64Thumbnail);
            } catch (error) {
              console.log(`Failed to read extracted frame for ${videoId}, using fallback`);
              resolve(this.generateFallbackThumbnail(video));
            }
          } else {
            console.log(`Frame extraction failed for ${videoId}, using fallback`);
            resolve(this.generateFallbackThumbnail(video));
          }
        });

        ffmpeg.on('error', () => {
          resolve(this.generateFallbackThumbnail(video));
        });

        // Shorter timeout for faster fallback
        setTimeout(() => {
          ffmpeg.kill('SIGKILL');
          resolve(this.generateFallbackThumbnail(video));
        }, 10000);
      });
    } catch (error) {
      console.error(`Error in thumbnail generation for ${videoId}:`, error);
      // Get video info for fallback
      const [videoData] = await db.select().from(videos).where(eq(videos.id, videoId));
      if (videoData) {
        return this.generateFallbackThumbnail(videoData);
      }
      return null;
    }
  }

  private async downloadVideoFromGCS(gcsUri: string): Promise<Buffer> {
    try {
      console.log(`Downloading video from GCS: ${gcsUri}`);
      
      // Import Google Cloud Storage
      const { Storage } = await import('@google-cloud/storage');
      
      // Use proper credentials instead of relying on GOOGLE_APPLICATION_CREDENTIALS
      const contentModerationCredentials = process.env.CONTENT_MODERATION_WORKER_JUN_26_2025;
      if (!contentModerationCredentials) {
        throw new Error('Content moderation credentials not found');
      }
      
      const credentials = JSON.parse(contentModerationCredentials);
      const storage = new Storage({
        credentials: credentials,
        projectId: credentials.project_id || 'steam-house-461401-t7'
      });
      
      // Extract bucket and file path from GCS URI
      const match = gcsUri.match(/gs:\/\/([^\/]+)\/(.+)/);
      if (!match) {
        throw new Error(`Invalid GCS URI format: ${gcsUri}`);
      }
      
      const [, bucketName, filePath] = match;
      console.log(`Downloading from bucket: ${bucketName}, file: ${filePath}`);
      
      const file = storage.bucket(bucketName).file(filePath);
      
      // Check if file exists
      const [exists] = await file.exists();
      if (!exists) {
        throw new Error(`File not found in GCS: ${filePath}`);
      }
      
      // Download file as buffer
      const [buffer] = await file.download();
      console.log(`Downloaded ${buffer.length} bytes from GCS`);
      
      return buffer;
    } catch (error) {
      console.error(`Failed to download video from GCS:`, error);
      throw error;
    }
  }

  private generateFallbackThumbnail(video: any): string {
    // Generate category-based fallback thumbnail
    const categoryColors = {
      'art': '#E91E63',
      'challenge': '#FF9800', 
      'nature': '#4CAF50',
      'fyi': '#2196F3',
      'love': '#F44336',
      'default': '#9C27B0'
    };

    const color = categoryColors[video.category as keyof typeof categoryColors] || categoryColors.default;
    const categoryLabel = video.category.toUpperCase();
    
    const svgThumbnail = `
      <svg width="320" height="240" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${color};stop-opacity:0.8" />
            <stop offset="100%" style="stop-color:${color};stop-opacity:0.6" />
          </linearGradient>
        </defs>
        <rect width="320" height="240" fill="url(#bg)" />
        <circle cx="160" cy="120" r="30" fill="white" opacity="0.9" />
        <polygon points="150,105 180,120 150,135" fill="${color}" />
        <text x="160" y="180" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="white">
          ${categoryLabel}
        </text>
        <text x="160" y="200" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="white" opacity="0.8">
          ${video.title.length > 25 ? video.title.substring(0, 25) + '...' : video.title}
        </text>
      </svg>
    `;

    return `data:image/svg+xml;base64,${Buffer.from(svgThumbnail).toString('base64')}`;
  }

  private async markVideoAsFailed(videoId: string, errorMessage: string): Promise<void> {
    try {
      await db.update(videos)
        .set({
          processingStatus: 'failed',
          flaggedReason: errorMessage,
          isActive: false
        } as Partial<DBVideoInsert>)
        .where(eq(videos.id, videoId));
      
      console.log(`Video ${videoId} marked as failed in database`);
    } catch (error) {
      console.error(`Failed to mark video ${videoId} as failed:`, error);
    }
  }

  async getVideoStatus(videoId: string): Promise<any> {
    try {
      const [video] = await db.select().from(videos).where(eq(videos.id, videoId));
      return video;
    } catch (error) {
      console.error(`Error getting video status for ${videoId}:`, error);
      return null;
    }
  }

  async completeStuckVideoProcessing(videoId: string): Promise<boolean> {
    // CRITICAL SECURITY FIX: This method was used to bypass AI moderation
    // Videos must go through proper pipeline: Upload → GCS → AI Analysis → Bunny Storage
    console.log(`🚨 SECURITY: Blocked dangerous video processing bypass for ${videoId}`);
    console.log(`🛡️ Videos must complete proper AI moderation pipeline before approval`);
    
    return false; // Always return false - manual recovery is disabled for security
  }

  getQueueLength(): number {
    return this.processingQueue.length;
  }

  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  // Video comment processing for 30-second videos with content moderation
  async processVideoComment(videoPath: string, commentData: {
    commentId: number;
    userId: string;
    videoId: string;
    bunnyVideoId: string;
    maxDuration: number;
  }): Promise<void> {
    try {
      console.log(`📹 Processing video comment ${commentData.commentId} for video ${commentData.videoId}`);
      
      // Validate duration limit (30 seconds) - skip duration check for now since getVideoDuration is not implemented
      // TODO: Implement duration validation if needed
      console.log(`📹 Skipping duration validation for comment ${commentData.commentId} (max: ${commentData.maxDuration}s)`)

      // Upload to GCS for content moderation
      const gcsUri = await this.uploadToGCS(`comment-${commentData.commentId}`, videoPath);
      console.log(`📹 Video comment uploaded to GCS: ${gcsUri}`);

      // Start content moderation pipeline
      const moderationPromise = this.moderateVideoComment(commentData.commentId, gcsUri);
      const audioPromise = this.processVideoCommentAudio(commentData.commentId, videoPath);

      // Run moderation and audio processing in parallel
      const [moderationResult, audioResult] = await Promise.all([moderationPromise, audioPromise]);

      // Determine final status based on both checks
      let finalStatus = 'approved';
      let flaggedReason = '';
      let audioFlagReason = '';

      if (!moderationResult.passed) {
        finalStatus = 'rejected_by_moderation';
        flaggedReason = moderationResult.reason || 'Content violated community guidelines';
      }

      // Only reject for actual content violations, not technical errors
      if (!audioResult.passed && audioResult.reason && !audioResult.reason.includes('processing failed') && !audioResult.reason.includes('technical issues')) {
        finalStatus = 'rejected_by_moderation';
        audioFlagReason = audioResult.reason || 'Audio content flagged';
        if (flaggedReason) {
          flaggedReason += '; ' + audioFlagReason;
        } else {
          flaggedReason = audioFlagReason;
        }
      } else if (!audioResult.passed) {
        // Log technical errors but don't reject the video
        console.warn(`Audio processing had technical issues for comment ${commentData.commentId}: ${audioResult.reason}`);
      }

      // Update comment status in database
      await this.storage.updateVideoCommentStatus(
        commentData.commentId, 
        finalStatus, 
        flaggedReason || undefined, 
        audioFlagReason || undefined
      );

      console.log(`✅ Video comment ${commentData.commentId} processing completed: ${finalStatus}`);

      // Clean up temporary file
      try {
        await unlink(videoPath);
      } catch (error) {
        console.warn(`Failed to cleanup video comment file: ${error}`);
      }

    } catch (error) {
      console.error(`❌ Video comment processing failed for ${commentData.commentId}:`, error);
      
      // Mark as failed in database with user-friendly message
      await this.storage.updateVideoCommentStatus(
        commentData.commentId, 
        'rejected_by_moderation', 
        'Video comment could not be processed due to technical issues. Please try recording again.'
      );
    }
  }

  private async moderateVideoComment(commentId: number, gcsUri: string): Promise<{ passed: boolean; reason?: string }> {
    try {
      // Use Google Video Intelligence for content moderation
      const serviceAccountKey = process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY!;
      const credentials = JSON.parse(serviceAccountKey);
      
      const client = new VideoIntelligenceServiceClient({
        credentials: credentials,
        projectId: credentials.project_id
      });

      console.log(`🛡️ Starting video moderation for comment ${commentId}`);

      const [operation] = await client.annotateVideo({
        inputUri: gcsUri,
        features: [Feature.EXPLICIT_CONTENT_DETECTION],
      });

      const [operationResult] = await operation.promise();
      const annotations = operationResult.annotationResults?.[0];

      if (!annotations?.explicitAnnotation) {
        console.log(`🛡️ No explicit content detected in comment ${commentId}`);
        return { passed: true };
      }

      // Check for inappropriate content with more reasonable thresholds
      const explicitFrames = annotations.explicitAnnotation.frames || [];
      
      // Count frames with very high confidence inappropriate content
      const veryLikelyFrames = explicitFrames.filter(frame => 
        frame.pornographyLikelihood === 'VERY_LIKELY'
      ).length;
      
      const likelyFrames = explicitFrames.filter(frame => 
        frame.pornographyLikelihood === 'LIKELY'
      ).length;
      
      const totalFrames = explicitFrames.length;
      
      console.log(`🛡️ Video comment ${commentId} analysis: ${veryLikelyFrames} very likely, ${likelyFrames} likely out of ${totalFrames} total frames`);
      
      // More conservative approach: only flag if multiple frames are very likely inappropriate
      // or if a significant percentage of frames are flagged
      const hasSignificantInappropriateContent = (
        veryLikelyFrames >= 3 || // 3+ frames with very high confidence
        (totalFrames > 0 && (veryLikelyFrames + likelyFrames) / totalFrames > 0.5) // More than 50% of frames flagged
      );

      if (hasSignificantInappropriateContent) {
        console.log(`🛡️ Significant inappropriate content detected in comment ${commentId}: ${veryLikelyFrames} very likely, ${likelyFrames} likely frames`);
        return { 
          passed: false, 
          reason: 'Multiple frames contain inappropriate or explicit content' 
        };
      }

      console.log(`✅ Video comment ${commentId} passed visual moderation`);
      return { passed: true };

    } catch (error) {
      console.error(`❌ Video moderation failed for comment ${commentId}:`, error);
      return { 
        passed: false, 
        reason: 'Moderation processing failed' 
      };
    }
  }

  private async processVideoCommentAudio(commentId: number, videoPath: string): Promise<{ passed: boolean; reason?: string }> {
    try {
      console.log(`🎵 Processing audio for video comment ${commentId}`);
      
      const audioResult = await audioProcessingService.processAudio(`comment-${commentId}`, videoPath);
      
      if (!audioResult.success) {
        return { 
          passed: false, 
          reason: audioResult.error || 'Audio processing failed' 
        };
      }

      if (audioResult.moderationStatus === 'failed') {
        return { 
          passed: false, 
          reason: 'Audio content flagged: detected inappropriate language/profanity in audio track' 
        };
      }

      console.log(`✅ Video comment ${commentId} passed audio moderation`);
      return { passed: true };

    } catch (error) {
      console.error(`❌ Audio processing failed for comment ${commentId}:`, error);
      return { 
        passed: false, 
        reason: 'Audio processing failed' 
      };
    }
  }

  async processVideoMessage(tempFilePath: string, options: {
    messageId: number;
    userId: string;
    threadId: string;
    bunnyVideoId: string;
    maxDuration: number;
  }): Promise<void> {
    try {
      console.log(`🎬 SECURE PROCESSING: Starting thread video message ${options.messageId}`);
      console.log(`📋 SECURITY PIPELINE: GCS → AI Moderation → Bunny Upload (only if approved) → Database Update`);
      
      // Step 1: Upload to GCS for content moderation
      const gcsUri = await this.uploadToGCS(`thread-message-${options.messageId}`, tempFilePath);
      console.log(`📤 Thread message ${options.messageId} uploaded to GCS: ${gcsUri}`);

      // Step 2: Run comprehensive content moderation
      const [moderationResult, audioResult] = await Promise.all([
        this.moderateThreadVideo(options.messageId, gcsUri),
        this.processThreadVideoAudio(options.messageId, tempFilePath)
      ]);

      // Step 3: Determine final approval status
      let finalStatus = 'approved';
      let flaggedReason = '';
      let audioFlagReason = '';

      // Check video moderation
      if (!moderationResult.passed) {
        finalStatus = 'flagged';
        flaggedReason = moderationResult.reason || 'Video content flagged by moderation';
      }

      // Check audio moderation (only reject for actual content violations, not technical errors)
      if (!audioResult.passed && audioResult.reason && 
          !audioResult.reason.includes('processing failed') && 
          !audioResult.reason.includes('technical issues')) {
        finalStatus = 'flagged';
        audioFlagReason = audioResult.reason || 'Audio content flagged';
        if (flaggedReason) {
          flaggedReason += '; ' + audioFlagReason;
        } else {
          flaggedReason = audioFlagReason;
        }
      }

      // Step 4: Upload to Bunny.net ONLY if approved
      let bunnyVideoId = null;
      let videoUrl = null;
      let thumbnailUrl = null;

      if (finalStatus === 'approved') {
        console.log(`✅ Thread message ${options.messageId} APPROVED - Uploading to Bunny.net`);
        const videoBuffer = await readFile(tempFilePath);
        bunnyVideoId = await bunnyService.uploadVideo(videoBuffer, `thread-message-${options.messageId}.mp4`);
        videoUrl = `/api/videos/bunny-proxy/${bunnyVideoId}`;
        
        // Wait for processing and generate thumbnail
        await new Promise(resolve => setTimeout(resolve, 5000));
        thumbnailUrl = `https://vz-7c674c55-8ff.b-cdn.net/${bunnyVideoId}/thumbnail.jpg`;
        
        console.log(`✅ Thread message ${options.messageId} uploaded to Bunny: ${bunnyVideoId}`);
      } else {
        console.log(`❌ Thread message ${options.messageId} REJECTED - Not uploading to Bunny.net`);
      }

      // Step 5: Update thread message with results
      await this.storage.updateThreadMessageStatus(
        options.messageId, 
        finalStatus,
        flaggedReason || undefined,
        audioFlagReason || undefined
      );

      // Step 6: Update video details if approved
      if (finalStatus === 'approved' && bunnyVideoId) {
        await this.storage.updateThreadMessageVideo(options.messageId, {
          videoUrl: videoUrl || undefined,
          thumbnailUrl: thumbnailUrl || undefined,
          bunnyVideoId: bunnyVideoId,
          transcriptionText: audioResult.transcription || undefined,
          extractedKeywords: audioResult.keywords ? JSON.stringify(audioResult.keywords) : undefined
        });
      }

      // Store moderation results
      const moderationData = {
        approved: finalStatus === 'approved',
        videoModeration: moderationResult.passed,
        audioModeration: audioResult.passed,
        flagReason: flaggedReason,
        transcription: audioResult.transcription,
        pipeline: 'thread_video_secure',
        timestamp: new Date().toISOString()
      };

      await this.storage.updateThreadMessageModerationResults(options.messageId, JSON.stringify(moderationData));

      console.log(`✅ Thread message ${options.messageId} processing completed: ${finalStatus}`);

      // Clean up temporary file
      try {
        await unlink(tempFilePath);
      } catch (error) {
        console.warn(`Failed to cleanup thread video file: ${error}`);
      }

    } catch (error) {
      console.error(`❌ Thread video processing failed for ${options.messageId}:`, error);
      await this.storage.updateThreadMessageStatus(options.messageId, 'flagged', 'Processing failed due to technical issues');
    }
  }

  private async moderateThreadVideo(messageId: number, gcsUri: string): Promise<{ passed: boolean; reason?: string }> {
    try {
      console.log(`🛡️ Starting video moderation for thread message ${messageId}`);
      
      // Use Google Video Intelligence for content moderation
      const serviceAccountKey = process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY!;
      if (!serviceAccountKey) {
        console.error('Google Cloud service account key not found');
        return { passed: false, reason: 'Content moderation service unavailable' };
      }

      const credentials = JSON.parse(serviceAccountKey);
      const { VideoIntelligenceServiceClient } = await import('@google-cloud/video-intelligence');
      
      const client = new VideoIntelligenceServiceClient({
        credentials: credentials,
        projectId: credentials.project_id
      });

      const [operation] = await client.annotateVideo({
        inputUri: gcsUri,
        features: [Feature.EXPLICIT_CONTENT_DETECTION],
      });

      const [operationResult] = await operation.promise();
      const annotations = operationResult.annotationResults?.[0];

      if (!annotations?.explicitAnnotation) {
        console.log(`No explicit content annotations found for thread message ${messageId}`);
        return { passed: true };
      }

      const frames = annotations.explicitAnnotation.frames || [];
      
      for (const frame of frames) {
        const likelihood = frame.pornographyLikelihood;
        if (likelihood === 'LIKELY' || likelihood === 'VERY_LIKELY') {
          console.log(`Explicit content detected in thread message ${messageId}: ${likelihood}`);
          return { 
            passed: false, 
            reason: 'Video contains inappropriate visual content' 
          };
        }
      }

      console.log(`Video moderation passed for thread message ${messageId}`);
      return { passed: true };

    } catch (error) {
      console.error(`Video moderation failed for thread message ${messageId}:`, error);
      return { passed: false, reason: 'Video moderation service error' };
    }
  }

  private async processThreadVideoAudio(messageId: number, videoPath: string): Promise<{ 
    passed: boolean; 
    reason?: string; 
    transcription?: string;
    keywords?: string[];
  }> {
    try {
      console.log(`🎵 Processing audio for thread message ${messageId}: ${videoPath}`);
      
      // Extract audio from video
      const audioPath = join('/tmp', `thread-message-${messageId}-audio.wav`);
      
      const ffmpegArgs = [
        '-err_detect', 'ignore_err',
        '-i', videoPath,
        '-vn',           // No video
        '-acodec', 'pcm_s16le',  // PCM audio codec
        '-ar', '16000',  // Sample rate for speech recognition
        '-ac', '1',      // Mono channel
        '-y',            // Overwrite output
        audioPath
      ];
      
      console.log(`Extracting audio from video using FFmpeg: ${ffmpegArgs.join(' ')}`);
      
      const success = await new Promise<boolean>((resolve) => {
        const ffmpeg = spawn('ffmpeg', ffmpegArgs);
        let stderr = '';
        
        ffmpeg.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        ffmpeg.on('close', (code) => {
          if (code === 0) {
            console.log(`Audio extraction successful for thread message ${messageId}`);
            resolve(true);
          } else {
            console.error(`Audio extraction failed with code ${code}: ${stderr}`);
            resolve(false);
          }
        });
        
        ffmpeg.on('error', (error) => {
          console.error(`FFmpeg error: ${error}`);
          resolve(false);
        });
        
        // Timeout after 30 seconds
        setTimeout(() => {
          ffmpeg.kill('SIGTERM');
          resolve(false);
        }, 30000);
      });
      
      if (!success) {
        return { passed: true, reason: 'Audio extraction failed - approving without audio check' };
      }
      
      // Process with Speech-to-Text
      try {
        const audioBuffer = await readFile(audioPath);
        console.log(`Audio file size: ${audioBuffer.length} bytes`);
        
        // Clean up audio file
        await unlink(audioPath).catch(() => {});
        
        if (audioBuffer.length < 1000) {
          return { passed: true, reason: 'Audio too short for analysis' };
        }
        
        // Use audio processing service for moderation
        const { audioProcessingService } = await import('./audioProcessingService.ts');
        const result = await audioProcessingService.processAudio(audioBuffer);
        
        if (!result.success) {
          console.warn(`Audio processing failed for thread message ${messageId}: ${result.error}`);
          return { passed: true, reason: 'Audio processing failed - approving without audio check' };
        }
        
        // Check for inappropriate content
        if (result.transcription) {
          const flaggedWords = this.checkProfanity(result.transcription);
          if (flaggedWords.length > 0) {
            return { 
              passed: false, 
              reason: `Inappropriate language detected: ${flaggedWords.join(', ')}`,
              transcription: result.transcription
            };
          }
        }
        
        return { 
          passed: true,
          transcription: result.transcription,
          keywords: result.keywords
        };
        
      } catch (audioError) {
        console.error(`Audio processing error for thread message ${messageId}:`, audioError);
        return { passed: true, reason: 'Audio processing failed - approving without audio check' };
      }
      
    } catch (error) {
      console.error(`Error in thread message audio processing for ${messageId}:`, error);
      return { passed: true, reason: 'Audio processing failed - approving without audio check' };
    }
  }

  private async processAudioForThreadMessage(messageId: number, videoPath: string): Promise<{ passed: boolean; reason?: string }> {
    try {
      console.log(`🎵 Processing audio for thread message ${messageId}: ${videoPath}`);
      
      // Use the correct audio processing method for local video files
      const result = await audioProcessingService.processLocalVideo(videoPath, {
        contentType: 'thread_message',
        contentId: messageId.toString(),
        userId: '', // Will be set by the calling context
        maxDuration: 30
      });

      if (result.approved) {
        console.log(`✅ Thread message ${messageId} passed audio moderation`);
        return { passed: true };
      } else {
        console.log(`❌ Thread message ${messageId} failed audio moderation: ${result.reason}`);
        return { 
          passed: false, 
          reason: result.reason || 'Audio content violates guidelines'
        };
      }

    } catch (error) {
      console.error(`❌ Audio processing failed for thread message ${messageId}:`, error);
      return { 
        passed: false, 
        reason: 'Audio processing failed' 
      };
    }
  }

  private storage = {
    updateVideoCommentStatus: async (commentId: number, status: string, flaggedReason?: string, audioFlagReason?: string) => {
      const { storage } = await import('./storage.ts');
      return storage.updateVideoCommentStatus(commentId, status, flaggedReason, audioFlagReason);
    },
    updateThreadMessageStatus: async (messageId: number, status: string, flaggedReason?: string, audioFlagReason?: string) => {
      const { storage } = await import('./storage.ts');
      return storage.updateThreadMessageStatus(messageId, status, flaggedReason, audioFlagReason);
    },
    updateThreadMessageVideo: async (messageId: number, videoData: {
      videoUrl?: string;
      thumbnailUrl?: string;
      bunnyVideoId?: string;
      transcriptionText?: string;
      extractedKeywords?: string;
    }) => {
      const { storage } = await import('./storage.ts');
      return storage.updateThreadMessageVideo(messageId, videoData);
    }
  };


}

export const videoProcessor = new SimpleVideoProcessor();

const singleton = new SimpleVideoProcessor();

export async function processVideo(
  tempFilePath: string,
  videoId: string | number,
  duration?: number | null
): Promise<void> {
  singleton.enqueue({
    videoId: String(videoId),
    tempFilePath,
    metadata: { duration },   // now valid
  });
}