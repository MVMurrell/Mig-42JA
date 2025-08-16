/**
 * Treasure Chest Service
 * Manages treasure chest spawning, collection, and lifecycle
 */

import { storage, db } from './storage.ts';
import { videos, treasureChests, treasureChestLocations, treasureChestCollections, users } from '../shared/schema.ts';
import { eq, and, sql, desc, asc, lt, gt, not } from 'drizzle-orm';
type DBTreasureChestLocationInsert = typeof treasureChestLocations.$inferInsert;
type DBTreasureChestInsert = typeof treasureChests.$inferInsert;
type DBTreasureChestCollectionInsert = typeof treasureChestCollections.$inferInsert;

export interface TreasureSpawnLocation {
  latitude: number;
  longitude: number;
  nearestVideoId: string;
  distanceToVideo: number;
}

export interface CollectionAttempt {
  userId: string;
  chestId: string;
  userLatitude: number;
  userLongitude: number;
}

export interface CollectionResult {
  success: boolean;
  coinReward?: number;
  distanceFromChest?: number;
  message: string;
}

export class TreasureChestService {
  // Chest spawning intervals (in milliseconds)
  private readonly SPAWN_INTERVALS = {
    easy: 4 * 60 * 60 * 1000,    // 4 hours
    medium: 6 * 60 * 60 * 1000,  // 6 hours
    hard: 8 * 60 * 60 * 1000,    // 8 hours
    very_hard: 12 * 60 * 60 * 1000, // 12 hours
    extreme: 24 * 60 * 60 * 1000    // 24 hours
  };

  // Chest duration (how long they stay active) - Higher rewards = shorter time
  private readonly CHEST_DURATION = {
    easy: 6 * 60 * 60 * 1000,     // 6 hours (5 coins - plenty of time)
    medium: 4 * 60 * 60 * 1000,   // 4 hours (10 coins - good time)
    hard: 2 * 60 * 60 * 1000,     // 2 hours (20 coins - need to hurry!)
    very_hard: 1 * 60 * 60 * 1000, // 1 hour (40 coins - rush to get there!)
    extreme: 30 * 60 * 1000       // 30 minutes (100 coins - immediate action required!)
  };

  // Coin rewards and spawn probabilities
  private readonly CHEST_CONFIG = [
    { coinReward: 5, difficulty: 'easy', probability: 0.5 },
    { coinReward: 10, difficulty: 'medium', probability: 0.25 },
    { coinReward: 20, difficulty: 'hard', probability: 0.15 },
    { coinReward: 40, difficulty: 'very_hard', probability: 0.08 },
    { coinReward: 100, difficulty: 'extreme', probability: 0.02 }
  ];

  // Collection radius in feet
  private readonly COLLECTION_RADIUS_FEET = 100;
  
  // Minimum distance between chests in miles
  private readonly MIN_CHEST_DISTANCE_MILES = 1;
  
  // Maximum distance from video in miles
  private readonly MAX_VIDEO_DISTANCE_MILES = 1;

  /**
   * Calculate distance between two points in miles
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Calculate distance in feet
   */
  private calculateDistanceFeet(lat1: number, lng1: number, lat2: number, lng2: number): number {
    return this.calculateDistance(lat1, lng1, lat2, lng2) * 5280; // Convert miles to feet
  }

  /**
   * Get random chest configuration based on probability
   */
  private getRandomChestConfig() {
    const random = Math.random();
    let cumulativeProbability = 0;
    
    for (const config of this.CHEST_CONFIG) {
      cumulativeProbability += config.probability;
      if (random <= cumulativeProbability) {
        return config;
      }
    }
    
    // Fallback to easy chest
    return this.CHEST_CONFIG[0];
  }

