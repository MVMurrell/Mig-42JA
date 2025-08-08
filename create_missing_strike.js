import { db } from './server/db.ts.js';
import { storage } from './server/storage.ts.js';
import { moderationDecisions, videos } from './shared/schema.ts.js';
import { eq } from 'drizzle-orm';

async function createMissingStrike() {
  try {
    console.log('🔍 Looking for rejected moderation decisions without strikes...');
    
    // Find the test rejection decision
    const rejectedDecisions = await db
      .select({
        id: moderationDecisions.id,
        videoId: moderationDecisions.videoId,
        moderatorId: moderationDecisions.moderatorId,
        reason: moderationDecisions.reason,
        videoUserId: videos.userId,
        videoTitle: videos.title
      })
      .from(moderationDecisions)
      .leftJoin(videos, eq(moderationDecisions.videoId, videos.id))
      .where(eq(moderationDecisions.decision, 'reject'));

    console.log(`📋 Found ${rejectedDecisions.length} rejected decisions`);

    for (const decision of rejectedDecisions) {
      if (decision.videoUserId) {
        console.log(`⚖️ Creating strike for decision ${decision.id} - Video: "${decision.videoTitle}" by user ${decision.videoUserId}`);
        
        await storage.createStrikeForRejection(
          decision.videoUserId,
          'video',
          decision.videoId,
          decision.reason || 'Content violation',
          decision.moderatorId
        );
        
        console.log(`✅ Strike created successfully for user ${decision.videoUserId}`);
      } else {
        console.log(`⚠️ No user ID found for decision ${decision.id}`);
      }
    }

    console.log('🎉 Strike creation complete!');
  } catch (error) {
    console.error('❌ Error creating missing strikes:', error);
  } finally {
    process.exit(0);
  }
}

createMissingStrike();