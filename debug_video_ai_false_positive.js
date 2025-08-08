/**
 * DEBUG: AI False Positive Analysis
 * 
 * This script analyzes the latest video that was rejected by AI moderation
 * to understand why appropriate content is being flagged as inappropriate.
 */

import { db } from './server/db.js.js';
import { videos, moderationDecisions } from './shared/schema.js.js';
import { desc, eq } from 'drizzle-orm';

async function debugVideoAIFalsePositive() {
  try {
    console.log('🔍 DEBUG: Analyzing latest AI rejection...');
    
    // Get the latest rejected video
    const latestVideo = await db.select()
      .from(videos)
      .orderBy(desc(videos.createdAt))
      .limit(5);
    
    console.log('📊 LATEST VIDEOS:', latestVideo.map(v => ({
      id: v.id,
      title: v.title,
      processingStatus: v.processingStatus,
      flaggedReason: v.flaggedReason,
      createdAt: v.createdAt,
      gcsProcessingUrl: v.gcsProcessingUrl
    })));
    
    // Find rejected videos
    const rejectedVideos = latestVideo.filter(v => 
      v.processingStatus === 'rejected' || 
      v.flaggedReason?.includes('inappropriate')
    );
    
    if (rejectedVideos.length === 0) {
      console.log('❌ DEBUG: No rejected videos found in latest uploads');
      return;
    }
    
    const rejectedVideo = rejectedVideos[0];
    console.log('🚫 REJECTED VIDEO DETAILS:', {
      id: rejectedVideo.id,
      title: rejectedVideo.title,
      flaggedReason: rejectedVideo.flaggedReason,
      processingStatus: rejectedVideo.processingStatus,
      gcsProcessingUrl: rejectedVideo.gcsProcessingUrl,
      createdAt: rejectedVideo.createdAt
    });
    
    // Check moderation decisions
    const moderationDecision = await db.select()
      .from(moderationDecisions)
      .where(eq(moderationDecisions.videoId, rejectedVideo.id))
      .limit(1);
    
    if (moderationDecision.length > 0) {
      console.log('⚖️ MODERATION DECISION:', {
        decision: moderationDecision[0].decision,
        reason: moderationDecision[0].reason,
        moderatorId: moderationDecision[0].moderatorId,
        createdAt: moderationDecision[0].createdAt
      });
    }
    
    // Analysis of the problem
    console.log('\n=== AI FALSE POSITIVE ANALYSIS ===');
    console.log('🔍 Root Cause Investigation:');
    console.log('1. Video reached GCS storage:', !!rejectedVideo.gcsProcessingUrl);
    console.log('2. Rejection reason:', rejectedVideo.flaggedReason || 'Not specified');
    console.log('3. Processing status:', rejectedVideo.processingStatus);
    
    if (rejectedVideo.flaggedReason?.includes('Visual content: Inappropriate content detected')) {
      console.log('\n🎯 IDENTIFIED ISSUE: Google Video Intelligence API False Positive');
      console.log('📋 Problem: Video Intelligence API is flagging appropriate content as inappropriate');
      console.log('💡 Likely causes:');
      console.log('   - API sensitivity threshold too strict');
      console.log('   - Model misinterpreting innocent content');
      console.log('   - Need to adjust explicit content detection parameters');
      console.log('   - Consider implementing confidence score thresholds');
    }
    
    if (rejectedVideo.gcsProcessingUrl) {
      console.log('\n✅ WORKFLOW STATUS: Video properly reached AI analysis');
      console.log('📂 GCS File:', rejectedVideo.gcsProcessingUrl);
      console.log('🤖 Issue is in AI analysis logic, not file access');
    }
    
  } catch (error) {
    console.error('❌ DEBUG ERROR:', error);
  }
}

// Run the analysis
debugVideoAIFalsePositive();