  /**
   * Find suitable spawn locations near videos
   */
  async findPotentialSpawnLocations(): Promise<TreasureSpawnLocation[]> {
    console.log('🗺️ TREASURE: Finding potential spawn locations...');
    
    // Get all videos with location data
    const videosWithLocation = await db.select({
      id: videos.id,
      latitude: videos.latitude,
      longitude: videos.longitude,
    })
    .from(videos)
    .where(and(
      not(eq(videos.latitude, '')),
      not(eq(videos.longitude, ''))
    ));

    console.log(`🗺️ TREASURE: Found ${videosWithLocation.length} videos with location data`);

    const locations: TreasureSpawnLocation[] = [];

    for (const video of videosWithLocation) {
      if (!video.latitude || !video.longitude) continue;

      const videoLat = parseFloat(video.latitude);
      const videoLng = parseFloat(video.longitude);

      // Check if there are already active chests too close to this video
      const nearbyChests = await db.select()
        .from(treasureChests)
        .where(and(
          eq(treasureChests.isActive, true),
          gt(treasureChests.expiresAt, new Date())
        ));

      let tooCloseToExisting = false;
      for (const chest of nearbyChests) {
        const chestLat = parseFloat(chest.latitude.toString());
        const chestLng = parseFloat(chest.longitude.toString());
        const distance = this.calculateDistance(videoLat, videoLng, chestLat, chestLng);
        
        if (distance < this.MIN_CHEST_DISTANCE_MILES) {
          tooCloseToExisting = true;
          break;
        }
      }

      if (!tooCloseToExisting) {
        // Generate potential spawn points around this video (within 1 mile radius)
        const numVariations = 5; // Create multiple potential locations per video
        for (let i = 0; i < numVariations; i++) {
          const angle = (360 / numVariations) * i;
          const distance = Math.random() * this.MAX_VIDEO_DISTANCE_MILES; // Random distance up to 1 mile
          
          // Convert to lat/lng offset
          const latOffset = (distance / 69) * Math.cos(angle * Math.PI / 180);
          const lngOffset = (distance / 69) * Math.sin(angle * Math.PI / 180);
          
          const spawnLat = videoLat + latOffset;
          const spawnLng = videoLng + lngOffset;
          
          locations.push({
            latitude: spawnLat,
            longitude: spawnLng,
            nearestVideoId: video.id,
            distanceToVideo: distance
          });
        }
      }
    }

    console.log(`🗺️ TREASURE: Generated ${locations.length} potential spawn locations`);
    return locations;
  }

  /**
   * Check if a location can spawn a chest today
   */
  async canSpawnAtLocation(latitude: number, longitude: number): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const location = await db.select()
      .from(treasureChestLocations)
      .where(and(
        eq(treasureChestLocations.latitude, latitude.toString()),
        eq(treasureChestLocations.longitude, longitude.toString())
      ))
      .limit(1);

    if (location.length === 0) {
      // New location, can spawn
      return true;
    }

    const locationData = location[0];
    
    // Reset daily count if it's a new day
    if (locationData.lastSpawnDate !== today) {
      await db.update(treasureChestLocations)
        .set({ 
          dailySpawnCount: 0,
          lastSpawnDate: today,
          updatedAt: new Date()
        } as Partial <DBTreasureChestLocationInsert>)
        .where(eq(treasureChestLocations.id, locationData.id));
      
      return true;
    }

