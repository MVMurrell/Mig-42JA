/**
 * PENDING AI PROCESSOR: Automatic background service for stuck videos
 * 
 * This processor continuously monitors videos in "pending_ai_analysis" status
 * and automatically processes them through the enhanced AI moderation pipeline.
 * 
 * Fixes the sustainability issue where manual intervention was required.
 */

import { uploadFirstProcessor } from './uploadFirstProcessor.ts';
import { db } from './db.ts';
import { videos, threadMessages } from '../shared/schema.ts';
import { eq, lt } from 'drizzle-orm';
import { sql } from "drizzle-orm";
type VideoUpdate = Partial<typeof videos.$inferInsert>;
type ThreadMsgUpdate = Partial<typeof threadMessages.$inferInsert>;


interface PendingVideoJob {
  videoId: string;
  tempFilePath: string;
  metadata: {
    title: string;
    description: string;
    category: string;
    latitude: number;
    longitude: number;
    visibility: string;
    groupId: string | null;
    frontendDuration: number;
  };
}

class PendingAIProcessor {
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private readonly POLL_INTERVAL = 30000; // Check every 30 seconds
  private readonly MAX_RETRIES = 3;

  constructor() {
    console.log('🤖 PENDING-AI-PROCESSOR: Initialized for automatic video processing');
    this.startMonitoring();
  }

  private startMonitoring(): void {
    console.log('🔄 PENDING-AI-PROCESSOR: Starting automatic monitoring for stuck videos');
    
    // Process immediately on startup with delay filter
    setTimeout(() => {
      this.processStuckVideos();
    }, 5000); // Wait 5 seconds after startup
    
    // Then poll every 60 seconds with time-based filtering
    this.processingInterval = setInterval(() => {
      this.processStuckVideos();
    }, 60000); // 60 seconds
    
    console.log(`✅ PENDING-AI-PROCESSOR: Monitoring enabled with 2-minute stuck video filter`);
  }

