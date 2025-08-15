/**
 * Coin Earning Service
 * 
 * Handles all coin earning mechanisms:
 * - Daily login rewards (1 coin per 24 hours)
 * - Distance-based rewards (1 coin per mile)
 * - Milestone rewards (5, 10, 20 mile bonuses)
 * - Movement type detection (walking/cycling vs driving)
 */

import { db } from './db.js';
import { 
  users, 
  dailyLogins, 
  userLocationHistory, 
  distanceRewards, 
  activitySessions,
  type DBDailyLoginInsert,
  type DBUserLocationHistoryInsert,
  type DBDistanceRewardInsert,
  type DBActivitySessionInsert,
  DBUserInsert
} from '@shared/schema.ts';
import { eq, and, gte, lt, desc, sql } from 'drizzle-orm';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number; // meters per second
  heading?: number;
  altitude?: number;
  timestamp: Date;
}

interface DistanceCalculation {
  distance: number; // in miles
  movementType: 'walking' | 'cycling' | 'driving' | 'stationary';
  isValidForRewards: boolean;
}

export class CoinEarningService {
  
  /**
   * Award daily login coin if user hasn't logged in today
   */
  async processDailyLogin(userId: string): Promise<{ coinsAwarded: number; message?: string }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of day
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Check if user already got daily login reward today
      const existingLogin = await db.select()
        .from(dailyLogins)
        .where(and(
          eq(dailyLogins.userId, userId),
          gte(dailyLogins.loginDate, today),
          lt(dailyLogins.loginDate, tomorrow)
        ))
        .limit(1);
      
      if (existingLogin.length > 0) {
        return { coinsAwarded: 0, message: 'Already received daily login reward today' };
      }
      
      // Award daily login coin
      await db.insert(dailyLogins).values({
        userId,
        loginDate: today,
        coinsAwarded: 1
      } as DBDailyLoginInsert);
      
      // Update user's coin balance
      await db.update(users)
        .set({ gemCoins: sql`${users.gemCoins} + 1` } as Partial<DBUserInsert>)
        .where(eq(users.id, userId));
      
