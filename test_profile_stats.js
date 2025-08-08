/**
 * TEST: Profile Stats Calculation
 * 
 * This script tests the updated profile stats to see if likes count
 * includes user's own likes on their videos.
 */

import { DatabaseStorage } from './server/storage.js.js';

async function testProfileStats() {
  const storage = new DatabaseStorage();
  const userId = 'google-oauth2|117032826996185616207';
  
  try {
    console.log('🔍 Testing profile stats for user:', userId);
    
    // Get user stats using the same method as profile endpoint
    const userStats = await storage.getUserStats(userId);
    console.log('📊 User stats from getUserStats:', userStats);
    
    // Get user's videos to see likes
    const userVideos = await storage.getVideosByUserWithProcessing(userId, true);
    console.log('🎬 User videos count:', userVideos.length);
    
    let totalLikes = 0;
    userVideos.forEach((video, index) => {
      console.log(`Video ${index + 1}: "${video.title}" - ${video.likes} likes (status: ${video.processingStatus})`);
      totalLikes += video.likes || 0;
    });
    
    console.log('🔢 Total likes calculated manually:', totalLikes);
    console.log('🔢 Likes from getUserStats:', userStats.likes);
    console.log('✅ Match?', totalLikes === userStats.likes);
    
    // Check videoLikes table to see individual likes
    console.log('\n🔍 Checking videoLikes table...');
    const { db } = await import('./server/db.js');
    const { videoLikes, videos } = await import('./shared/schema.js');
    const { eq, and } = await import('drizzle-orm');
    
    // Get all likes on this user's videos
    const likesOnUserVideos = await db
      .select()
      .from(videoLikes)
      .innerJoin(videos, eq(videoLikes.videoId, videos.id))
      .where(eq(videos.userId, userId));
    
    console.log('❤️ Individual likes on user videos:', likesOnUserVideos.length);
    likesOnUserVideos.forEach((like, index) => {
      console.log(`Like ${index + 1}: User ${like.video_likes.userId} liked video "${like.videos.title}"`);
    });
    
  } catch (error) {
    console.error('❌ Error testing profile stats:', error);
  }
}

testProfileStats();