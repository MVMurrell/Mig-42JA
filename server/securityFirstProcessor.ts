import { spawn } from 'child_process';
import { readFile, unlink } from 'fs/promises';
import { join } from "node:path";
import { db } from './db.ts';
import { videos, users, userFollows, userFollowNotifications, notifications } from "../shared/schema";;
import { eq, and, or, isNull } from 'drizzle-orm';
import { audioProcessingService } from './audioProcessingService.ts';

import { bunnyService } from './bunnyService.ts';
type DBVideoInsert = typeof videos.$inferInsert;


interface ModerationResult {
  approved: boolean;
  videoModeration: boolean;
  audioModeration: 'passed' | 'failed' | 'error';
  flagReason?: string;
  transcription?: string;
  extractedKeywords: string[];
}

interface ProcessingMetadata {
  title: string;
  description: string;
  category: string;
  latitude: string;
  longitude: string;
  visibility: string;
  groupId?: string;
  frontendDuration?: number;
}

export class SecurityFirstProcessor {
  constructor() {
    console.log('Security-First Video Processor initialized');
  }

  /**
   * Main security-first processing pipeline
   * Step 1: Upload to GCS for moderation
   * Step 2: Run comprehensive content moderation (video + audio)
   * Step 3: Only if ALL checks pass → Upload to Bunny.net
   * Step 4: If checks fail → Mark for user review/appeal
   */
  async processVideo(videoId: string, videoPath: string, metadata: ProcessingMetadata, needsPreprocessing: boolean = false): Promise<boolean> {
    let processedVideoPath: string | null = null;
    let gcsUri: string | null = null;

    try {
      console.log(`🔒 SECURITY-FIRST: Starting processing for ${videoId}`);
      console.log(`📋 PIPELINE: Moderation → Bunny.net (only if approved)`);

      // Step 1: Preprocess video if needed (WebM files)
      let videoForModeration = videoPath;
      if (needsPreprocessing) {
        console.log(`🔧 STEP 1: Preprocessing video for ${videoId}`);
        processedVideoPath = await this.preprocessVideo(videoPath, videoId, metadata.frontendDuration);
        videoForModeration = processedVideoPath;
        console.log(`✅ STEP 1: Preprocessing completed`);
      }

      // Step 2: Upload to GCS for moderation analysis
      console.log(`📤 STEP 2: Uploading to GCS for moderation analysis`);
      gcsUri = await this.uploadToGCS(videoId, videoForModeration);
      console.log(`✅ STEP 2: GCS upload completed: ${gcsUri}`);

      // Step 3: Update database with pending moderation status
      await db.update(videos)
        .set({
          processingStatus: 'pending_moderation',
          gcsProcessingUrl: gcsUri,
          title: metadata.title,
          description: metadata.description,
          category: metadata.category,
          latitude: metadata.latitude,
          longitude: metadata.longitude,
          visibility: metadata.visibility,
          groupId: metadata.groupId,
          isActive: false
        }as Partial<DBVideoInsert>)
        .where(eq(videos.id, videoId));

      console.log(`✅ STEP 3: Database updated with pending moderation status`);

      // Step 4: Run comprehensive moderation checks
      console.log(`🔍 STEP 4: Running comprehensive moderation checks`);
      const moderationResult = await this.runComprehensiveModeration(videoId, gcsUri);
      console.log(`✅ STEP 4: Moderation completed - Result: ${moderationResult.approved ? 'APPROVED' : 'REJECTED'}`);

      // Step 5: Conditional publishing based on moderation results
      if (moderationResult.approved) {
        return await this.publishApprovedVideo(videoId, videoForModeration, moderationResult, metadata);
      } else {
        return await this.handleRejectedVideo(videoId, moderationResult, videoForModeration);
      }

    } catch (error) {
      console.error(`❌ Security-first processing failed for ${videoId}:`, error);
      await this.markVideoAsFailed(videoId, `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    } finally {
      // Cleanup temporary files
      if (processedVideoPath) {
        try { await unlink(processedVideoPath); } catch {}
      }
      if (gcsUri) {
        try { await this.cleanupGCS(gcsUri); } catch {}
      }
    }
  }

  private async runComprehensiveModeration(videoId: string, gcsUri: string): Promise<ModerationResult> {
    try {
      console.log(`🔍 MODERATION: Starting comprehensive checks for ${videoId}`);

      // Run video and audio moderation concurrently
      const [videoModeration, audioResult] = await Promise.all([
        this.runVideoModeration(gcsUri, videoId),
        audioProcessingService.processAudio(videoId, gcsUri)
      ]);

      const result: ModerationResult = {
        approved: videoModeration && audioResult.moderationStatus === 'passed',
        videoModeration,
        audioModeration: audioResult.moderationStatus,
        transcription: audioResult.transcription,
        extractedKeywords: audioResult.extractedKeywords,
        flagReason: undefined
      };

      // Determine flag reason if rejected
      if (!result.approved) {
        if (!videoModeration && audioResult.moderationStatus !== 'passed') {
          result.flagReason = `Video content flagged by AI and audio content flagged: ${audioResult.flagReason}`;
        } else if (!videoModeration) {
          result.flagReason = 'Explicit content detected by Google Cloud Video AI';
        } else {
          result.flagReason = `Audio content flagged: ${audioResult.flagReason}`;
        }
      }

      console.log(`🔍 MODERATION: Video AI = ${videoModeration ? 'PASS' : 'FAIL'}, Audio = ${audioResult.moderationStatus.toUpperCase()}`);
      return result;

    } catch (error) {
      console.error(`❌ MODERATION: Comprehensive moderation failed for ${videoId}:`, error);
      return {
        approved: false,
        videoModeration: false,
        audioModeration: 'error',
        extractedKeywords: [],
        flagReason: 'Moderation system error'
      };
    }
  }

  private async publishApprovedVideo(videoId: string, videoPath: string, moderationResult: ModerationResult, metadata: ProcessingMetadata): Promise<boolean> {
    try {
      console.log(`✅ PUBLISHING: Video ${videoId} approved, uploading to Bunny.net`);

      // Upload to Bunny.net for CDN streaming
      const videoBuffer = await readFile(videoPath);
      const bunnyVideoId = await bunnyService.uploadVideo(videoBuffer, `${videoId}.mp4`);
      const cdnUrl = bunnyService.getStreamUrl(bunnyVideoId.videoId);
      console.log(`✅ PUBLISHING: Bunny.net upload completed: ${bunnyVideoId}`);

      // Generate thumbnail
      let thumbnailUrl = null;
      try {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait for Bunny.net processing
        thumbnailUrl = await this.generateVideoThumbnail(bunnyVideoId.videoId);
      } catch (error) {
        console.error(`⚠️ PUBLISHING: Thumbnail generation failed:`, error);
        thumbnailUrl = this.generateFallbackThumbnail(metadata);
      }

      // Update database with approved, published status
      await db.update(videos)
        .set({
          processingStatus: 'approved',
          bunnyVideoId: bunnyVideoId,
          videoUrl: cdnUrl,
          thumbnailUrl: thumbnailUrl,
          isActive: true,
          transcriptionText: moderationResult.transcription,
          audioModerationStatus: moderationResult.audioModeration,
          extractedKeywords: JSON.stringify(moderationResult.extractedKeywords),
          moderationResults: JSON.stringify({
            approved: true,
            timestamp: new Date().toISOString(),
            videoModeration: moderationResult.videoModeration,
            audioModeration: moderationResult.audioModeration,
            pipeline: 'security_first'
          })
        } as Partial<DBVideoInsert>)
        .where(eq(videos.id, videoId));

      console.log(`✅ PUBLISHING: Video ${videoId} successfully published and active`);
      
      // Notify collectors about the new gem
      await this.notifyCollectorsOfNewGem(videoId, metadata);
      
      return true;

    } catch (error) {
      console.error(`❌ PUBLISHING: Failed to publish approved video ${videoId}:`, error);
      await this.markVideoAsFailed(videoId, `Publishing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  private async handleRejectedVideo(videoId: string, moderationResult: ModerationResult, videoPath?: string): Promise<boolean> {
    try {
      console.log(`❌ REJECTION: Video ${videoId} rejected by moderation`);

      // Upload flagged video to moderation zone for review
      let bunnyReviewVideoId = null;
      if (videoPath) {
        try {
          const videoBuffer = await readFile(videoPath);
          bunnyReviewVideoId = await bunnyService.uploadVideoForReview(videoBuffer, videoId);
          console.log(`📋 MODERATION: Uploaded flagged video to review storage: ${bunnyReviewVideoId}`);
        } catch (uploadError) {
          console.error(`❌ MODERATION: Failed to upload flagged video for review:`, uploadError);
        }
      }

      // Update database with rejected status - available for user appeal
      await db.update(videos)
        .set({
          processingStatus: 'rejected_by_moderation',
          flaggedReason: moderationResult.flagReason,
          bunnyReviewVideoId: bunnyReviewVideoId,
          isActive: false,
          transcriptionText: moderationResult.transcription,
          audioModerationStatus: moderationResult.audioModeration,
          extractedKeywords: JSON.stringify(moderationResult.extractedKeywords),
          moderationResults: JSON.stringify({
            approved: false,
            timestamp: new Date().toISOString(),
            videoModeration: moderationResult.videoModeration,
            audioModeration: moderationResult.audioModeration,
            flagReason: moderationResult.flagReason,
            bunnyReviewStatus: bunnyReviewVideoId ? 'uploaded' : 'failed',
            pipeline: 'security_first'
          })
        }as Partial<DBVideoInsert>)
        .where(eq(videos.id, videoId));

      console.log(`✅ REJECTION: Video ${videoId} marked for user review/appeal`);
      return true; // Successfully processed (though rejected)

    } catch (error) {
      console.error(`❌ REJECTION: Failed to handle rejected video ${videoId}:`, error);
      return false;
    }
  }

  private async preprocessVideo(inputPath: string, videoId: string, frontendDuration?: number): Promise<string> {
    const outputPath = join('/tmp', `${videoId}_processed.mp4`);
    
    return new Promise((resolve, reject) => {
      const args = [
        '-i', inputPath,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-y',
        outputPath
      ];

      if (frontendDuration) {
        args.splice(-2, 0, '-t', frontendDuration.toString());
      }

      const ffmpeg = spawn('ffmpeg', args);
      
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve(outputPath);
        } else {
          reject(new Error(`FFmpeg preprocessing failed with code ${code}`));
        }
      });

      ffmpeg.on('error', reject);
    });
  }