  private async processStuckVideos(): Promise<void> {
    if (this.isProcessing) {
      return; // Prevent overlapping processing
    }

    try {
      this.isProcessing = true;
      
      // Find videos stuck in pending_ai_analysis OR uploading status for more than 2 minutes
      // This prevents race conditions with newly uploaded videos
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      const stuckVideos = await db
        .select({
          id: videos.id,
          title: videos.title,
          description: videos.description,
          category: videos.category,
          latitude: videos.latitude,
          longitude: videos.longitude,
          visibility: videos.visibility,
          groupId: videos.groupId,
          duration: videos.duration,
          createdAt: videos.createdAt,
          processingStatus: videos.processingStatus
        })
        .from(videos)
        .where(sql`${videos.processingStatus} IN ('pending_ai_analysis', 'uploading') AND ${videos.createdAt} < ${twoMinutesAgo}`)
        .limit(5); // Process max 5 at a time to avoid overload

      // Find thread messages stuck in processing status
      const stuckThreadMessages = await db
        .select({
          id: threadMessages.id,
          threadId: threadMessages.threadId,
          userId: threadMessages.userId,
          duration: threadMessages.duration,
          createdAt: threadMessages.createdAt
        })
        .from(threadMessages)
        .where(eq(threadMessages.processingStatus, 'processing'))
        .limit(5);

      if (stuckVideos.length > 0) {
        console.log(`🔍 PENDING-AI-PROCESSOR: Found ${stuckVideos.length} videos stuck in AI analysis`);
        
        for (const video of stuckVideos) {
          await this.processStuckVideo(video);
        }
      }

      if (stuckThreadMessages.length > 0) {
        console.log(`🔍 PENDING-AI-PROCESSOR: Found ${stuckThreadMessages.length} thread messages stuck in processing`);
        
        for (const threadMessage of stuckThreadMessages) {
          await this.processStuckThreadMessage(threadMessage);
        }
      }

      if (stuckVideos.length === 0 && stuckThreadMessages.length === 0) {
        console.log('✅ PENDING-AI-PROCESSOR: No stuck content found - system healthy');
      }
      
    } catch (error) {
      console.error('❌ PENDING-AI-PROCESSOR: Error during monitoring:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processStuckThreadMessage(threadMessageData: any): Promise<void> {
    const messageId = threadMessageData.id;
    const tempFilePath = `./uploads/temp-uploads/${messageId}_reconstructed_thread-message-*.webm`;
    
    console.log(`🔧 PENDING-AI-PROCESSOR: Processing stuck thread message ${messageId}`);
    
    try {
      // Find the actual temp file (may have timestamp suffix)
      const fs = await import('fs/promises');
      const path = await import('node:path');
      const uploadDir = './uploads/temp-uploads/';
      
      let actualTempPath = '';
      try {
        const files = await fs.readdir(uploadDir);
        const matchingFile = files.find(file => 
          file.startsWith(`${messageId}_reconstructed_thread-message-`) && 
          file.endsWith('.webm')
        );
        
        if (matchingFile) {
          actualTempPath = path.join(uploadDir, matchingFile);
        } else {
          throw new Error(`No temp file found for thread message ${messageId}`);
        }
      } catch (fileError) {
        console.error(`❌ PENDING-AI-PROCESSOR: Could not find temp file for thread message ${messageId}`);
        await this.markThreadMessageAsFailed(messageId, 'Temp file not found for processing');
        return;
      }

      const metadata = {
        videoType: 'thread_message',
        messageId: messageId.toString(),
        threadId: threadMessageData.threadId,
        userId: threadMessageData.userId,
        frontendDuration: parseFloat(threadMessageData.duration) || 10
      };

      console.log(`🔧 PENDING-AI-PROCESSOR: Processing thread message ${messageId} with metadata:`, metadata);

      const result = await uploadFirstProcessor.processVideo(messageId, actualTempPath, metadata);
      
      if (result) {
        console.log(`✅ PENDING-AI-PROCESSOR: Successfully processed thread message ${messageId}`);
        
        // Clean up temp file
        try {
          await fs.unlink(actualTempPath);
          console.log(`🧹 PENDING-AI-PROCESSOR: Cleaned up temp file: ${actualTempPath}`);
        } catch (cleanupError) {
          console.log(`🧹 PENDING-AI-PROCESSOR: Temp file already cleaned: ${actualTempPath}`);
        }
      } else {
        console.error(`❌ PENDING-AI-PROCESSOR: Processing failed for thread message ${messageId}`);
      }
      
    } catch (error) {
      console.error(`❌ PENDING-AI-PROCESSOR: Error processing thread message ${messageId}:`, error);
      await this.markThreadMessageAsFailed(messageId, `Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async processStuckVideo(videoData: any): Promise<void> {
    const videoId = videoData.id;
    console.log(`🚀 PENDING-AI-PROCESSOR: Processing stuck video ${videoId} - "${videoData.title}"`);
    
    try {
      // Construct temp file path based on video ID
      const tempFilePath = `./uploads/temp-uploads/${videoId}_recorded-video.webm`;
      
      // Check if temp file exists (WebM first, then MP4)
      const fs = await import('fs/promises');
      let actualTempPath = tempFilePath;
      let needsPreprocessing = true;
      
      try {
        await fs.access(tempFilePath);
        console.log(`✅ PENDING-AI-PROCESSOR: Found WebM temp file: ${tempFilePath}`);
      } catch (webmError) {
        // Try MP4 version
        const mp4TempPath = tempFilePath.replace('_recorded-video.webm', '_XNXX_video_second_take_360p.mp4');
        try {
          await fs.access(mp4TempPath);
          actualTempPath = mp4TempPath;
          needsPreprocessing = false; // MP4 doesn't need preprocessing
          console.log(`✅ PENDING-AI-PROCESSOR: Found MP4 temp file: ${mp4TempPath}`);
        } catch (mp4Error) {
          console.error(`❌ PENDING-AI-PROCESSOR: No temp file found for ${videoId}`);
          await this.markVideoAsFailed(videoId, 'Video file was lost during upload - please try uploading again');
          return;
        }
      }
      
      const metadata = {
        title: videoData.title || 'Untitled',
        description: videoData.description || '',
        category: videoData.category || 'chat',
        latitude: videoData.latitude || 0,
        longitude: videoData.longitude || 0,
        visibility: videoData.visibility || 'everyone',
        groupId: videoData.groupId,
        frontendDuration: parseFloat(videoData.duration || '30')
      };
      
      console.log(`🎯 PENDING-AI-PROCESSOR: Processing with enhanced false positive protection`);
      
      // Process using uploadFirstProcessor with enhanced moderation
      const success = await uploadFirstProcessor.processVideo(
        videoId,
        actualTempPath,
        metadata,
        needsPreprocessing
      );
      
      if (success) {
        console.log(`✅ PENDING-AI-PROCESSOR: Successfully processed video ${videoId}`);
        
        // Cleanup temp file after successful processing
        try {
          await fs.unlink(actualTempPath);
          console.log(`🧹 PENDING-AI-PROCESSOR: Cleaned up temp file: ${actualTempPath}`);
        } catch (cleanupError) {
          console.log(`🧹 PENDING-AI-PROCESSOR: Temp file already cleaned: ${actualTempPath}`);
        }
      } else {
        console.error(`❌ PENDING-AI-PROCESSOR: Processing failed for video ${videoId}`);
      }
      
    } catch (error) {
      console.error(`❌ PENDING-AI-PROCESSOR: Error processing video ${videoId}:`, error);
      await this.markVideoAsFailed(videoId, `Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async markVideoAsFailed(videoId: string, reason: string): Promise<void> {
    try {
      await db.update(videos)
        .set({
          processingStatus: 'failed',
          isActive: false,
          flaggedReason: reason
        }as VideoUpdate)
        .where(eq(videos.id, videoId));
        
      console.log(`❌ PENDING-AI-PROCESSOR: Marked video ${videoId} as failed: ${reason}`);
    } catch (error) {
      console.error(`❌ PENDING-AI-PROCESSOR: Could not mark video ${videoId} as failed:`, error);
    }
  }

  private async markThreadMessageAsFailed(messageId: string, reason: string): Promise<void> {
    try {
      await db.update(threadMessages)
        .set({
          processingStatus: 'failed',
          flaggedReason: reason
        } as ThreadMsgUpdate)
        .where(eq(threadMessages.id, parseInt(messageId)));
        
      console.log(`❌ PENDING-AI-PROCESSOR: Marked thread message ${messageId} as failed: ${reason}`);
    } catch (error) {
      console.error(`❌ PENDING-AI-PROCESSOR: Could not mark thread message ${messageId} as failed:`, error);
    }
  }

  public stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('🛑 PENDING-AI-PROCESSOR: Monitoring stopped');
    }
  }

  public getStatus(): { isRunning: boolean, isProcessing: boolean } {
    return {
      isRunning: this.processingInterval !== null,
      isProcessing: this.isProcessing
    };
  }
}

// Export singleton instance
export const pendingAIProcessor = new PendingAIProcessor();