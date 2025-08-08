/**
 * SECURE VIDEO COMMENT PROCESSING: Complete AI Moderation Pipeline
 * 
 * This script processes the video comment through the full security pipeline:
 * 1. Upload to GCS storage
 * 2. Complete AI moderation analysis
 * 3. Only approve if AI analysis passes
 * 4. Upload to Bunny CDN for delivery
 */

import { db } from './server/db.js.js';
import { videoComments } from './shared/schema.js.js';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import * as path from "node:path";

async function processVideoCommentSecurely() {
  console.log('🔒 Starting SECURE video comment processing with full AI moderation...');
  
  try {
    // Get the video comment that needs processing
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
    console.log('🎬 Processing comment:', {
      id: videoComment.id,
      videoId: videoComment.videoId,
      status: videoComment.processingStatus,
      duration: videoComment.duration
    });
    
    if (videoComment.processingStatus !== 'processing') {
      console.log('⚠️ Comment is not in processing status, updating...');
      await db
        .update(videoComments)
        .set({ processingStatus: 'processing' })
        .where(eq(videoComments.id, 47));
    }
    
    // Check if the properly named file exists
    const videoFile = path.join('./uploads/temp-uploads/', '47_recorded-video.webm');
    
    if (!fs.existsSync(videoFile)) {
      console.log('❌ Video file not found:', videoFile);
      return;
    }
    
    console.log('✅ Found video file:', videoFile);
    console.log('📁 File size:', fs.statSync(videoFile).size, 'bytes');
    
    // Import and use the Upload First Processor with proper video ID
    const { UploadFirstProcessor } = await import('./server/uploadFirstProcessor.js');
    const processor = new UploadFirstProcessor();
    
    console.log('🔒 Starting SECURE processing pipeline: tmp → GCS → AI Analysis → Bunny (if approved)');
    
    // Process the video through the complete security pipeline
    // The processor will handle: GCS upload, AI moderation, and conditional Bunny upload
    await processor.processVideo(videoComment.id);
    
    console.log('✅ Video comment processed through complete AI moderation pipeline!');
    console.log('🛡️ Security verification: Video has been analyzed by AI before any approval');
    
  } catch (error) {
    console.error('❌ Error during secure processing:', error);
    
    // On error, mark as failed (not approved) to maintain security
    try {
      await db
        .update(videoComments)
        .set({ 
          processingStatus: 'failed',
          updatedAt: new Date()
        })
        .where(eq(videoComments.id, 47));
      console.log('🔒 Security measure: Video comment marked as failed due to processing error');
    } catch (dbError) {
      console.error('❌ Failed to update status:', dbError);
    }
  }
}

processVideoCommentSecurely().then(() => {
  console.log('🎯 Secure video comment processing completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});