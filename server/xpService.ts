import { storage } from "./storage.ts";
import { mapUserIdForDatabase } from "./userIdMapper.ts";
import { XP_REWARDS, type XPRewardType } from "@shared/xpSystem.ts";

export class XPService {
  async awardXP(userId: string, activity: XPRewardType, customAmount?: number): Promise<{ leveledUp: boolean; oldLevel: number; newLevel: number; currentXP: number; nextLevelXP: number }> {
    try {
      const mappedUserId = mapUserIdForDatabase({ claims: { sub: userId } });
      const xpAmount = customAmount || XP_REWARDS[activity];
      
      console.log(`🌟 XP SERVICE: Awarding ${xpAmount} XP to user ${mappedUserId} for ${activity}`);
      
      const result = await storage.awardXP(mappedUserId, xpAmount, activity);
      
      return result;
    } catch (error) {
      console.error("Error in XP service:", error);
      throw error;
    }
  }

  async getUserXPData(userId: string): Promise<{ currentXP: number; currentLevel: number } | undefined> {
    try {
      const mappedUserId = mapUserIdForDatabase({ claims: { sub: userId } });
      return await storage.getUserXPData(mappedUserId);
    } catch (error) {
      console.error("Error fetching user XP data:", error);
      return undefined;
    }
  }

  async awardXPForVideoWatch(userId: string, videoId: string, isRemoteVideo: boolean = false): Promise<{ leveledUp: boolean; oldLevel: number; newLevel: number; currentXP: number; nextLevelXP: number } | null> {
    try {
      const activity = isRemoteVideo ? 'PLAY_VIDEOS_PAID' : 'PLAY_VIDEOS_FREE';
      return await this.awardXP(userId, activity);
    } catch (error) {
      console.error("Error awarding XP for video watch:", error);
      return null;
    }
  }

  async awardXPForVideoUpload(userId: string): Promise<{ leveledUp: boolean; oldLevel: number; newLevel: number; currentXP: number; nextLevelXP: number } | null> {
    try {
      return await this.awardXP(userId, 'POST_VIDEO');
    } catch (error) {
      console.error("Error awarding XP for video upload:", error);
      return null;
    }
  }

  async awardXPForComment(userId: string, commentType: 'text' | 'video' = 'text'): Promise<{ leveledUp: boolean; oldLevel: number; newLevel: number; currentXP: number; nextLevelXP: number } | null> {
    try {
      const activity = commentType === 'video' ? 'VIDEO_COMMENT' : 'TEXT_COMMENT';
      return await this.awardXP(userId, activity);
    } catch (error) {
      console.error("Error awarding XP for comment:", error);
      return null;
    }
  }

  async awardXPForTreasureChest(userId: string): Promise<{ leveledUp: boolean; oldLevel: number; newLevel: number; currentXP: number; nextLevelXP: number } | null> {
    try {
      return await this.awardXP(userId, 'FIND_TREASURE');
    } catch (error) {
      console.error("Error awarding XP for treasure chest:", error);
      return null;
    }
  }

  async awardXPForGroupCreation(userId: string): Promise<{ leveledUp: boolean; oldLevel: number; newLevel: number; currentXP: number; nextLevelXP: number } | null> {
    try {
      return await this.awardXP(userId, 'CREATE_GROUP');
    } catch (error) {
      console.error("Error awarding XP for group creation:", error);
      return null;
    }
  }

  async awardXPForContentModeration(userId: string): Promise<{ leveledUp: boolean; oldLevel: number; newLevel: number; currentXP: number; nextLevelXP: number } | null> {
    try {
      return await this.awardXP(userId, 'FLAG_VIDEO');
    } catch (error) {
      console.error("Error awarding XP for content moderation:", error);
      return null;
    }
  }

  async awardXPForMovement(userId: string, miles: number): Promise<{ leveledUp: boolean; oldLevel: number; newLevel: number; currentXP: number; nextLevelXP: number } | null> {
    try {
      const xpAmount = Math.floor(miles * XP_REWARDS.TRACK_LOCATION_PER_MILE);
      return await this.awardXP(userId, 'TRACK_LOCATION_PER_MILE', xpAmount);
    } catch (error) {
      console.error("Error awarding XP for movement:", error);
      return null;
    }
  }
}

export const xpService = new XPService();