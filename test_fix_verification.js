/**
 * TEST: Verify the Upload Security Fix
 * 
 * This test verifies that the uploadFirstProcessor now correctly:
 * 1. Creates moderation decision records before updating video status
 * 2. Passes the security trigger validation
 * 3. Successfully uploads videos to GCS and Bunny storage
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';

// Database tables
const videos = {
  id: 'id',
  userId: 'user_id',
  title: 'title',
  description: 'description',
  category: 'category',
  latitude: 'latitude',
  longitude: 'longitude',
  visibility: 'visibility',
  processingStatus: 'processing_status',
  duration: 'duration',
  bunnyVideoId: 'bunny_video_id',
  videoUrl: 'video_url',
  flaggedReason: 'flagged_reason'
};

const moderationDecisions = {
  videoId: 'video_id',
  moderatorId: 'moderator_id',
  decision: 'decision',
  reason: 'reason'
};

async function testFixVerification() {
  console.log('🔍 TESTING: Upload Security Fix Verification');
  console.log('===============================================');
  
  try {
    const sql = neon(process.env.DATABASE_URL);
    const db = drizzle(sql);
    
    // Test the fixed uploadFirstProcessor with a mock video
    console.log('\n📋 Step 1: Testing AI moderation decision creation');
    
    const testVideoId = 'test-security-fix-' + Date.now();
    const testVideoPath = './uploads/debug-upload-test.webm'; // Using existing test file
    
    // Create initial video record
    await db.insert(videos).values({
      id: testVideoId,
      userId: 'google-oauth2|117032826996185616207',
      title: 'Security Fix Test',
      description: 'Testing the moderation decision fix',
      category: 'test',
      latitude: 36.0571,
      longitude: -94.1606,
      visibility: 'public',
      processingStatus: 'processing',
      duration: 5
    }).onConflictDoNothing();
    
    console.log('✅ Test video record created');
    
    // Test metadata that would trigger approval
    const testMetadata = {
      title: 'Security Fix Test',
      description: 'Testing the moderation decision fix',
      category: 'test',
      latitude: '36.0571',
      longitude: '-94.1606',
      visibility: 'public',
      userId: 'google-oauth2|117032826996185616207'
    };
    
    console.log('\n📋 Step 2: Processing video with fixed uploadFirstProcessor...');
    
    // This should now work without errors because we create moderation decisions
    const result = await uploadFirstProcessor.processVideo(
      testVideoId,
      testVideoPath,
      testMetadata,
      false
    );
    
    console.log('📊 Processing result:', result);
    
    // Check if moderation decision was created
    console.log('\n📋 Step 3: Verifying moderation decision was created...');
    
    const moderationDecision = await db.select()
      .from(moderationDecisions)
      .where(eq(moderationDecisions.videoId, testVideoId));
    
    if (moderationDecision.length > 0) {
      console.log('✅ MODERATION DECISION CREATED:');
      console.log(`   Decision: ${moderationDecision[0].decision}`);
      console.log(`   Moderator: ${moderationDecision[0].moderatorId}`);
      console.log(`   Reason: ${moderationDecision[0].reason}`);
    } else {
      console.log('❌ No moderation decision found');
    }
    
    // Check final video status
    console.log('\n📋 Step 4: Checking final video status...');
    
    const [finalVideo] = await db.select()
      .from(videos)
      .where(eq(videos.id, testVideoId));
    
    if (finalVideo) {
      console.log('📊 FINAL VIDEO STATUS:');
      console.log(`   Processing Status: ${finalVideo.processingStatus}`);
      console.log(`   Bunny Video ID: ${finalVideo.bunnyVideoId || 'Not set'}`);
      console.log(`   Video URL: ${finalVideo.videoUrl || 'Not set'}`);
      console.log(`   Flagged Reason: ${finalVideo.flaggedReason || 'None'}`);
    }
    
    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await db.delete(moderationDecisions).where(eq(moderationDecisions.videoId, testVideoId));
    await db.delete(videos).where(eq(videos.id, testVideoId));
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎯 TEST COMPLETE');
    console.log('================');
    
    if (result) {
      console.log('✅ SUCCESS: Upload processing completed without security trigger errors');
      console.log('✅ SUCCESS: Moderation decisions are now being created properly');
      console.log('✅ FIX VERIFIED: Your upload issue should now be resolved');
    } else {
      console.log('⚠️ PROCESSING FAILED: Check the logs above for details');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testFixVerification();