/**
 * DIRECT BUNNY CLEANUP
 * 
 * This script directly queries database and Bunny storage to clean up orphaned videos
 */

import { db } from './server/db.ts.js';
import { videos, threadMessages, videoComments } from './shared/schema.ts.js';
import { isNotNull } from 'drizzle-orm';

async function getAllLegitimateVideoIds() {
  console.log('📊 Getting all legitimate Bunny video IDs from database...');
  
  const legitimateIds = new Set();
  
  // 1. Main videos
  const mainVideos = await db
    .select({ bunnyVideoId: videos.bunnyVideoId })
    .from(videos)
    .where(isNotNull(videos.bunnyVideoId));
  
  mainVideos.forEach(video => {
    if (video.bunnyVideoId) legitimateIds.add(video.bunnyVideoId);
  });
  console.log(`✅ Found ${mainVideos.length} main videos`);
  
  // 2. Thread message videos
  const threadVideos = await db
    .select({ bunnyVideoId: threadMessages.bunnyVideoId })
    .from(threadMessages)
    .where(isNotNull(threadMessages.bunnyVideoId));
  
  threadVideos.forEach(video => {
    if (video.bunnyVideoId) legitimateIds.add(video.bunnyVideoId);
  });
  console.log(`✅ Found ${threadVideos.length} thread videos`);
  
  // 3. Video comment videos
  const commentVideos = await db
    .select({ bunnyVideoId: videoComments.bunnyVideoId })
    .from(videoComments)
    .where(isNotNull(videoComments.bunnyVideoId));
  
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

async function deleteVideo(videoId) {
  try {
    const response = await fetch(`https://video.bunnycdn.com/library/450591/videos/${videoId}`, {
      method: 'DELETE',
      headers: {
        'AccessKey': process.env.BUNNY_API_KEY || ''
      }
    });
    
    if (response.ok) {
      return true;
    } else if (response.status === 404) {
      return 'already_deleted';
    } else {
      throw new Error(`Delete failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    throw error;
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
    orphanedVideos.slice(0, 10).forEach((id, index) => {
      console.log(`  ${index + 1}. ${id}`);
    });
    if (orphanedVideos.length > 10) {
      console.log(`  ... and ${orphanedVideos.length - 10} more`);
    }
    
    // Delete orphaned videos
    console.log(`\n🗑️ DELETING ${orphanedVideos.length} ORPHANED VIDEOS...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const videoId of orphanedVideos) {
      try {
        console.log(`🗑️ Deleting ${videoId}...`);
        const result = await deleteVideo(videoId);
        
        if (result === true) {
          console.log(`✅ Successfully deleted ${videoId}`);
          successCount++;
        } else if (result === 'already_deleted') {
          console.log(`⚠️ Video ${videoId} already deleted (404)`);
          successCount++; // Count as success since it's already gone
        }
      } catch (error) {
        console.error(`❌ Failed to delete ${videoId}:`, error.message);
        errorCount++;
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