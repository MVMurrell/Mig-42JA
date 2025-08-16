import { readFile, unlink } from 'fs/promises';
import { join } from "node:path";
import { spawn } from 'child_process';
import { Storage } from '@google-cloud/storage';
import { VideoIntelligenceServiceClient } from '@google-cloud/video-intelligence';

import { bunnyService } from './bunnyService.ts';
import { storage } from './storage.ts';

export class ThreadVideoModerator {
  private gcsStorage: Storage;

  constructor() {
    try {
      // Initialize Google Cloud Storage with new secure credentials
      const audioCredentials = process.env.AUDIO_TRANSCRIPTION_API_JUN_26_2025;
      
      if (!audioCredentials) {
        throw new Error('AUDIO_TRANSCRIPTION_API_JUN_26_2025 credentials not found');
      }

      const credentials = JSON.parse(audioCredentials);
      
      this.gcsStorage = new Storage({
        credentials: credentials,
        projectId: credentials.project_id || 'steam-house-461401-t7'
      });
      
      console.log('Thread Video Moderator initialized with new secure credentials');
    } catch (error) {
      console.error('Failed to initialize Thread Video Moderator:', error);
      throw error;
    }
  }

  async processThreadVideo(tempFilePath: string, options: {
    messageId: number;
    userId: string;
    threadId: string;
    maxDuration: number;
  }): Promise<void> {
    try {
      console.log(`🔒 SECURE THREAD VIDEO: Processing message ${options.messageId}`);
      console.log(`📋 SECURITY PIPELINE: GCS → AI Moderation → Bunny Upload (only if approved)`);
      
      // Step 1: Upload to GCS for content moderation with fail-closed security
      let gcsUri: string;
      try {
        gcsUri = await this.uploadToGCS(`thread-message-${options.messageId}`, tempFilePath);
        console.log(`📤 Thread message ${options.messageId} uploaded to GCS: ${gcsUri}`);
        
        // Verify GCS upload success by checking file existence
        const isUploaded = await this.verifyGCSUpload(gcsUri);
        if (!isUploaded) {
          throw new Error('GCS upload verification failed - file not accessible');
        }
      } catch (gcsError) {
        console.error(`🚨 CRITICAL SECURITY: GCS upload failed for message ${options.messageId}:`, gcsError);
        await storage.updateThreadMessageStatus(
          options.messageId,
          'flagged',
          'SECURITY: Video upload failed - content rejected for safety'
        );
        return;
      }

      // Step 2: Run comprehensive content moderation in parallel
      const [videoModerationResult, audioModerationResult] = await Promise.all([
        this.moderateVideoContent(options.messageId, gcsUri),
        this.moderateAudioContent(options.messageId, tempFilePath)
      ]);

      // Step 3: Determine final approval status with strict policy
      let finalStatus = 'approved';
      let rejectionReasons: string[] = [];

      // Check video moderation results
      if (!videoModerationResult.passed) {
        finalStatus = 'flagged';
        rejectionReasons.push(videoModerationResult.reason || 'Video content flagged');
      }

      // Check audio moderation results (only reject for actual content violations)
      if (!audioModerationResult.passed && 
          audioModerationResult.reason && 
          !audioModerationResult.reason.includes('processing failed') && 
          !audioModerationResult.reason.includes('technical issues')) {
        finalStatus = 'flagged';
        rejectionReasons.push(audioModerationResult.reason);
      }

      // Step 4: Upload to Bunny.net ONLY if content passes all moderation checks
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
        console.log(`❌ Thread message ${options.messageId} REJECTED: ${rejectionReasons.join('; ')}`);
      }

      // Step 5: Update thread message with moderation results
      await storage.updateThreadMessageStatus(
        options.messageId,
        finalStatus,
        rejectionReasons.length > 0 ? rejectionReasons.join('; ') : undefined,
        audioModerationResult.reason || undefined
      );

      // Step 6: Update video details if approved
      if (finalStatus === 'approved' && bunnyVideoId) {
        await storage.updateThreadMessageVideo(options.messageId, {
          videoUrl: videoUrl || undefined,
          thumbnailUrl: thumbnailUrl || undefined,
          bunnyVideoId: bunnyVideoId,
          transcriptionText: audioModerationResult.transcription || undefined,
          extractedKeywords: audioModerationResult.keywords ? JSON.stringify(audioModerationResult.keywords) : undefined
        });
      }

      // Step 7: Store comprehensive moderation results
      const moderationData = {
        approved: finalStatus === 'approved',
        videoModeration: videoModerationResult.passed,
        audioModeration: audioModerationResult.passed,
        rejectionReasons: rejectionReasons,
        transcription: audioModerationResult.transcription,
        pipeline: 'thread_video_secure_v2',
        timestamp: new Date().toISOString(),
        gcsUri: gcsUri,
        bunnyVideoId: bunnyVideoId
      };

      await storage.updateThreadMessageModerationResults(options.messageId, JSON.stringify(moderationData));

      console.log(`🔒 Thread message ${options.messageId} secure processing completed: ${finalStatus}`);

      // Step 8: Clean up temporary files only (keep GCS files for debugging/appeals)
      try {
        await unlink(tempFilePath);
        console.log(`🧹 Temporary file cleaned up for thread message ${options.messageId}`);
        // Note: GCS files are preserved for debugging and appeal processes
      } catch (cleanupError) {
        console.warn(`Cleanup warning for thread message ${options.messageId}:`, cleanupError);
      }

    } catch (error) {
      console.error(`❌ CRITICAL: Thread video processing failed for ${options.messageId}:`, error);
      
      // Mark as flagged due to processing failure
      await storage.updateThreadMessageStatus(
        options.messageId, 
        'flagged', 
        'Content moderation failed - video rejected for security'
      );
    }
  }

  private async uploadToGCS(identifier: string, videoPath: string): Promise<string> {
    const bucket = this.gcsStorage.bucket('jemzy-video-moderation-steam-house-461401-t7');
    const fileName = `raw-videos/${identifier}.webm`;
    const file = bucket.file(fileName);

    const videoBuffer = await readFile(videoPath);
    
    await file.save(videoBuffer, {
      metadata: {
        contentType: 'video/webm',
        metadata: {
          uploadedAt: new Date().toISOString(),
          source: 'thread_video_moderation'
        }
      }
    });

    const gcsUri = `gs://${bucket.name}/${fileName}`;
    console.log(`📤 GCS Upload completed: ${gcsUri}`);
    return gcsUri;
  }

  private async verifyGCSUpload(gcsUri: string): Promise<boolean> {
    try {
      const match = gcsUri.match(/gs:\/\/([^\/]+)\/(.+)/);
      if (!match) return false;
      
      const [, bucketName, filePath] = match;
      const bucket = this.gcsStorage.bucket(bucketName);
      const file = bucket.file(filePath);
      
      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      console.error('GCS verification failed:', error);
      return false;
    }
  }

  private async moderateVideoContent(messageId: number, gcsUri: string): Promise<{ passed: boolean; reason?: string }> {
    try {
      console.log(`🛡️ COMPREHENSIVE VIDEO AI: Starting enhanced moderation for thread message ${messageId}`);
      
      const contentCredentials = process.env.CONTENT_MODERATION_WORKER_JUN_26_2025;
      
      if (!contentCredentials) {
        throw new Error('CONTENT_MODERATION_WORKER_JUN_26_2025 credentials not found');
      }

      const credentials = JSON.parse(contentCredentials);
      
      const client = new VideoIntelligenceServiceClient({
        credentials: credentials,
        projectId: credentials.project_id
      });

      console.log(`🎥 THREAD VIDEO AI: Analyzing ${gcsUri} with comprehensive detection`);

      // Enhanced video analysis with comprehensive content detection
      const [operation] = await client.annotateVideo({
        inputUri: gcsUri,
        features: [
          'EXPLICIT_CONTENT_DETECTION',
          'OBJECT_TRACKING',
          'PERSON_DETECTION'
        ] as any,
        videoContext: {
          explicitContentDetectionConfig: {
            model: 'builtin/stable'
          }
        }
      });

      console.log(`🎥 THREAD VIDEO AI: Analysis operation started for message ${messageId}`);
      const [operationResult] = await operation.promise();
      const annotations = operationResult.annotationResults?.[0];

      if (!annotations) {
        console.log(`🚫 THREAD VIDEO AI: CRITICAL SECURITY FAILURE - No analysis results for message ${messageId}, REJECTING`);
        return { 
          passed: false, 
          reason: 'Video Intelligence API analysis failed - content rejected for security' 
        };
      }

      // Check explicit content detection
      const explicitAnnotation = annotations.explicitAnnotation;
      if (explicitAnnotation?.frames) {
        console.log(`🎥 THREAD VIDEO AI: Found ${explicitAnnotation.frames.length} explicit content frames`);
        
        for (const frame of explicitAnnotation.frames) {
          const likelihood = frame.pornographyLikelihood;
          console.log(`🎥 THREAD VIDEO AI: Frame explicit likelihood: ${likelihood}`);
          
          if (['LIKELY', 'VERY_LIKELY'].includes(String(likelihood) || '')) {
            console.log(`🚫 THREAD VIDEO AI: REJECTED - Explicit content detected with likelihood: ${likelihood}`);
            return { 
              passed: false, 
              reason: `Video contains explicit visual content (confidence: ${likelihood})` 
            };
          }
        }
      }

      // Content moderation completed (gesture detection removed as requested)

      // Check object tracking for inappropriate gestures (backup detection)
      const objectAnnotations = annotations.objectAnnotations || [];
      console.log(`🎥 THREAD VIDEO AI: Found ${objectAnnotations.length} tracked objects`);
      
      for (const objectAnnotation of objectAnnotations) {
        const entity = objectAnnotation.entity;
        const description = entity?.description?.toLowerCase() || '';
        
        console.log(`🎥 THREAD VIDEO AI: Detected object: ${description}`);
        
        // Check for hand/finger related objects that might indicate inappropriate gestures
        if (description.includes('finger') || description.includes('hand gesture') || description.includes('middle finger')) {
          console.log(`🚫 THREAD VIDEO AI: REJECTED - Inappropriate hand gesture detected: ${description}`);
          return {
            passed: false,
            reason: `Video contains inappropriate hand gestures: ${description}`
          };
        }
      }

      // Check person detection for pose analysis
      const personDetections = annotations.personDetectionAnnotations || [];
      console.log(`🎥 THREAD VIDEO AI: Found ${personDetections.length} person detection results`);
      
      for (const detection of personDetections) {
        const tracks = detection.tracks || [];
        for (const track of tracks) {
          const attributes = track.attributes || [];
          for (const attribute of attributes) {
            const name = attribute.name?.toLowerCase() || '';
            console.log(`🎥 THREAD VIDEO AI: Person attribute detected: ${name}`);
            
            // Check for gesture-related attributes
            if (name.includes('gesture') || name.includes('inappropriate') || name.includes('offensive')) {
              console.log(`🚫 THREAD VIDEO AI: REJECTED - Inappropriate gesture attribute: ${name}`);
              return {
                passed: false,
                reason: `Video contains inappropriate gestures: ${name}`
              };
            }
          }
        }
      }

      console.log(`✅ THREAD VIDEO AI: Comprehensive analysis completed - No inappropriate content detected, APPROVED for message ${messageId}`);
      return { passed: true };

    } catch (error) {
      console.error(`❌ THREAD VIDEO AI: Analysis failed for message ${messageId}:`, error);
      // Fail closed - reject on moderation errors for security
      console.log(`🚫 THREAD VIDEO AI: REJECTED due to analysis failure - fail-closed security for message ${messageId}`);
      return { passed: false, reason: 'Video moderation service error - content rejected for security' };
    }
  }

  private async moderateAudioContent(messageId: number, videoPath: string): Promise<{ 
    passed: boolean; 
    reason?: string; 
    transcription?: string;
    keywords?: string[];
  }> {
    try {
      console.log(`🎵 CRITICAL SECURITY: Audio moderation starting for thread message ${messageId}`);
      
      // SECURITY FIX: Use the correct GCS file path that was uploaded in uploadToGCS
      // The file is uploaded as "thread-message-{messageId}", not with bunny video ID
      const gcsFileName = `thread-message-${messageId}`;
      const gcsUri = `gs://jemzy-video-moderation-steam-house-461401-t7/raw-videos/${gcsFileName}.webm`;
      
      console.log(`🎵 THREAD AUDIO: Processing video from correct GCS path: ${gcsUri}`);

      try {
        // Use the corrected audio processing service with proper GCS access
        const { audioProcessingService } = await import('./audioProcessingService.ts');
        const result = await audioProcessingService.processAudio(gcsFileName, gcsUri);
        
        if (!result.success) {
          console.error(`🚨 SECURITY VIOLATION: Audio processing failed for thread message ${messageId}: ${result.error} - REJECTING`);
          return { passed: false, reason: result.error || 'SECURITY: Audio processing failed - content rejected for safety' };
        }

        // Check moderation status - enforce strict security
        if (result.moderationStatus === 'failed') {
          console.log(`🚫 INAPPROPRIATE CONTENT DETECTED in thread message ${messageId}: ${result.flagReason}`);
          return { 
            passed: false, 
            reason: result.flagReason || 'Inappropriate content detected',
            transcription: result.transcription
          };
        }

        console.log(`✅ Audio moderation passed for thread message ${messageId}`);
        return { 
          passed: true,
          transcription: result.transcription,
          keywords: result.extractedKeywords
        };
        
      } catch (audioError) {
        console.error(`🚨 SECURITY VIOLATION: Audio processing error for thread message ${messageId}:`, audioError);
        return { passed: false, reason: 'SECURITY: Audio processing failed - content rejected for safety' };
      }

    } catch (error) {
      console.error(`🚨 SECURITY VIOLATION: Error in audio moderation for thread message ${messageId}:`, error);
      return { passed: false, reason: 'SECURITY: Audio moderation failed - content rejected for safety' };
    }
  }

  private async extractAudio(videoPath: string, audioPath: string): Promise<boolean> {
    return new Promise((resolve) => {
      const ffmpegArgs = [
        '-err_detect', 'ignore_err',
        '-i', videoPath,
        '-vn',                    // No video
        '-acodec', 'pcm_s16le',   // PCM audio codec
        '-ar', '16000',           // Sample rate for speech recognition
        '-ac', '1',               // Mono channel
        '-y',                     // Overwrite output
        audioPath
      ];

      const ffmpeg = spawn('ffmpeg', ffmpegArgs);
      let stderr = '';
      
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve(true);
        } else {
          console.error(`FFmpeg audio extraction failed with code ${code}: ${stderr}`);
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
  }

  private detectProfanity(text: string): string[] {
    // Comprehensive profanity detection with common variations and obfuscations
    const profanityPatterns = [
      // Basic profanity
      /\bf+u+c+k+/gi,
      /\bs+h+i+t+/gi,
      /\bb+i+t+c+h+/gi,
      /\ba+s+s+h+o+l+e+/gi,
      /\bd+a+m+n+/gi,
      /\bh+e+l+l+/gi,
      /\bc+r+a+p+/gi,
      
      // Character substitutions
      /\bf[@#$%^&*]ck/gi,
      /\bs[@#$%^&*]it/gi,
      /\bb[@#$%^&*]tch/gi,
      /\ba[@#$%^&*]hole/gi,
      
      // Spaced out versions
      /\bf\s*u\s*c\s*k/gi,
      /\bs\s*h\s*i\s*t/gi,
      /\bb\s*i\s*t\s*c\s*h/gi,
      
      // Common misspellings and variations
      /\bfuk+/gi,
      /\bfack/gi,
      /\bsheet/gi,
      /\bbeatch/gi,
    ];

    const flaggedWords: string[] = [];
    const lowerText = text.toLowerCase();

    for (const pattern of profanityPatterns) {
      const matches = lowerText.match(pattern);
      if (matches) {
        flaggedWords.push(...matches);
      }
    }

    return Array.from(new Set(flaggedWords)); // Remove duplicates
  }









  private async cleanupGCS(gcsUri: string): Promise<void> {
    try {
      const match = gcsUri.match(/gs:\/\/([^\/]+)\/(.+)/);
      if (match) {
        const [, bucketName, filePath] = match;
        await this.gcsStorage.bucket(bucketName).file(filePath).delete();
        console.log(`🧹 GCS cleanup completed: ${gcsUri}`);
      }
    } catch (error) {
      console.warn(`GCS cleanup failed for ${gcsUri}:`, error);
    }
  }
}

export const threadVideoModerator = new ThreadVideoModerator();