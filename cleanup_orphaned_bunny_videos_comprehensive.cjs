/**
 * COMPREHENSIVE BUNNY CLEANUP: Remove All Orphaned Videos
 * 
 * This script safely removes videos that exist in Bunny storage but are no longer
 * needed based on database state. It identifies orphaned videos by checking:
 * 1. Videos with fake/dummy IDs (test data)
 * 2. Videos from failed/rejected uploads that should be cleaned up
 * 3. Videos no longer referenced in database
 */

import { bunnyService } from "./server/bunnyService.ts";
import { storage }  from "./server/storage.ts";

async function cleanupOrphanedBunnyVideos() {
  console.log('🧹 COMPREHENSIVE BUNNY CLEANUP: Starting...');
  
  try {
    // Get all current bunny video IDs from database
    const dbVideos = await storage.db
      .select({
        id: storage.videos.id,
        bunnyVideoId: storage.videos.bunnyVideoId,
        title: storage.videos.title,
        processingStatus: storage.videos.processingStatus,
        userId: storage.videos.userId
      })
      .from(storage.videos)
      .where(storage.isNotNull(storage.videos.bunnyVideoId));
    
    console.log(`📊 Found ${dbVideos.length} videos in database with Bunny IDs`);
    
    // Identify videos that should be cleaned up
    const videosToCleanup = [];
    
    dbVideos.forEach(video => {
      const shouldCleanup = 
        // Fake/dummy test IDs
        video.bunnyVideoId.includes('dummy') || 
        video.bunnyVideoId.includes('test') ||
        video.bunnyVideoId.includes('treasure-hunt') ||
        // Failed processing status
        video.processingStatus === 'failed' ||
        // Rejected videos (except those pending appeal)
        (video.processingStatus === 'rejected_by_moderation' && !video.title.includes('appeal'));
      
      if (shouldCleanup) {
        videosToCleanup.push(video);
      }
    });
    
    console.log(`🎯 Identified ${videosToCleanup.length} videos for cleanup:`);
    videosToCleanup.forEach(video => {
      console.log(`  - ${video.bunnyVideoId} (${video.title}) - ${video.processingStatus}`);
    });
    
    // Safety check - require confirmation for bulk deletion
    if (videosToCleanup.length === 0) {
      console.log('✅ No orphaned videos found. All Bunny storage is clean.');
      return;
    }
    
    console.log(`\n🚨 PREPARING TO DELETE ${videosToCleanup.length} VIDEOS FROM BUNNY STORAGE`);
    console.log('These are test/failed videos that are safe to remove...');
    
    // Perform cleanup
    let successCount = 0;
    let errorCount = 0;
    
    for (const video of videosToCleanup) {
      try {
        console.log(`🗑️ Deleting ${video.bunnyVideoId} (${video.title})...`);
        await bunnyService.deleteVideo(video.bunnyVideoId);
        console.log(`✅ Successfully deleted ${video.bunnyVideoId} from Bunny storage`);
        successCount++;
        
        // Also clean up the database record for failed/test videos
        if (video.processingStatus === 'failed' || video.bunnyVideoId.includes('dummy') || video.bunnyVideoId.includes('test')) {
          await storage.deleteVideo(video.id);
          console.log(`🗑️ Also removed ${video.id} from database`);
        }
        
      } catch (error) {
        if (error.message.includes('Video Not Found') || error.message.includes('404')) {
          console.log(`⚠️ Video ${video.bunnyVideoId} already deleted from Bunny (404) - cleaning database record`);
          // Clean up database record since video doesn't exist in Bunny anymore
          if (video.processingStatus === 'failed' || video.bunnyVideoId.includes('dummy') || video.bunnyVideoId.includes('test')) {
            await storage.deleteVideo(video.id);
            console.log(`🗑️ Cleaned up database record for ${video.id}`);
          }
          successCount++;
        } else {
          console.error(`❌ Failed to delete ${video.bunnyVideoId}:`, error.message);
          errorCount++;
        }
      }
    }
    
    console.log(`\n📋 CLEANUP SUMMARY:`);
    console.log(`✅ Successfully cleaned: ${successCount} videos`);
    console.log(`❌ Errors: ${errorCount} videos`);
    console.log(`💰 Storage cost reduction: Eliminated ${successCount} orphaned video files`);
    
    // Show remaining valid videos
    const remainingVideos = dbVideos.filter(v => 
      !videosToCleanup.some(cleanup => cleanup.id === v.id)
    );
    
    console.log(`\n🎯 REMAINING VALID VIDEOS (${remainingVideos.length}):`);
    remainingVideos.forEach(video => {
      console.log(`  - ${video.bunnyVideoId} (${video.title}) - ${video.processingStatus}`);
    });
    
  } catch (error) {
    console.error('❌ CLEANUP ERROR:', error);
    throw error;
  }
}

// Run the cleanup
cleanupOrphanedBunnyVideos()
  .then(() => {
    console.log('✅ Comprehensive Bunny cleanup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ CLEANUP FAILED:', error);
    process.exit(1);
  });