    // Check if we've hit the daily limit (max 2 per location per day)
    return locationData.dailySpawnCount < 2;
  }

  /**
   * Spawn a treasure chest
   */
  async spawnTreasureChest(): Promise<string | null> {
    console.log('🎁 TREASURE: Attempting to spawn treasure chest...');
    
    try {
      const locations = await this.findPotentialSpawnLocations();
      if (locations.length === 0) {
        console.log('🎁 TREASURE: No suitable spawn locations found');
        return null;
      }

      // Filter locations that can spawn today
      const validLocations = [];
      for (const location of locations) {
        if (await this.canSpawnAtLocation(location.latitude, location.longitude)) {
          validLocations.push(location);
        }
      }

      if (validLocations.length === 0) {
        console.log('🎁 TREASURE: No valid locations available today');
        return null;
      }

      // Pick a random valid location
      const spawnLocation = validLocations[Math.floor(Math.random() * validLocations.length)];
      const chestConfig = this.getRandomChestConfig();
      
      const difficulty = chestConfig.difficulty as keyof typeof this.CHEST_DURATION;
      const expiresAt = new Date(Date.now() + this.CHEST_DURATION[difficulty]);

      // Create the treasure chest
      const newChest = await db.insert(treasureChests)
        .values({
          latitude: spawnLocation.latitude.toString(),
          longitude: spawnLocation.longitude.toString(),
          coinReward: chestConfig.coinReward,
          difficulty: chestConfig.difficulty,
          expiresAt,
          nearestVideoId: spawnLocation.nearestVideoId,
          nearestVideoDistance: spawnLocation.distanceToVideo
        } as DBTreasureChestInsert)
        .returning();

      // Update or create location tracking
      const today = new Date().toISOString().split('T')[0];
      
      const existingLocation = await db.select()
        .from(treasureChestLocations)
        .where(and(
          eq(treasureChestLocations.latitude, spawnLocation.latitude.toString()),
          eq(treasureChestLocations.longitude, spawnLocation.longitude.toString())
        ))
        .limit(1);

      if (existingLocation.length > 0) {
        await db.update(treasureChestLocations)
          .set({
            lastSpawnedAt: new Date(),
            spawnCount: sql`${treasureChestLocations.spawnCount} + 1`,
            dailySpawnCount: sql`${treasureChestLocations.dailySpawnCount} + 1`,
            lastSpawnDate: today,
            updatedAt: new Date()
          } as Partial<DBTreasureChestLocationInsert>)
          .where(eq(treasureChestLocations.id, existingLocation[0].id));
      } else {
        await db.insert(treasureChestLocations)
          .values({
            latitude: spawnLocation.latitude.toString(),
            longitude: spawnLocation.longitude.toString(),
            lastSpawnedAt: new Date(),
            spawnCount: 1,
            dailySpawnCount: 1,
            lastSpawnDate: today,
            nearestVideoId: spawnLocation.nearestVideoId
          } as DBTreasureChestLocationInsert);
      }

      console.log(`🎁 TREASURE: Spawned ${chestConfig.difficulty} chest with ${chestConfig.coinReward} coins at (${spawnLocation.latitude}, ${spawnLocation.longitude})`);
      console.log(`🎁 TREASURE: Chest expires at: ${expiresAt.toISOString()}`);
      
      return newChest[0].id;

    } catch (error) {
      console.error('🎁 TREASURE: Error spawning treasure chest:', error);
      return null;
    }
  }

  /**
   * Get all active treasure chests
   */
  async getActiveTreasureChests() {
    try {
      const activeChests = await db.select({
        id: treasureChests.id,
        latitude: treasureChests.latitude,
        longitude: treasureChests.longitude,
        coinReward: treasureChests.coinReward,
        difficulty: treasureChests.difficulty,
        spawnedAt: treasureChests.spawnedAt,
        expiresAt: treasureChests.expiresAt,
        isCollected: treasureChests.isCollected,
        nearestVideoId: treasureChests.nearestVideoId,
        nearestVideoDistance: treasureChests.nearestVideoDistance
      })
      .from(treasureChests)
      .where(and(
        eq(treasureChests.isActive, true),
        gt(treasureChests.expiresAt, new Date())
      ))
      .orderBy(desc(treasureChests.spawnedAt));

      console.log(`🎁 TREASURE: Found ${activeChests.length} active treasure chests`);
      return activeChests;
      
    } catch (error) {
      console.error('🎁 TREASURE: Error fetching active chests:', error);
      return [];
    }
  }

  /**
   * Attempt to collect a treasure chest
   */
  async collectTreasureChest(attempt: CollectionAttempt): Promise<CollectionResult> {
    console.log(`🎁 TREASURE: Collection attempt by user ${attempt.userId} for chest ${attempt.chestId}`);
    
    try {
      // Get the chest
      const chest = await db.select()
        .from(treasureChests)
        .where(and(
          eq(treasureChests.id, attempt.chestId),
          eq(treasureChests.isActive, true),
          gt(treasureChests.expiresAt, new Date())
        ))
        .limit(1);

      if (chest.length === 0) {
        return {
          success: false,
          message: "Treasure chest not found or already collected"
        };
      }

      const chestData = chest[0];
      const chestLat = parseFloat(chestData.latitude.toString());
      const chestLng = parseFloat(chestData.longitude.toString());
      
      // Calculate distance from user to chest
      const distanceToChest = this.calculateDistanceFeet(
        attempt.userLatitude,
        attempt.userLongitude,
        chestLat,
        chestLng
      );

      console.log(`🎁 TREASURE: User is ${distanceToChest.toFixed(1)} feet from chest (limit: ${this.COLLECTION_RADIUS_FEET} feet)`);

      // Check if user is within collection radius
      if (distanceToChest > this.COLLECTION_RADIUS_FEET) {
        return {
          success: false,
          distanceFromChest: distanceToChest,
          message: `You need to be within ${this.COLLECTION_RADIUS_FEET} feet of the treasure chest. You are ${distanceToChest.toFixed(1)} feet away.`
        };
      }

      // Check if user already collected this chest
      const existingCollection = await db.select()
        .from(treasureChestCollections)
        .where(and(
          eq(treasureChestCollections.userId, attempt.userId),
          eq(treasureChestCollections.chestId, attempt.chestId)
        ))
        .limit(1);

      if (existingCollection.length > 0) {
        return {
          success: false,
          message: "You have already collected this treasure chest"
        };
      }

      // NOTE: We don't mark the chest as collected globally
      // Multiple users can collect the same chest, but each user can only collect it once
      // The chest remains active until it expires naturally
  const collection: DBTreasureChestCollectionInsert = {
          userId: attempt.userId,
          chestId: attempt.chestId,
          coinReward: chestData.coinReward,
          collectionLatitude: String(attempt.userLatitude),
          collectionLongitude: String(attempt.userLongitude),
          distanceFromChest: String(distanceToChest),
        } ;

        await db.insert(treasureChestCollections).values(collection)

      // Award coins to user
      await db.update(users)
        .set({
          gemCoins: sql`${users.gemCoins} + ${chestData.coinReward}`,
          updatedAt: new Date()
        } as Partial<typeof users.$inferInsert>)
        .where(eq(users.id, attempt.userId));

      console.log(`🎁 TREASURE: Successfully collected! Awarded ${chestData.coinReward} coins to user ${attempt.userId}`);

      return {
        success: true,
        coinReward: chestData.coinReward,
        distanceFromChest: distanceToChest,
        message: `Congratulations! You found ${chestData.coinReward} coins!`
      };

    } catch (error) {
      console.error('🎁 TREASURE: Error collecting chest:', error);
      return {
        success: false,
        message: "An error occurred while collecting the treasure chest"
      };
    }
  }

  /**
   * Clean up expired treasure chests
   */
  async cleanupExpiredChests(): Promise<number> {
    try {
      const result = await db.update(treasureChests)
        .set({ isActive: false } as Partial<DBTreasureChestInsert>)
        .where(and(
          eq(treasureChests.isActive, true),
          lt(treasureChests.expiresAt, new Date())
        ))
        .returning();

      console.log(`🎁 TREASURE: Cleaned up ${result.length} expired treasure chests`);
      return result.length;
      
    } catch (error) {
      console.error('🎁 TREASURE: Error cleaning up expired chests:', error);
      return 0;
    }
  }

  /**
   * Get user's treasure collection stats
   */
  async getUserTreasureStats(userId: string) {
    try {
      const stats = await db.select({
        totalCollected: sql<number>`COUNT(*)`,
        totalCoinsEarned: sql<number>`SUM(${treasureChestCollections.coinReward})`,
      })
      .from(treasureChestCollections)
      .where(eq(treasureChestCollections.userId, userId));

      const difficultyStats = await db.select({
        difficulty: treasureChests.difficulty,
        count: sql<number>`COUNT(*)`,
        coins: sql<number>`SUM(${treasureChestCollections.coinReward})`
      })
      .from(treasureChestCollections)
      .innerJoin(treasureChests, eq(treasureChestCollections.chestId, treasureChests.id))
      .where(eq(treasureChestCollections.userId, userId))
      .groupBy(treasureChests.difficulty);

      return {
        totalCollected: stats[0]?.totalCollected || 0,
        totalCoinsEarned: stats[0]?.totalCoinsEarned || 0,
        byDifficulty: difficultyStats
      };
      
    } catch (error) {
      console.error('🎁 TREASURE: Error fetching user stats:', error);
      return {
        totalCollected: 0,
        totalCoinsEarned: 0,
        byDifficulty: []
      };
    }
  }
}

export const treasureChestService = new TreasureChestService();