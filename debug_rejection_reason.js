/**
 * DEBUG: Check the exact rejection reason for the video
 * 
 * This script examines the database to see which rejection reason is correct
 * and identifies why conflicting messages are being shown.
 */

import { db } from './server/db.js.js';
import { videos, moderationDecisions } from './shared/schema.js.js';
import { eq, desc } from 'drizzle-orm';

async function debugRejectionReason() {
  console.log('🎯 Debugging conflicting rejection reasons...');
  
  try {
    // Find the most recent rejected video for this user
    const rejectedVideos = await db
      .select()
      .from(videos)
      .where(eq(videos.userId, 'google-oauth2|117032826996185616207'))
      .orderBy(desc(videos.createdAt))
      .limit(5);
    
    console.log('📹 Recent videos:', rejectedVideos.map(v => ({
      id: v.id,
      title: v.title,
      processingStatus: v.processingStatus,
      flaggedReason: v.flaggedReason,
      audioFlagReason: v.audioFlagReason,
      createdAt: v.createdAt
    })));
    
    // Check moderation decisions for the rejected video
    const rejectedVideo = rejectedVideos.find(v => 
      v.processingStatus === 'rejected_by_ai' || 
      v.processingStatus === 'rejected_by_moderation' ||
      v.processingStatus === 'flagged'
    );
    
    if (rejectedVideo) {
      console.log('🚫 Found rejected video:', {
        id: rejectedVideo.id,
        title: rejectedVideo.title,
        processingStatus: rejectedVideo.processingStatus,
        flaggedReason: rejectedVideo.flaggedReason,
        audioFlagReason: rejectedVideo.audioFlagReason
      });
      
      // Get moderation decisions for this video
      const decisions = await db
        .select()
        .from(moderationDecisions)
        .where(eq(moderationDecisions.videoId, rejectedVideo.id))
        .orderBy(desc(moderationDecisions.createdAt));
      
      console.log('📋 Moderation decisions:', decisions.map(d => ({
        decision: d.decision,
        reason: d.reason,
        moderationType: d.moderationType,
        createdAt: d.createdAt,
        confidence: d.confidence
      })));
      
      // Determine which reason is the ACTUAL cause of rejection
      const gestureDecision = decisions.find(d => d.reason?.includes('hand gestures') || d.reason?.includes('gesture'));
      const audioDecision = decisions.find(d => d.reason?.includes('inappropriate language') || d.reason?.includes('audio'));
      
      console.log('🎯 ANALYSIS:');
      console.log('- Gesture detection decision:', gestureDecision?.reason || 'NONE');
      console.log('- Audio detection decision:', audioDecision?.reason || 'NONE');
      
      // The FIRST rejection (chronologically) should be the actual cause
      const actualRejectionCause = decisions[decisions.length - 1]; // Last in array = first chronologically
      
      console.log('✅ ACTUAL REJECTION CAUSE:', {
        reason: actualRejectionCause?.reason,
        moderationType: actualRejectionCause?.moderationType,
        decision: actualRejectionCause?.decision
      });
      
    } else {
      console.log('❌ No rejected video found');
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

debugRejectionReason().catch(console.error);