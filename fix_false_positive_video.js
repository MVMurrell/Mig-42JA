/**
 * FIX FALSE POSITIVE VIDEO: Reprocess incorrectly rejected video
 * 
 * This script reprocesses your "hello there" video that was incorrectly
 * flagged as inappropriate by the overly strict AI moderation system.
 */

import { db } from './server/db.js.js';
import { videos } from './shared/schema.js.js';
import { eq } from 'drizzle-orm';

async function fixFalsePositiveVideo() {
  try {
    const videoId = '85876621-cbbe-4bcc-800c-0af37ac20f9b';
    console.log('🔄 FIX: Reprocessing false positive video:', videoId);
    
    // Get the video record
    const video = await db.select()
      .from(videos)
      .where(eq(videos.id, videoId))
      .limit(1);
    
    if (video.length === 0) {
      console.log('❌ FIX: Video not found');
      return;
    }
    
    const videoRecord = video[0];
    console.log('📋 FIX: Video details:', {
      title: videoRecord.title,
      currentStatus: videoRecord.processingStatus,
      flaggedReason: videoRecord.flaggedReason,
      gcsUrl: videoRecord.gcsProcessingUrl
    });
    
    if (!videoRecord.gcsProcessingUrl) {
      console.log('❌ FIX: No GCS URL found - video did not reach storage');
      return;
    }
    
    console.log('🤖 FIX: Starting reprocessing with fixed AI moderation thresholds...');
    
    // Import and run the fixed uploadFirstProcessor
    const { uploadFirstProcessor } = await import('./server/uploadFirstProcessor.js');
    
    // Prepare metadata for reprocessing
    const metadata = {
      videoType: 'regular',
      title: videoRecord.title,
      category: videoRecord.category,
      duration: parseFloat(videoRecord.duration || '0'),
      visibility: videoRecord.visibility,
      latitude: videoRecord.latitude,
      longitude: videoRecord.longitude,
      userId: videoRecord.userId
    };
    
    console.log('🚀 FIX: Running AI moderation with reduced false positive sensitivity...');
    
    // Run just the AI moderation part with the fixed thresholds
    const moderationResult = await uploadFirstProcessor.runAIModeration(
      videoId, 
      videoRecord.gcsProcessingUrl
    );
    
    console.log('📊 FIX: AI moderation result:', {
      approved: moderationResult.approved,
      flagReason: moderationResult.flagReason,
      videoModeration: moderationResult.videoModeration,
      audioModeration: moderationResult.audioModeration
    });
    
    if (moderationResult.approved) {
      console.log('✅ FIX: Video now APPROVED with fixed AI moderation!');
      
      // Update video status to approved
      await db.update(videos)
        .set({
          processingStatus: 'approved',
          flaggedReason: null
        })
        .where(eq(videos.id, videoId));
      
      console.log('✅ FIX: Database updated - video status changed to approved');
      console.log('🎉 FIX: Your "hello there" video is now properly approved and should appear in your profile');
      
    } else {
      console.log('❌ FIX: Video still rejected even with reduced sensitivity');
      console.log('🔍 FIX: Reason:', moderationResult.flagReason);
      console.log('💡 FIX: May need manual review or further threshold adjustment');
    }
    
  } catch (error) {
    console.error('❌ FIX ERROR:', error);
  }
}

// Run the fix
fixFalsePositiveVideo();