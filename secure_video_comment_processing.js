/**
 * SECURE VIDEO COMMENT PROCESSING: Manual AI Moderation Pipeline
 * 
 * This processes the stuck video comment through the complete security workflow:
 * 1. Upload to GCS
 * 2. AI moderation analysis
 * 3. Create moderation decision
 * 4. Conditional approval based on AI results
 */

import { db } from './server/db.js.js';
import { videoComments, videos, moderationDecisions } from './shared/schema.js.js';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import * as path from "node:path";
import { v4 as uuidv4 } from 'uuid';

async function secureVideoCommentProcessing() {
  console.log('🔒 SECURE VIDEO COMMENT PROCESSING: Starting complete AI moderation pipeline...');
  
  try {
    const comment = await db
      .select()
      .from(videoComments)
      .where(eq(videoComments.id, 47))
      .limit(1);
    
    if (comment.length === 0) {
      console.log('❌ Video comment not found');
      return;
    }
    
    const videoComment = comment[0];
    console.log('🎬 Processing comment through AI moderation:', {
      id: videoComment.id,
      videoId: videoComment.videoId,
      status: videoComment.processingStatus
    });
    
    // Step 1: Upload to GCS and create a corresponding video record
    console.log('📤 Step 1: Creating video record for AI processing...');
    
    // Create a video record for processing (video comments need video records for AI pipeline)
    const processingVideoId = uuidv4();
    const videoRecord = await db.insert(videos).values({
      id: processingVideoId,
      userId: videoComment.userId,
      title: `Video Comment Processing`,
      description: null,
      category: 'video_comment',
      videoUrl: '',
      processingStatus: 'pending_ai_analysis',
      duration: videoComment.duration,
      // Add required fields with defaults
      latitude: null,
      longitude: null,
      thumbnailUrl: null,
      views: 0,
      likes: 0,
      questId: null,
      playbackStatus: 'ready',
      gcsProcessingUrl: null,
      bunnyVideoId: null,
      bunnyStoragePath: null,
      bunnyReviewVideoId: null,
      transcriptionText: null,
      extractedKeywords: null,
      processingMetadata: null,
      videoFlagReason: null,
      audioFlagReason: null,
      thumbnailPath: null,
      groupName: null,
      eventStartDate: null,
      eventEndDate: null,
      eventStartTime: null,
      eventEndTime: null
    }).returning();
    
    console.log('✅ Created video record for processing:', videoRecord[0].id);
    
    // Step 2: Copy the temp file to match the video ID
    const tempFile = path.join('./uploads/temp-uploads/', '47_recorded-video.webm');
    const processingFile = path.join('./uploads/temp-uploads/', `${videoRecord[0].id}_recorded-video.webm`);
    
    if (fs.existsSync(tempFile)) {
      fs.copyFileSync(tempFile, processingFile);
      console.log('📁 Copied file for processing:', processingFile);
    } else {
      console.log('❌ Original temp file not found:', tempFile);
      return;
    }
    
    // Step 3: Process through AI moderation pipeline
    console.log('🤖 Step 3: Running AI moderation analysis...');
    
    const { UploadFirstProcessor } = await import('./server/uploadFirstProcessor.js');
    const processor = new UploadFirstProcessor();
    
    // Process the video through complete AI pipeline
    await processor.processVideo(videoRecord[0].id);
    
    // Step 4: Check the processing result
    const processedVideo = await db
      .select()
      .from(videos)
      .where(eq(videos.id, videoRecord[0].id))
      .limit(1);
    
    if (processedVideo.length === 0) {
      console.log('❌ Processed video record not found');
      return;
    }
    
    const result = processedVideo[0];
    console.log('🔍 AI processing result:', {
      status: result.processingStatus,
      bunnyVideoId: result.bunnyVideoId,
      flagReason: result.videoFlagReason || result.audioFlagReason
    });
    
    // Step 5: Update video comment based on AI decision
    if (result.processingStatus === 'approved' && result.bunnyVideoId) {
      // AI approved - update video comment
      await db
        .update(videoComments)
        .set({
          processingStatus: 'approved',
          bunnyVideoId: result.bunnyVideoId,
          updatedAt: new Date()
        })
        .where(eq(videoComments.id, 47));
      
      console.log('✅ SECURITY VERIFIED: Video comment approved after AI analysis');
      console.log('🛡️ AI moderation passed - video comment is now live');
      
    } else {
      // AI rejected - mark as failed
      const rejectionReason = result.videoFlagReason || result.audioFlagReason || 'AI moderation failed';
      
      await db
        .update(videoComments)
        .set({
          processingStatus: 'failed',
          updatedAt: new Date()
        })
        .where(eq(videoComments.id, 47));
      
      console.log('🚫 SECURITY ENFORCED: Video comment rejected by AI');
      console.log('🛡️ Rejection reason:', rejectionReason);
    }
    
    // Step 6: Clean up temporary video record
    await db
      .delete(videos)
      .where(eq(videos.id, videoRecord[0].id));
    
    console.log('🧹 Cleaned up temporary processing record');
    
    // Clean up temp files
    if (fs.existsSync(processingFile)) {
      fs.unlinkSync(processingFile);
    }
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    
    console.log('✅ SECURE PROCESSING COMPLETE: Video comment processed through full AI pipeline');
    
  } catch (error) {
    console.error('❌ Secure processing failed:', error);
    
    // On any error, mark as failed to maintain security
    try {
      await db
        .update(videoComments)
        .set({
          processingStatus: 'failed',
          updatedAt: new Date()
        })
        .where(eq(videoComments.id, 47));
      console.log('🔒 FAIL-SAFE: Video comment marked as failed due to processing error');
    } catch (dbError) {
      console.error('❌ Failed to update status:', dbError);
    }
  }
}

secureVideoCommentProcessing().then(() => {
  console.log('🎯 Secure video comment processing completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});