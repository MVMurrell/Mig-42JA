import { db } from './db.js';
import { quests, questParticipants, videos, users, notifications } from '@shared/schema.ts';
import { eq, and, sql, lte } from 'drizzle-orm';

class QuestCompletionChecker {
  private checkInterval: NodeJS.Timeout | null = null;

  public start(): void {
    // Check every 5 minutes for expired quests
    this.checkInterval = setInterval(() => {
      this.checkExpiredQuests();
    }, 5 * 60 * 1000);

    console.log('🎯 QUEST CHECKER: Started quest completion checker (5-minute intervals)');
  }

  public stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('🎯 QUEST CHECKER: Stopped quest completion checker');
    }
  }

  private async checkExpiredQuests(): Promise<void> {
    try {
      const now = new Date();
      
      // Find all active quests that have expired
      const expiredQuests = await db
        .select()
        .from(quests)
        .where(and(
          eq(quests.status, 'active'),
          eq(quests.isActive, true),
          lte(quests.endDate, now)
        ));

      console.log(`🎯 QUEST CHECKER: Found ${expiredQuests.length} expired quests to process`);

      for (const quest of expiredQuests) {
        await this.processExpiredQuest(quest);
      }
    } catch (error) {
      console.error(`❌ QUEST CHECKER: Error checking expired quests:`, error);
    }
  }

  private async processExpiredQuest(quest: any): Promise<void> {
    try {
      console.log(`🎯 QUEST CHECKER: Processing expired quest "${quest.title}" (${quest.id})`);

      // Count approved videos for this quest
      const [videoCountResult] = await db
        .select({ count: sql`count(*)`.as('count') })
        .from(videos)
        .where(and(
          eq(videos.questId, quest.id), 
          eq(videos.processingStatus, 'approved'),
          eq(videos.isActive, true)
        ));

      const approvedVideoCount = Number(videoCountResult?.count || 0);
      const questSuccessful = approvedVideoCount >= quest.requiredParticipants;

      // Get all participants who posted gems
      const participants = await db
        .select({
          userId: questParticipants.userId,
          hasPosted: questParticipants.hasPosted
        })
        .from(questParticipants)
        .where(and(
          eq(questParticipants.questId, quest.id),
          eq(questParticipants.hasPosted, true)
        ));

      // Mark quest as completed/failed
      await db
        .update(quests)
        .set({ 
          status: questSuccessful ? 'completed' : 'failed',
          isActive: false
        })
        .where(eq(quests.id, quest.id));

      // Send notifications and award coins
      for (const participant of participants) {
        await this.sendQuestCompletionNotification(
          participant.userId,
          quest,
          questSuccessful,
          approvedVideoCount
        );

        // Award coins if quest was successful
        if (questSuccessful) {
          await this.awardCoins(participant.userId, quest.rewardPerParticipant);
        }
      }

      console.log(`📊 QUEST CHECKER: Quest "${quest.title}" processed - Success: ${questSuccessful}, Videos: ${approvedVideoCount}/${quest.requiredParticipants}, Participants: ${participants.length}`);

    } catch (error) {
      console.error(`❌ QUEST CHECKER: Error processing quest ${quest.id}:`, error);
    }
  }

  private async sendQuestCompletionNotification(
    userId: string,
    quest: any,
    successful: boolean,
    videoCount: number
  ): Promise<void> {
    try {
      const title = successful 
        ? `🎉 Quest "${quest.title}" Completed!`
        : `😔 Quest "${quest.title}" Ended`;

      const message = successful
        ? `Congratulations! The quest reached ${videoCount}/${quest.requiredParticipants} participants. You've earned ${quest.rewardPerParticipant} coins for your participation!`
        : `The quest ended with only ${videoCount}/${quest.requiredParticipants} participants. Better luck on the next quest!`;

      await db.insert(notifications).values({
        userId: userId,
        title: title,
        message: message,
        type: successful ? 'quest_success' : 'quest_failed',
        relatedContentId: quest.id,
        isRead: false
      });

      console.log(`📢 QUEST CHECKER: Sent ${successful ? 'success' : 'failure'} notification to user ${userId}`);
    } catch (error) {
      console.error(`❌ QUEST CHECKER: Failed to send notification to ${userId}:`, error);
    }
  }

  private async awardCoins(userId: string, coinAmount: number): Promise<void> {
    try {
      await db
        .update(users)
        .set({
          gemCoins: sql`COALESCE(gem_coins, 0) + ${coinAmount}`
        })
        .where(eq(users.id, userId));

      console.log(`💰 QUEST CHECKER: Awarded ${coinAmount} coins to user ${userId}`);
    } catch (error) {
      console.error(`❌ QUEST CHECKER: Failed to award coins to ${userId}:`, error);
    }
  }
}

export const questCompletionChecker = new QuestCompletionChecker();