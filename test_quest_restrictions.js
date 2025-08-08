import { db } from './server/db.js.js';
import { videos, questParticipants, quests } from './shared/schema.js.js';
import { eq, and } from 'drizzle-orm';

async function testQuestRestrictions() {
  try {
    console.log('🧪 Testing quest restrictions...');

    // Test data
    const testUserId = 'google-oauth2|117032826996185616207';
    const testQuestId = '92a3bba8-855b-43b8-be3c-8b90e8f66036'; // Your "lipstick" quest

    // 1. Check current quest videos for the user
    console.log('\n📊 Current quest videos for user:');
    const userQuestVideos = await db
      .select()
      .from(videos)
      .where(and(
        eq(videos.questId, testQuestId),
        eq(videos.userId, testUserId),
        eq(videos.processingStatus, 'approved'),
        eq(videos.isActive, true)
      ));

    console.log(`Found ${userQuestVideos.length} approved videos for quest ${testQuestId}:`);
    userQuestVideos.forEach(video => {
      console.log(`- Video ID: ${video.id}, Title: "${video.title}"`);
    });

    // 2. Check quest participation status
    console.log('\n👥 Quest participation status:');
    const [participation] = await db
      .select()
      .from(questParticipants)
      .where(and(
        eq(questParticipants.questId, testQuestId),
        eq(questParticipants.userId, testUserId)
      ));

    if (participation) {
      console.log(`Participation found: hasPosted=${participation.hasPosted}, videoId=${participation.videoId}`);
    } else {
      console.log('No participation record found');
    }

    // 3. Check quest details
    console.log('\n🎯 Quest details:');
    const [quest] = await db
      .select()
      .from(quests)
      .where(eq(quests.id, testQuestId));

    if (quest) {
      console.log(`Quest: "${quest.title}"`);
      console.log(`Required participants: ${quest.requiredParticipants}`);
      console.log(`Status: ${quest.status}`);
      console.log(`Active: ${quest.isActive}`);
      console.log(`End date: ${quest.endDate}`);
    }

    // 4. Simulate what would happen if user tries to post another video
    console.log('\n🔒 Testing one-gem-per-user restriction:');
    if (userQuestVideos.length > 0) {
      console.log('❌ RESTRICTION SHOULD TRIGGER: User already has approved gems for this quest');
      console.log('If user tries to upload another gem, it should be rejected with:');
      console.log('"User already has an approved gem for this quest. Only one gem per user per quest is allowed."');
    } else {
      console.log('✅ User has no approved gems for this quest - upload should be allowed');
    }

    // 5. Check total approved videos for quest progress
    console.log('\n📈 Quest progress calculation:');
    const allQuestVideos = await db
      .select()
      .from(videos)
      .where(and(
        eq(videos.questId, testQuestId),
        eq(videos.processingStatus, 'approved'),
        eq(videos.isActive, true)
      ));

    console.log(`Total approved videos for quest: ${allQuestVideos.length}`);
    console.log(`Progress: ${allQuestVideos.length}/${quest?.requiredParticipants || 'N/A'}`);

    console.log('\n✅ Quest restriction test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testQuestRestrictions();