/**
 * TEST: Profile Stats Calculation
 * 
 * This script tests the new stats calculation system to ensure:
 * 1. Collectors count (users following this user)
 * 2. Collecting count (users this user is following)  
 * 3. Likes count (total likes on this user's videos)
 */

import { db } from './server/db.js.js';
import { userFollows, videoLikes, videos } from './shared/schema.js.js';
import { eq, sql } from 'drizzle-orm';

async function testProfileStatsCalculation() {
  try {
    const targetUserId = "google-oauth2|117032826996185616207";
    console.log(`\n📊 Testing profile stats calculation for user: ${targetUserId}`);
    
    // Test 1: Get collectors count (how many users are following this user)
    console.log('\n1️⃣ Testing collectors count...');
    const collectorsCount = await db
      .select({ count: sql`count(*)` })
      .from(userFollows)
      .where(eq(userFollows.followingId, targetUserId));
    
    console.log('Collectors count result:', collectorsCount);
    console.log('Collectors count value:', Number(collectorsCount[0]?.count || 0));
    
    // Test 2: Get collecting count (how many users this user is following)
    console.log('\n2️⃣ Testing collecting count...');
    const collectingCount = await db
      .select({ count: sql`count(*)` })
      .from(userFollows)
      .where(eq(userFollows.followerId, targetUserId));
    
    console.log('Collecting count result:', collectingCount);
    console.log('Collecting count value:', Number(collectingCount[0]?.count || 0));
    
    // Test 3: Get likes count (total likes on all this user's videos)
    console.log('\n3️⃣ Testing likes count...');
    const likesCount = await db
      .select({ count: sql`count(*)` })
      .from(videoLikes)
      .innerJoin(videos, eq(videoLikes.videoId, videos.id))
      .where(eq(videos.userId, targetUserId));
    
    console.log('Likes count result:', likesCount);
    console.log('Likes count value:', Number(likesCount[0]?.count || 0));
    
    // Test 4: Get actual likes data to verify
    console.log('\n4️⃣ Getting detailed likes data...');
    const actualLikes = await db
      .select({
        videoId: videos.id,
        videoTitle: videos.title,
        likerUserId: videoLikes.userId
      })
      .from(videoLikes)
      .innerJoin(videos, eq(videoLikes.videoId, videos.id))
      .where(eq(videos.userId, targetUserId));
    
    console.log('Detailed likes data:', actualLikes);
    
    // Summary
    const stats = {
      collectorsCount: Number(collectorsCount[0]?.count || 0),
      collectingCount: Number(collectingCount[0]?.count || 0), 
      likesCount: Number(likesCount[0]?.count || 0)
    };
    
    console.log('\n✅ Final calculated stats:', stats);
    
    if (stats.likesCount > 0) {
      console.log('🎉 SUCCESS: Like count is working! Found', stats.likesCount, 'likes');
    } else {
      console.log('⚠️  WARNING: No likes found for this user');
    }
    
  } catch (error) {
    console.error('❌ Error testing profile stats:', error);
  }
}

testProfileStatsCalculation();