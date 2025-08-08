/**
 * COMPREHENSIVE BUNNY ORPHAN CLEANUP
 * 
 * This script:
 * 1. Gets all legitimate Bunny video IDs from the database
 * 2. Fetches all videos from Bunny storage
 * 3. Identifies orphaned videos (in Bunny but not in database)
 * 4. Deletes orphaned videos to reduce storage costs
 */

import { bunnyService } from './server/bunnyService.ts.js';
import { storage } from './server/storage.ts.js';
import { db } from './server/db.ts.js';

async function getAllLegitimateVideoIds() {
  console.log('📊 Getting all legitimate Bunny video IDs from database...');
  
  const legitimateIds = new Set();
  
  // 1. Main videos
  const mainVideos = await db
    .select({ bunnyVideoId: storage.videos.bunnyVideoId })
    .from(storage.videos)
    .where(storage.isNotNull(storage.videos.bunnyVideoId));
  
  mainVideos.forEach(video => {
    if (video.bunnyVideoId) legitimateIds.add(video.bunnyVideoId);
  });
  console.log(`✅ Found ${mainVideos.length} main videos`);
  
  // 2. Thread message videos
  const threadVideos = await db
    .select({ bunnyVideoId: storage.threadMessages.bunnyVideoId })
    .from(storage.threadMessages)
    .where(storage.isNotNull(storage.threadMessages.bunnyVideoId));
  
  threadVideos.forEach(video => {
    if (video.bunnyVideoId) legitimateIds.add(video.bunnyVideoId);
  });
  console.log(`✅ Found ${threadVideos.length} thread videos`);
  
  // 3. Video comment videos
  const commentVideos = await db
    .select({ bunnyVideoId: storage.videoComments.bunnyVideoId })
    .from(storage.videoComments)
    .where(storage.isNotNull(storage.videoComments.bunnyVideoId));
  
  commentVideos.forEach(video => {
    if (video.bunnyVideoId) legitimateIds.add(video.bunnyVideoId);
  });
  console.log(`✅ Found ${commentVideos.length} comment videos`);
  
  console.log(`📋 Total legitimate videos in database: ${legitimateIds.size}`);
  return legitimateIds;
}

async function getAllBunnyVideos() {
  console.log('🐰 Fetching all videos from Bunny storage...');
  
  try {
    const response = await fetch(`https://video.bunnycdn.com/library/450591/videos?page=1&itemsPerPage=100`, {
      headers: {
        'AccessKey': process.env.BUNNY_API_KEY || ''
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Bunny videos: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const bunnyVideoIds = data.items?.map(video => video.guid) || [];
    
    console.log(`📊 Found ${bunnyVideoIds.length} videos in Bunny storage`);
    return bunnyVideoIds;
  } catch (error) {
    console.error('❌ Failed to fetch Bunny videos:', error);
    return [];
  }
}

async function cleanupOrphanedBunnyVideos() {
  console.log('🧹 COMPREHENSIVE BUNNY CLEANUP: Starting...');
  
  try {
    // Get legitimate video IDs from database
    const legitimateIds = await getAllLegitimateVideoIds();
    
    // Get all videos from Bunny storage
    const bunnyVideoIds = await getAllBunnyVideos();
    
    if (bunnyVideoIds.length === 0) {
      console.log('⚠️ Could not fetch videos from Bunny storage');
      return;
    }
    
    // Find orphaned videos
    const orphanedVideos = bunnyVideoIds.filter(id => !legitimateIds.has(id));
    
    console.log(`\n📋 ANALYSIS:`);
    console.log(`📊 Videos in Bunny storage: ${bunnyVideoIds.length}`);
    console.log(`✅ Legitimate videos in database: ${legitimateIds.size}`);
    console.log(`🗑️ Orphaned videos to delete: ${orphanedVideos.length}`);
    
    if (orphanedVideos.length === 0) {
      console.log('✅ No orphaned videos found. Bunny storage is clean!');
      return;
    }
    
    console.log(`\n🚨 ORPHANED VIDEOS TO DELETE:`);
    orphanedVideos.forEach((id, index) => {
      console.log(`  ${index + 1}. ${id}`);
    });
    
    // Delete orphaned videos
    console.log(`\n🗑️ DELETING ${orphanedVideos.length} ORPHANED VIDEOS...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const videoId of orphanedVideos) {
      try {
        console.log(`🗑️ Deleting ${videoId}...`);
        await bunnyService.deleteVideo(videoId);
        console.log(`✅ Successfully deleted ${videoId}`);
        successCount++;
      } catch (error) {
        if (error.message.includes('Video Not Found') || error.message.includes('404')) {
          console.log(`⚠️ Video ${videoId} already deleted (404)`);
          successCount++; // Count as success since it's already gone
        } else {
          console.error(`❌ Failed to delete ${videoId}:`, error.message);
          errorCount++;
        }
      }
    }
    
    console.log(`\n📋 CLEANUP SUMMARY:`);
    console.log(`✅ Successfully cleaned: ${successCount} videos`);
    console.log(`❌ Errors: ${errorCount} videos`);
    console.log(`💰 Storage cost reduction: Eliminated ${successCount} orphaned video files`);
    console.log(`📊 Expected final Bunny storage count: ${bunnyVideoIds.length - successCount} videos`);
    
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