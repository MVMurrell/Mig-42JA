/**
 * TEST: Secure Upload Pipeline Validation
 * 
 * This test verifies the critical security requirements:
 * 1. ALL videos MUST go to GCS first
 * 2. ALL videos MUST get AI moderation decision
 * 3. ALL videos go to Bunny only AFTER AI decision
 * 4. NO video can bypass GCS → AI → Bunny pipeline
 */

import { db } from './server/db.ts.js';
import { videos } from './shared/schema.ts.js';
import { eq } from 'drizzle-orm';

async function testSecureUploadPipeline() {
  console.log('🔒 SECURITY TEST: Validating secure upload pipeline...');
  
  try {
    // Check all videos in database for security compliance
    console.log('\n📊 SECURITY AUDIT: Checking all videos for compliance...');
    
    const allVideos = await db.select().from(videos).orderBy(videos.createdAt);
    
    console.log(`📊 Total videos in database: ${allVideos.length}`);
    
    let compliantVideos = 0;
    let nonCompliantVideos = 0;
    let securityViolations = [];
    
    for (const video of allVideos) {
      console.log(`\n🔍 Checking video: ${video.id} - "${video.title}"`);
      
      // Security Check 1: Must have processing status (AI decision)
      if (!video.processingStatus) {
        securityViolations.push({
          videoId: video.id,
          violation: 'MISSING_AI_DECISION',
          description: 'Video has no processing status (no AI moderation decision)'
        });
        console.log(`  ❌ VIOLATION: Missing processing status`);
        nonCompliantVideos++;
        continue;
      }
      
      // Security Check 2: If has Bunny ID, must have AI decision
      if (video.bunnyVideoId && !['approved', 'rejected_by_ai', 'flagged'].includes(video.processingStatus)) {
        securityViolations.push({
          videoId: video.id,
          violation: 'BUNNY_WITHOUT_AI_DECISION',
          description: `Video in Bunny storage without valid AI decision (status: ${video.processingStatus})`
        });
        console.log(`  ❌ VIOLATION: In Bunny without proper AI decision`);
        nonCompliantVideos++;
        continue;
      }
      
      // Security Check 3: Must have GCS processing URL if processed
      if (video.processingStatus !== 'pending' && !video.gcsProcessingUrl) {
        securityViolations.push({
          videoId: video.id,
          violation: 'MISSING_GCS_PROCESSING',
          description: 'Video processed without GCS upload record'
        });
        console.log(`  ❌ VIOLATION: Processed without GCS record`);
        nonCompliantVideos++;
        continue;
      }
      
      // Security Check 4: Rejected videos should not be active
      if (video.processingStatus === 'rejected_by_ai' && video.isActive) {
        securityViolations.push({
          videoId: video.id,
          violation: 'REJECTED_VIDEO_ACTIVE',
          description: 'AI-rejected video is marked as active'
        });
        console.log(`  ❌ VIOLATION: Rejected video is active`);
        nonCompliantVideos++;
        continue;
      }
      
      console.log(`  ✅ COMPLIANT: Status ${video.processingStatus}, Active: ${video.isActive}`);
      compliantVideos++;
    }
    
    // Summary Report
    console.log('\n📋 SECURITY AUDIT SUMMARY:');
    console.log(`✅ Compliant videos: ${compliantVideos}`);
    console.log(`❌ Non-compliant videos: ${nonCompliantVideos}`);
    console.log(`🔒 Security violations found: ${securityViolations.length}`);
    
    if (securityViolations.length > 0) {
      console.log('\n🚨 SECURITY VIOLATIONS DETECTED:');
      securityViolations.forEach((violation, index) => {
        console.log(`${index + 1}. Video ${violation.videoId}:`);
        console.log(`   Type: ${violation.violation}`);
        console.log(`   Details: ${violation.description}`);
      });
      
      console.log('\n⚠️ RECOMMENDATION: Review and fix security violations before deployment');
    } else {
      console.log('\n🎉 ALL VIDEOS COMPLY WITH SECURITY REQUIREMENTS');
    }
    
    // Test the latest video specifically
    const latestVideo = allVideos[allVideos.length - 1];
    if (latestVideo) {
      console.log(`\n🔍 LATEST VIDEO ANALYSIS: ${latestVideo.id}`);
      console.log(`Processing Status: ${latestVideo.processingStatus}`);
      console.log(`Has Bunny ID: ${!!latestVideo.bunnyVideoId}`);
      console.log(`Has GCS URL: ${!!latestVideo.gcsProcessingUrl}`);
      console.log(`Is Active: ${latestVideo.isActive}`);
      console.log(`Flagged Reason: ${latestVideo.flaggedReason || 'None'}`);
      
      if (latestVideo.moderationResults) {
        try {
          const modResults = JSON.parse(latestVideo.moderationResults);
          console.log(`AI Decision: ${modResults.approved ? 'APPROVED' : 'REJECTED'}`);
          console.log(`Video Moderation: ${modResults.videoModeration}`);
          console.log(`Audio Moderation: ${modResults.audioModeration}`);
        } catch (e) {
          console.log('Moderation results could not be parsed');
        }
      }
    }
    
    // Validate pipeline integrity
    console.log('\n🛡️ PIPELINE INTEGRITY CHECK:');
    
    const videosWithBunnyButNoGcs = allVideos.filter(v => 
      v.bunnyVideoId && !v.gcsProcessingUrl
    );
    
    const videosWithBunnyButNoAiDecision = allVideos.filter(v => 
      v.bunnyVideoId && !['approved', 'rejected_by_ai'].includes(v.processingStatus)
    );
    
    console.log(`Videos in Bunny without GCS record: ${videosWithBunnyButNoGcs.length}`);
    console.log(`Videos in Bunny without AI decision: ${videosWithBunnyButNoAiDecision.length}`);
    
    if (videosWithBunnyButNoGcs.length === 0 && videosWithBunnyButNoAiDecision.length === 0) {
      console.log('✅ PIPELINE INTEGRITY VERIFIED: All videos follow GCS → AI → Bunny flow');
    } else {
      console.log('❌ PIPELINE INTEGRITY COMPROMISED: Some videos bypassed security checks');
    }
    
  } catch (error) {
    console.error('❌ Security test failed:', error);
  }
}

// Run the security test
testSecureUploadPipeline().catch(console.error);