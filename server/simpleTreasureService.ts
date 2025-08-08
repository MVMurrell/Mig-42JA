/**
 * Simple Treasure Chest Service
 * Manages treasure chest spawning, collection, and lifecycle using storage interface
 */

import { storage } from './storage.js';

export interface TreasureChest {
  id: string;
  latitude: string;
  longitude: string;
  coinReward: number;
  difficulty: string;
  spawnedAt: string;
  expiresAt: string;
  isCollected: boolean;
  nearestVideoId?: string;
  nearestVideoDistance?: number;
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

export class SimpleTreasureChestService {
  private readonly COLLECTION_RADIUS_FEET = 100;
  
  // Coin rewards and spawn probabilities
  private readonly CHEST_CONFIG = [
    { coinReward: 5, difficulty: 'easy' },
    { coinReward: 10, difficulty: 'medium' },
    { coinReward: 20, difficulty: 'hard' },
    { coinReward: 40, difficulty: 'very_hard' },
    { coinReward: 100, difficulty: 'extreme' }
  ];

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
   * Get random chest configuration
   */
  private getRandomChestConfig() {
    const randomIndex = Math.floor(Math.random() * this.CHEST_CONFIG.length);
    return this.CHEST_CONFIG[randomIndex];
  }

  /**
   * Spawn a treasure chest near a random video
   */
  async spawnTreasureChest(): Promise<string | null> {
    try {
      console.log('🎁 TREASURE: Attempting to spawn treasure chest...');
      
      // Get videos with location data
      const videos = await storage.getVideos();
      const videosWithLocation = videos.filter(v => v.latitude && v.longitude);
      
      if (videosWithLocation.length === 0) {
        console.log('🎁 TREASURE: No videos with location data found');
        return null;
      }

      // Pick a random video
      const randomVideo = videosWithLocation[Math.floor(Math.random() * videosWithLocation.length)];
      const videoLat = parseFloat(randomVideo.latitude!);
      const videoLng = parseFloat(randomVideo.longitude!);

      // Generate spawn location within 1 mile of video
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * 1; // 0-1 mile
      
      const latOffset = (distance / 69.0) * Math.cos(angle);
      const lngOffset = (distance / (69.0 * Math.cos(videoLat * Math.PI / 180))) * Math.sin(angle);
      
      const spawnLat = videoLat + latOffset;
      const spawnLng = videoLng + lngOffset;

      // Get chest configuration
      const config = this.getRandomChestConfig();
      
      // Set expiration (2-6 hours from now)
      const expirationHours = 2 + Math.random() * 4;
      const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);

      // Create chest object (simplified - using memory storage for now)
      const chest: TreasureChest = {
        id: Math.random().toString(36).substr(2, 9),
        latitude: spawnLat.toString(),
        longitude: spawnLng.toString(),
        coinReward: config.coinReward,
        difficulty: config.difficulty,
        spawnedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        isCollected: false,
        nearestVideoId: randomVideo.id,
        nearestVideoDistance: distance
      };

      // Store in memory (temporary solution)
      this.activeChests.set(chest.id, chest);
      
      console.log(`🎁 TREASURE: Spawned ${config.difficulty} chest with ${config.coinReward} coins at (${spawnLat.toFixed(6)}, ${spawnLng.toFixed(6)})`);
      
      return chest.id;
    } catch (error) {
      console.error('🎁 TREASURE: Error spawning chest:', error);
      return null;
    }
  }

  // In-memory storage for treasure chests (temporary)
  private activeChests = new Map<string, TreasureChest>();

  /**
   * Get all active treasure chests
   */
  async getActiveTreasureChests(): Promise<TreasureChest[]> {
    const now = new Date();
    const activeChests: TreasureChest[] = [];
    
    for (const [id, chest] of this.activeChests) {
      const expiresAt = new Date(chest.expiresAt);
      if (!chest.isCollected && expiresAt > now) {
        activeChests.push(chest);
      } else if (chest.isCollected || expiresAt <= now) {
        // Remove expired or collected chests
        this.activeChests.delete(id);
      }
    }
    
    console.log(`🎁 TREASURE: Returning ${activeChests.length} active chests`);
    return activeChests;
  }

  /**
   * Attempt to collect a treasure chest
   */
  async collectTreasureChest(attempt: CollectionAttempt): Promise<CollectionResult> {
    try {
      const chest = this.activeChests.get(attempt.chestId);
      
      if (!chest) {
        return {
          success: false,
          message: 'Treasure chest not found or expired'
        };
      }

      if (chest.isCollected) {
        return {
          success: false,
          message: 'Treasure chest already collected'
        };
      }

      // Check if chest has expired
      const now = new Date();
      const expiresAt = new Date(chest.expiresAt);
      if (expiresAt <= now) {
        this.activeChests.delete(attempt.chestId);
        return {
          success: false,
          message: 'Treasure chest has expired'
        };
      }

      // Check distance
      const chestLat = parseFloat(chest.latitude);
      const chestLng = parseFloat(chest.longitude);
      const distanceFeet = this.calculateDistanceFeet(
        attempt.userLatitude,
        attempt.userLongitude,
        chestLat,
        chestLng
      );

      if (distanceFeet > this.COLLECTION_RADIUS_FEET) {
        return {
          success: false,
          distanceFromChest: distanceFeet,
          message: `Too far from treasure chest. You need to be within ${this.COLLECTION_RADIUS_FEET} feet (currently ${Math.round(distanceFeet)} feet away)`
        };
      }

      // Award coins to user
      try {
        await storage.updateUserCoins(attempt.userId, chest.coinReward);
        
        // Mark chest as collected
        chest.isCollected = true;
        
        console.log(`🎁 TREASURE: User ${attempt.userId} collected ${chest.coinReward} coins from ${chest.difficulty} chest`);
        
        return {
          success: true,
          coinReward: chest.coinReward,
          distanceFromChest: distanceFeet,
          message: `Congratulations! You found ${chest.coinReward} coins in the treasure chest!`
        };
      } catch (error) {
        console.error('🎁 TREASURE: Error awarding coins:', error);
        return {
          success: false,
          message: 'Error collecting treasure chest. Please try again.'
        };
      }
    } catch (error) {
      console.error('🎁 TREASURE: Error in collection attempt:', error);
      return {
        success: false,
        message: 'Error collecting treasure chest. Please try again.'
      };
    }
  }

  /**
   * Clean up expired treasure chests
   */
  async cleanupExpiredChests(): Promise<number> {
    const now = new Date();
    let cleanedUp = 0;
    
    for (const [id, chest] of this.activeChests) {
      const expiresAt = new Date(chest.expiresAt);
      if (expiresAt <= now) {
        this.activeChests.delete(id);
        cleanedUp++;
      }
    }
    
    if (cleanedUp > 0) {
      console.log(`🎁 TREASURE: Cleaned up ${cleanedUp} expired chests`);
    }
    
    return cleanedUp;
  }

  /**
   * Get user's treasure collection stats
   */
  async getUserTreasureStats(userId: string) {
    // For now, return basic stats (would be stored in database in full implementation)
    return {
      totalCollected: 0,
      totalCoinsEarned: 0,
      chestsCollectedToday: 0
    };
  }
}

export const simpleTreasureChestService = new SimpleTreasureChestService();