      console.log(`💰 DAILY LOGIN: Awarded 1 coin to user ${userId}`);
      return { coinsAwarded: 1, message: 'Daily login bonus: +1 coin!' };
      
    } catch (error) {
      console.error('❌ DAILY LOGIN: Error processing daily login:', error);
      return { coinsAwarded: 0 };
    }
  }
  
  /**
   * Start or continue activity session for distance tracking
   */
  async startOrContinueSession(userId: string): Promise<string> {
    try {
      // Check for active session (last location update within 10 minutes)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      
      const activeSession = await db.select()
        .from(activitySessions)
        .where(and(
          eq(activitySessions.userId, userId),
          eq(activitySessions.isActive, true),
          gte(activitySessions.lastLocationUpdate, tenMinutesAgo)
        ))
        .orderBy(desc(activitySessions.sessionStart))
        .limit(1);
      
      if (activeSession.length > 0) {
        // Continue existing session
        await db.update(activitySessions)
          .set({ lastLocationUpdate: new Date() } as Partial<DBActivitySessionInsert>)
          .where(eq(activitySessions.id, activeSession[0].id));
        
        return activeSession[0].id;
      }
      
      // Create new session
      const newSession = await db.insert(activitySessions).values({
        userId,
        sessionStart: new Date(),
        totalDistance: "0",
        coinsEarned: 0,
        isActive: true,
        lastLocationUpdate: new Date()
      } as DBActivitySessionInsert).returning();
      
      console.log(`🚀 ACTIVITY SESSION: Started new session for user ${userId}`);
      return newSession[0].id;
      
    } catch (error) {
      console.error('❌ ACTIVITY SESSION: Error starting session:', error);
      throw error;
    }
  }
  
  /**
   * Process location update and calculate distance/rewards
   */
  async processLocationUpdate(userId: string, locationData: LocationData): Promise<{
    coinsAwarded: number;
    totalDistance: number;
    sessionDistance: number;
    movementType: string;
    milestoneReached?: string;
  }> {
    try {
      const sessionId = await this.startOrContinueSession(userId);
      
      // Get last location for distance calculation
      const lastLocation = await db.select()
        .from(userLocationHistory)
        .where(eq(userLocationHistory.userId, userId))
        .orderBy(desc(userLocationHistory.timestamp))
        .limit(1);
      
      let distanceCalculation: DistanceCalculation = {
        distance: 0,
        movementType: 'stationary',
        isValidForRewards: true
      };
      
      if (lastLocation.length > 0) {
        distanceCalculation = this.calculateDistanceAndMovementType(
          {
            lat: parseFloat(lastLocation[0].latitude),
            lng: parseFloat(lastLocation[0].longitude),
            timestamp: lastLocation[0].timestamp!
          },
          {
            lat: locationData.latitude,
            lng: locationData.longitude,
            timestamp: locationData.timestamp
          },
          locationData.speed
        );
      }
      
      // Store location data
      await db.insert(userLocationHistory).values({
        userId,
        sessionId,
        latitude: locationData.latitude.toString(),
        longitude: locationData.longitude.toString(),
        accuracy: locationData.accuracy?.toString(),
        speed: locationData.speed?.toString(),
        heading: locationData.heading?.toString(),
        altitude: locationData.altitude?.toString(),
        movementType: distanceCalculation.movementType,
        isValidForRewards: distanceCalculation.isValidForRewards,
        timestamp: locationData.timestamp
      } as DBUserLocationHistoryInsert);
      
      // Update session with distance
      const updatedSession = await db.update(activitySessions)
        .set({ 
          totalDistance: sql`${activitySessions.totalDistance} + ${distanceCalculation.distance}`,
          movementType: distanceCalculation.movementType,
          lastLocationUpdate: new Date()
        } as Partial<DBActivitySessionInsert>)
        .where(eq(activitySessions.id, sessionId))
        .returning();
      
      const sessionDistance = parseFloat(updatedSession[0].totalDistance);
      
      // Calculate coin rewards if movement is valid
      let coinsAwarded = 0;
      let milestoneReached = '';
      
      if (distanceCalculation.isValidForRewards && distanceCalculation.distance > 0) {
        const rewardResult = await this.calculateAndAwardDistanceRewards(
          userId, 
          sessionId, 
          sessionDistance,
          distanceCalculation.distance
        );
        coinsAwarded = rewardResult.coinsAwarded;
        milestoneReached = rewardResult.milestoneReached;
      }
      
      // Get total user distance for response
      const totalDistanceResult = await db.select({
        total: sql<number>`COALESCE(SUM(${distanceRewards.totalDistance}), 0)`
      })
      .from(distanceRewards)
      .where(eq(distanceRewards.userId, userId));
      
      const totalDistance = totalDistanceResult[0]?.total || 0;
      
      return {
        coinsAwarded,
        totalDistance,
        sessionDistance,
        movementType: distanceCalculation.movementType,
        milestoneReached: milestoneReached || undefined
      };
      
    } catch (error) {
      console.error('❌ LOCATION UPDATE: Error processing location:', error);
      throw error;
    }
  }
  
  /**
   * Calculate distance between two points and determine movement type
   */
  private calculateDistanceAndMovementType(
    point1: { lat: number; lng: number; timestamp: Date },
    point2: { lat: number; lng: number; timestamp: Date },
    currentSpeed?: number
  ): DistanceCalculation {
    // Calculate distance using Haversine formula
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLng = this.toRadians(point2.lng - point1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    // Calculate time difference in hours
    const timeDiffMs = point2.timestamp.getTime() - point1.timestamp.getTime();
    const timeDiffHours = timeDiffMs / (1000 * 60 * 60);
    
    // Calculate speed in mph
    const calculatedSpeed = timeDiffHours > 0 ? distance / timeDiffHours : 0;
    
    // Use GPS speed if available, convert from m/s to mph
    const speedMph = currentSpeed ? currentSpeed * 2.237 : calculatedSpeed;
    
    // Determine movement type and validity for rewards
    let movementType: 'walking' | 'cycling' | 'driving' | 'stationary';
    let isValidForRewards = true;
    
    if (speedMph < 0.5) {
      movementType = 'stationary';
      isValidForRewards = false;
    } else if (speedMph <= 4) {
      movementType = 'walking';
      isValidForRewards = true;
    } else if (speedMph <= 15) {
      movementType = 'cycling';
      isValidForRewards = true;
    } else {
      movementType = 'driving';
      isValidForRewards = false; // Don't reward driving to prevent abuse
    }
    
    // Don't reward distances that are too large (likely GPS jumps or driving)
    if (distance > 0.5) { // More than 0.5 miles in single update
      isValidForRewards = false;
    }
    
    return {
      distance: Math.max(0, distance), // Ensure non-negative
      movementType,
      isValidForRewards
    };
  }
  
  /**
   * Calculate and award distance-based coin rewards
   */
  private async calculateAndAwardDistanceRewards(
    userId: string, 
    sessionId: string, 
    sessionDistance: number,
    newDistance: number
  ): Promise<{ coinsAwarded: number; milestoneReached: string }> {
    let totalCoinsAwarded = 0;
    let milestoneReached = '';
    
    // Award 1 coin per mile (rounded down)
    const milesToReward = Math.floor(sessionDistance) - Math.floor(sessionDistance - newDistance);
    
    if (milesToReward > 0) {
      await this.awardDistanceCoins(userId, sessionId, sessionDistance, 'daily_distance', milesToReward);
      totalCoinsAwarded += milesToReward;
      console.log(`💰 DISTANCE REWARD: Awarded ${milesToReward} coins for ${milesToReward} miles to user ${userId}`);
    }
    
    // Check for milestone rewards (5, 10, 20 miles)
    const milestones = [
      { distance: 5, reward: 5, type: 'milestone_5' },
      { distance: 10, reward: 10, type: 'milestone_10' },
      { distance: 20, reward: 20, type: 'milestone_20' }
    ];
    
    for (const milestone of milestones) {
      const previousDistance = sessionDistance - newDistance;
      
      // Check if we crossed this milestone in this update
      if (previousDistance < milestone.distance && sessionDistance >= milestone.distance) {
        // Check if user hasn't already received this milestone reward today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const existingMilestone = await db.select()
          .from(distanceRewards)
          .where(and(
            eq(distanceRewards.userId, userId),
            eq(distanceRewards.rewardType, milestone.type),
            gte(distanceRewards.dateEarned, today)
          ));
        
        if (existingMilestone.length === 0) {
          await this.awardDistanceCoins(userId, sessionId, milestone.distance, milestone.type, milestone.reward);
          totalCoinsAwarded += milestone.reward;
          milestoneReached = `${milestone.distance} mile milestone!`;
          console.log(`🎯 MILESTONE REWARD: Awarded ${milestone.reward} coins for ${milestone.distance} mile milestone to user ${userId}`);
        }
      }
    }
    
    return { coinsAwarded: totalCoinsAwarded, milestoneReached };
  }
  
  /**
   * Award distance coins and update user balance
   */
  private async awardDistanceCoins(
    userId: string, 
    sessionId: string, 
    distance: number, 
    rewardType: string, 
    coinsAwarded: number
  ): Promise<void> {
    // Get session details
    const session = await db.select()
      .from(activitySessions)
      .where(eq(activitySessions.id, sessionId))
      .limit(1);
    
    if (session.length === 0) return;
    
    // Record distance reward
    await db.insert(distanceRewards).values({
      userId,
      totalDistance: distance.toString(),
      rewardType,
      coinsAwarded,
      sessionStartTime: session[0].sessionStart,
      sessionEndTime: new Date()
    });
    
    // Update user's coin balance
    await db.update(users)
      .set({ gemCoins: sql`${users.gemCoins} + ${coinsAwarded}` } as Partial<DBUserInsert> )
      .where(eq(users.id, userId));
    
    // Update session coins earned
    await db.update(activitySessions)
      .set({ coinsEarned: sql`${activitySessions.coinsEarned} + ${coinsAwarded}` } as Partial<DBActivitySessionInsert>)
      .where(eq(activitySessions.id, sessionId));
  }
  
  /**
   * End active session
   */
  async endSession(userId: string): Promise<void> {
    try {
      await db.update(activitySessions)
        .set({ 
          isActive: false,
          sessionEnd: new Date()
        } as Partial<DBActivitySessionInsert>)
        .where(and(
          eq(activitySessions.userId, userId),
          eq(activitySessions.isActive, true)
        ));
      
      console.log(`🏁 ACTIVITY SESSION: Ended session for user ${userId}`);
    } catch (error) {
      console.error('❌ ACTIVITY SESSION: Error ending session:', error);
    }
  }
  
  /**
   * Get user's coin earning stats
   */
  async getUserStats(userId: string): Promise<{
    totalCoinsEarned: number;
    totalDistance: number;
    dailyLoginStreak: number;
    activeSession?: {
      sessionDistance: number;
      coinsEarned: number;
      sessionStart: Date;
    };
  }> {
    try {
      // Get total coins from distance rewards
      const distanceCoinsResult = await db.select({
        total: sql<number>`COALESCE(SUM(${distanceRewards.coinsAwarded}), 0)`
      })
      .from(distanceRewards)
      .where(eq(distanceRewards.userId, userId));
      
      // Get total coins from daily logins
      const loginCoinsResult = await db.select({
        total: sql<number>`COALESCE(SUM(${dailyLogins.coinsAwarded}), 0)`
      })
      .from(dailyLogins)
      .where(eq(dailyLogins.userId, userId));
      
      // Get total distance
      const totalDistanceResult = await db.select({
        total: sql<number>`COALESCE(SUM(${distanceRewards.totalDistance}), 0)`
      })
      .from(distanceRewards)
      .where(eq(distanceRewards.userId, userId));
      
      // Calculate daily login streak
      const dailyLoginStreak = await this.calculateLoginStreak(userId);
      
      // Get active session
      const activeSessionResult = await db.select()
        .from(activitySessions)
        .where(and(
          eq(activitySessions.userId, userId),
          eq(activitySessions.isActive, true)
        ))
        .orderBy(desc(activitySessions.sessionStart))
        .limit(1);
      
      const activeSession = activeSessionResult.length > 0 ? {
        sessionDistance: parseFloat(activeSessionResult[0].totalDistance),
        coinsEarned: activeSessionResult[0].coinsEarned,
        sessionStart: activeSessionResult[0].sessionStart
      } : undefined;
      
      return {
        totalCoinsEarned: (distanceCoinsResult[0]?.total || 0) + (loginCoinsResult[0]?.total || 0),
        totalDistance: totalDistanceResult[0]?.total || 0,
        dailyLoginStreak,
        activeSession
      };
      
    } catch (error) {
      console.error('❌ USER STATS: Error getting user stats:', error);
      return {
        totalCoinsEarned: 0,
        totalDistance: 0,
        dailyLoginStreak: 0
      };
    }
  }
  
  /**
   * Calculate consecutive daily login streak
   */
  private async calculateLoginStreak(userId: string): Promise<number> {
    const logins = await db.select()
      .from(dailyLogins)
      .where(eq(dailyLogins.userId, userId))
      .orderBy(desc(dailyLogins.loginDate));
    
    if (logins.length === 0) return 0;
    
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    for (const login of logins) {
      const loginDate = new Date(login.loginDate);
      loginDate.setHours(0, 0, 0, 0);
      
      if (loginDate.getTime() === currentDate.getTime()) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (loginDate.getTime() === currentDate.getTime() - 24 * 60 * 60 * 1000) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  }
  
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export const coinEarningService = new CoinEarningService();