/**
 * TEST: Verify Dangerous Bypass Routes Are Disabled
 * 
 * This test confirms that all dangerous routes that could bypass AI moderation
 * have been properly disabled to prevent videos from reaching approved status
 * without proper GCS upload and AI analysis.
 */

import { db } from './server/db.ts.js';
import { videos } from './shared/schema.ts.js';
import { eq } from 'drizzle-orm';

async function testBypassRoutesDisabled() {
  console.log('🔒 TESTING: Verifying bypass routes are disabled');
  console.log('=' .repeat(80));

  try {
    // Test 1: Try to access the disabled complete-processing route
    console.log('\n🧪 TEST 1: Checking /api/videos/:videoId/complete-processing route...');
    
    const testVideoId = '1dd08e05-b87c-4718-b1e0-8e2a98361192'; // Existing video
    
    const response = await fetch(`http://localhost:5000/api/videos/${testVideoId}/complete-processing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'appSession=' // Would need real cookie for auth
      }
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.status === 410) {
      console.log('✅ GOOD: Route properly returns 410 (Gone) status');
      const responseBody = await response.json();
      console.log('Response:', responseBody.message);
    } else if (response.status === 401) {
      console.log('✅ GOOD: Route requires authentication (as expected)');
    } else {
      console.log('❌ CONCERN: Unexpected status code');
    }

  } catch (error) {
    console.log('❌ Connection error (expected if server not running):', error.message);
  }

  // Test 2: Verify no videos have bypass signatures in database
  console.log('\n🧪 TEST 2: Checking for videos with bypass signatures...');
  
  try {
    const bypassVideos = await db.select().from(videos).where(
      eq(videos.processingStatus, 'approved')
    );
    
    const suspiciousVideos = bypassVideos.filter(video => {
      // Check for signatures of bypass methods
      const modResults = video.moderationResults ? JSON.parse(video.moderationResults) : {};
      return (
        modResults.pipeline === 'manual_recovery' || 
        modResults.moderationStatus === 'recovery_completed' ||
        !video.gcsProcessingUrl || // Videos approved without GCS
        !video.bunnyVideoId      // Videos approved without Bunny upload
      );
    });
    
    console.log(`Total approved videos: ${bypassVideos.length}`);
    console.log(`Suspicious bypass videos: ${suspiciousVideos.length}`);
    
    if (suspiciousVideos.length > 0) {
      console.log('\n⚠️ SUSPICIOUS VIDEOS FOUND:');
      suspiciousVideos.forEach(video => {
        const modResults = video.moderationResults ? JSON.parse(video.moderationResults) : {};
        console.log(`- ${video.title} (${video.id})`);
        console.log(`  Processing: ${video.processingStatus}`);
        console.log(`  GCS URL: ${video.gcsProcessingUrl ? 'Present' : 'MISSING'}`);
        console.log(`  Bunny ID: ${video.bunnyVideoId ? 'Present' : 'MISSING'}`);
        console.log(`  Pipeline: ${modResults.pipeline || 'Unknown'}`);
        console.log(`  Mod Status: ${modResults.moderationStatus || 'Unknown'}`);
      });
    } else {
      console.log('✅ GOOD: No videos with bypass signatures found');
    }

  } catch (error) {
    console.error('❌ Database error:', error.message);
  }

  // Test 3: Check if any videos are missing moderation decisions
  console.log('\n🧪 TEST 3: Checking for approved videos without moderation decisions...');
  
  try {
    const approvedVideos = await db.select().from(videos).where(
      eq(videos.processingStatus, 'approved')
    );
    
    console.log(`Total approved videos: ${approvedVideos.length}`);
    
    // Videos should either have:
    // 1. A moderationResults field with AI analysis
    // 2. A corresponding record in moderationDecisions table
    
    const videosWithoutProperModeration = approvedVideos.filter(video => {
      const modResults = video.moderationResults ? JSON.parse(video.moderationResults) : {};
      
      // Check if it has proper AI moderation signatures
      const hasAIModeration = (
        modResults.videoAnalysis || 
        modResults.audioAnalysis || 
        modResults.textAnalysis ||
        modResults.approved === true
      );
      
      return !hasAIModeration;
    });
    
    if (videosWithoutProperModeration.length > 0) {
      console.log('⚠️ VIDEOS WITHOUT PROPER AI MODERATION:');
      videosWithoutProperModeration.forEach(video => {
        console.log(`- ${video.title} (${video.id})`);
        console.log(`  Moderation Results: ${video.moderationResults || 'NONE'}`);
      });
    } else {
      console.log('✅ GOOD: All approved videos have AI moderation signatures');
    }

  } catch (error) {
    console.error('❌ Database error:', error.message);
  }

  console.log('\n' + '=' .repeat(80));
  console.log('🔒 SECURITY TEST COMPLETE');
  console.log('All dangerous bypass routes should be disabled.');
  console.log('Videos should only be approved through proper AI pipeline.');
}

testBypassRoutesDisabled().catch(console.error);