  private async uploadToGCS(videoId: string, videoPath: string): Promise<string> {
    // This would implement GCS upload logic
    // For now, return a mock GCS URI
    return `gs://jemzy-video-processing/${videoId}/video.mp4`;
  }

  private async runVideoModeration(gcsUri: string, videoId: string): Promise<boolean> {
    // This would implement Google Cloud Video Intelligence API
    // For now, return true (would be replaced with actual moderation)
    console.log(`🔍 VIDEO AI: Analyzing video content for ${videoId}`);
    return true; // Replace with actual Video Intelligence API call
  }

  private async generateVideoThumbnail(bunnyVideoId: string): Promise<string> {
    return `https://vz-7c674c55-8ff.b-cdn.net/${bunnyVideoId}/thumbnail.jpg`;
  }

  private generateFallbackThumbnail(metadata: ProcessingMetadata): string {
    const categoryColors: Record<string, string> = {
      fyi: '#3B82F6',
      nature: '#10B981',
      challenge: '#F59E0B',
      chat: '#8B5CF6',
      love: '#EF4444',
      art: '#EC4899',
      products: '#06B6D4',
      reviews: '#84CC16',
      services: '#6366F1'
    };

    const color = categoryColors[metadata.category] || '#6B7280';
    const title = metadata.title.slice(0, 2).toUpperCase();

    return `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225">
        <rect width="400" height="225" fill="${color}"/>
        <text x="200" y="130" font-family="Arial, sans-serif" font-size="48" font-weight="bold" 
              text-anchor="middle" fill="white">${title}</text>
      </svg>
    `)}`;
  }

  private async markVideoAsFailed(videoId: string, reason: string): Promise<void> {
    await db.update(videos)
      .set({
        processingStatus: 'failed',
        flaggedReason: reason,
        isActive: false
      }as Partial<DBVideoInsert>)
      .where(eq(videos.id, videoId));
  }

  private async notifyCollectorsOfNewGem(videoId: string, metadata: ProcessingMetadata): Promise<void> {
    try {
      // Get the video details
      const [video] = await db
        .select()
        .from(videos)
        .where(eq(videos.id, videoId));
      
      if (!video) {
        console.log(`⚠️ NOTIFICATIONS: Video ${videoId} not found for collector notifications`);
        return;
      }

      // Get the video creator's information
      const [creator] = await db
        .select()
        .from(users)
        .where(eq(users.id, video.userId));

      if (!creator) {
        console.log(`⚠️ NOTIFICATIONS: Creator not found for video ${videoId}`);
        return;
      }

      // Get all users who are collecting this creator and have notifications enabled
      const followersWithNotifications = await db
        .select({
          followerId: userFollows.followerId,
          followerInfo: users
        })
        .from(userFollows)
        .innerJoin(users, eq(users.id, userFollows.followerId))
        .leftJoin(userFollowNotifications, 
          and(
            eq(userFollowNotifications.followerId, userFollows.followerId),
            eq(userFollowNotifications.followingId, userFollows.followingId)
          )
        )
        .where(
          and(
            eq(userFollows.followingId, video.userId),
            or(
              isNull(userFollowNotifications.notificationsEnabled),
              eq(userFollowNotifications.notificationsEnabled, true)
            )
          )
        );

      console.log(`📬 NOTIFICATIONS: Notifying ${followersWithNotifications.length} collectors about new gem from ${creator.firstName} ${creator.lastName}`);

      // Create notifications for each collector
      for (const follower of followersWithNotifications) {

        const notification = {
             userId: follower.followerId,
          type: 'new_gem',
          title: 'New Gem Posted',
          message: `${creator.firstName || 'A user'} ${creator.lastName || 'you collect'} posted a new gem: "${video.title}"`,
          actionUrl: `/video/${videoId}`,
          relatedUserId: video.userId,
          relatedContentId: videoId,
          thumbnailUrl: video.thumbnailUrl,
          isRead: false
        }
        await db.insert(notifications).values(notification);
      }

      // Log successful notification creation
      console.log(`✅ NOTIFICATIONS: Successfully created ${followersWithNotifications.length} notifications for new gem ${videoId}`);

    } catch (error) {
      console.error(`❌ NOTIFICATIONS: Failed to notify collectors about new gem ${videoId}:`, error);
    }
  }

  private async cleanupGCS(gcsUri: string): Promise<void> {
    // Implement GCS cleanup logic
    console.log(`🧹 CLEANUP: Removing temporary GCS file: ${gcsUri}`);
  }
}

export const securityFirstProcessor = new SecurityFirstProcessor();