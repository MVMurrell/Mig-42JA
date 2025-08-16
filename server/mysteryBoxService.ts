/**
 * MYSTERY BOX SERVICE
 * 
 * Handles spawning and collection of mystery boxes with multi-reward system.
 * Mystery boxes are rarer than treasure chests and give combinations of coins, XP, and lanterns.
 * Higher reward values mean shorter availability time and lower spawn rates.
 */

import { storage } from './storage.js';

export interface MysteryBox {
  id: string;
  latitude: string;
  longitude: string;
  coinReward: number;
  xpReward: number;
  lanternReward: number;
  rarity: string;
  spawnedAt: string;
  expiresAt: string;
  isCollected: boolean;
  nearestVideoId?: string;
  nearestVideoDistance?: number;
}

export interface MysteryBoxCollectionAttempt {
  userId: string;
  boxId: string;
  userLatitude: number;
  userLongitude: number;
}

export interface MysteryBoxCollectionResult {
  success: boolean;
  coinReward?: number;
  xpReward?: number;
  lanternReward?: number;
  rarity?: string;
  distanceFromBox?: number;
  message: string;
}

export class MysteryBoxService {
  private readonly COLLECTION_RADIUS_FEET = 100;
  private activeBoxes = new Map<string, MysteryBox>();
  
  // Mystery box configurations with rarity-based rewards and availability
  private readonly BOX_CONFIGS = [
    // Common boxes (longer availability, lower rewards)
    { 
      coinReward: { min: 1, max: 3 }, 
      xpReward: { min: 1, max: 5 }, 
      lanternReward: { min: 1, max: 2 }, 
      rarity: 'common',
      availabilityHours: { min: 2, max: 4 }, // 2-4 hours
      spawnWeight: 50 // Higher chance to spawn
    },
    // Rare boxes (medium availability, medium rewards)
    { 
      coinReward: { min: 3, max: 6 }, 
      xpReward: { min: 5, max: 12 }, 
      lanternReward: { min: 2, max: 5 }, 
      rarity: 'rare',
      availabilityHours: { min: 1, max: 2.5 }, // 1-2.5 hours
      spawnWeight: 30
    },
    // Epic boxes (short availability, high rewards)
    { 
      coinReward: { min: 6, max: 8 }, 
      xpReward: { min: 12, max: 17 }, 
      lanternReward: { min: 5, max: 8 }, 
      rarity: 'epic',
      availabilityHours: { min: 0.5, max: 1.5 }, // 30-90 minutes
      spawnWeight: 15
    },
    // Legendary boxes (very short availability, maximum rewards)
    { 
      coinReward: { min: 8, max: 10 }, 
      xpReward: { min: 17, max: 20 }, 
      lanternReward: { min: 8, max: 10 }, 
      rarity: 'legendary',
      availabilityHours: { min: 0.25, max: 1 }, // 15-60 minutes
      spawnWeight: 5 // Very rare
    }
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
   * Get weighted random box configuration based on rarity
   */
  private getRandomBoxConfig() {
    const totalWeight = this.BOX_CONFIGS.reduce((sum, config) => sum + config.spawnWeight, 0);
    const randomValue = Math.random() * totalWeight;
    
    let currentWeight = 0;
    for (const config of this.BOX_CONFIGS) {
      currentWeight += config.spawnWeight;
      if (randomValue <= currentWeight) {
        return config;
      }
    }
    
    // Fallback to common if something goes wrong
    return this.BOX_CONFIGS[0];
  }

  /**
   * Generate random reward within range
   */
  private generateReward(range: { min: number; max: number }): number {
    return range.min + Math.floor(Math.random() * (range.max - range.min + 1));
  }

  /**
   * Spawn a mystery box near a random video (less frequent than treasure chests)
   */
  async spawnMysteryBox(forceSpawn: boolean = false): Promise<string | null> {
    try {
      console.log('🎁 MYSTERY BOX: Attempting to spawn mystery box...');
      
      // Mystery boxes spawn less frequently - 30% chance when called (unless forced)
      if (!forceSpawn && Math.random() > 0.3) {
        console.log('🎁 MYSTERY BOX: Spawn chance failed (30% chance)');
        return null;
      }
      
      // Get videos with location data
      const videos = await storage.getVideos();
      const videosWithLocation = videos.filter(v => v.latitude && v.longitude);
      
      if (videosWithLocation.length === 0) {
        console.log('🎁 MYSTERY BOX: No videos with location data found');
        return null;
      }

      console.log(`🎁 MYSTERY BOX: Found ${videosWithLocation.length} videos with location data`);
      
      // Debug: Log all videos to see what we're working with
      videosWithLocation.forEach(video => {
        console.log(`🎁 MYSTERY BOX: Video ${video.id} at ${video.latitude}, ${video.longitude} - ${video.title}`);
      });

      // Pick a random video
      const randomVideo = videosWithLocation[Math.floor(Math.random() * videosWithLocation.length)];
      const videoLat = parseFloat(randomVideo.latitude!);
      const videoLng = parseFloat(randomVideo.longitude!);

      console.log(`🎁 MYSTERY BOX: Selected video "${randomVideo.title}" at ${videoLat}, ${videoLng}`);

      // Generate spawn location within 0.5 mile of video (closer than treasure chests)
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * 0.5; // 0-0.5 mile
      
      const latOffset = (distance / 69.0) * Math.cos(angle);
      const lngOffset = (distance / (69.0 * Math.cos(videoLat * Math.PI / 180))) * Math.sin(angle);
      
      const spawnLat = videoLat + latOffset;
      const spawnLng = videoLng + lngOffset;

      console.log(`🎁 MYSTERY BOX: Spawning ${distance.toFixed(3)} miles from video at ${spawnLat.toFixed(6)}, ${spawnLng.toFixed(6)}`);

      // Get box configuration
      const config = this.getRandomBoxConfig();
      
      // Generate rewards within ranges
      const coinReward = this.generateReward(config.coinReward);
      const xpReward = this.generateReward(config.xpReward);
      const lanternReward = this.generateReward(config.lanternReward);
      
      // Set expiration based on rarity (rarer = shorter availability)
      const availabilityRange = config.availabilityHours;
      const expirationHours = availabilityRange.min + Math.random() * (availabilityRange.max - availabilityRange.min);
      const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);

      // Create mystery box object
      const box: MysteryBox = {
        id: Math.random().toString(36).substr(2, 9),
        latitude: spawnLat.toString(),
        longitude: spawnLng.toString(),
        coinReward,
        xpReward,
        lanternReward,
        rarity: config.rarity,
        spawnedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        isCollected: false,
        nearestVideoId: randomVideo.id,
        nearestVideoDistance: distance
      };

      // Store in memory
      this.activeBoxes.set(box.id, box);
      
      console.log(`🎁 MYSTERY BOX: Spawned ${config.rarity} box with ${coinReward} coins, ${xpReward} XP, ${lanternReward} lanterns at (${spawnLat.toFixed(6)}, ${spawnLng.toFixed(6)}) - expires in ${expirationHours.toFixed(1)}h - Near video: ${randomVideo.title}`);
      
      return box.id;
    } catch (error) {
      console.error('🎁 MYSTERY BOX: Error spawning box:', error);
      return null;
    }
  }

  /**
   * Get all active mystery boxes
   */
  async getActiveMysteryBoxes(): Promise<MysteryBox[]> {
    const now = new Date();
    const activeBoxes: MysteryBox[] = [];
    
    for (const [id, box] of this.activeBoxes) {
      const expiresAt = new Date(box.expiresAt);
      if (!box.isCollected && expiresAt > now) {
        activeBoxes.push(box);
      } else if (box.isCollected || expiresAt <= now) {
        // Remove expired or collected boxes
        this.activeBoxes.delete(id);
      }
    }
    
    console.log(`🎁 MYSTERY BOX: Returning ${activeBoxes.length} active boxes`);
    return activeBoxes;
  }

  /**
   * Attempt to collect a mystery box
   */
  async collectMysteryBox(attempt: MysteryBoxCollectionAttempt): Promise<MysteryBoxCollectionResult> {
    try {
      const box = this.activeBoxes.get(attempt.boxId);
      
      if (!box) {
        return {
          success: false,
          message: 'Mystery box not found or expired'
        };
      }

      if (box.isCollected) {
        return {
          success: false,
          message: 'Mystery box already collected'
        };
      }

      // Check if box has expired
      const now = new Date();
      const expiresAt = new Date(box.expiresAt);
      if (expiresAt <= now) {
        this.activeBoxes.delete(attempt.boxId);
        return {
          success: false,
          message: 'Mystery box has expired'
        };
      }

      // Check distance
      const boxLat = parseFloat(box.latitude);
      const boxLng = parseFloat(box.longitude);
      const distanceFeet = this.calculateDistanceFeet(
        attempt.userLatitude,
        attempt.userLongitude,
        boxLat,
        boxLng
      );

      if (distanceFeet > this.COLLECTION_RADIUS_FEET) {
        return {
          success: false,
          distanceFromBox: distanceFeet,
          message: `Too far from mystery box. You need to be within ${this.COLLECTION_RADIUS_FEET} feet (currently ${Math.round(distanceFeet)} feet away)`
        };
      }

      try {
        // Award multiple rewards
        await storage.updateUserGemCoins(attempt.userId, box.coinReward);
        await storage.updateUserLanterns(attempt.userId, box.lanternReward);
        
        // Award XP separately (this handles level up logic)
        const xpResult = await storage.awardXP(attempt.userId, box.xpReward, 'MYSTERY_BOX');
        
        // Mark box as collected
        box.isCollected = true;
        
        console.log(`🎁 MYSTERY BOX: User ${attempt.userId} collected ${box.rarity} box: ${box.coinReward} coins, ${box.xpReward} XP, ${box.lanternReward} lanterns`);
        
        return {
          success: true,
          coinReward: box.coinReward,
          xpReward: box.xpReward,
          lanternReward: box.lanternReward,
          rarity: box.rarity,
          distanceFromBox: distanceFeet,
          message: `Amazing! You found a ${box.rarity} mystery box with ${box.coinReward} coins, ${box.xpReward} XP, and ${box.lanternReward} lanterns!`
        };
      } catch (error) {
        console.error('🎁 MYSTERY BOX: Error awarding rewards:', error);
        return {
          success: false,
          message: 'Error collecting mystery box. Please try again.'
        };
      }
    } catch (error) {
      console.error('🎁 MYSTERY BOX: Error in collection attempt:', error);
      return {
        success: false,
        message: 'Error collecting mystery box. Please try again.'
      };
    }
  }

  /**
   * Force spawn a mystery box near specified location (for testing)
   */
  async forceSpawnNearLocation(latitude: number, longitude: number): Promise<MysteryBox> {
    // Generate random offset within 30 feet (play circle radius)
    const offsetLat = (Math.random() - 0.5) * 0.0002; // ~20 feet
    const offsetLng = (Math.random() - 0.5) * 0.0002; // ~20 feet
    
    const boxLat = latitude + offsetLat;
    const boxLng = longitude + offsetLng;
    
    // Choose a good config for testing
    const config = this.BOX_CONFIGS[1]; // Rare box with good rewards
    
    const coinReward = Math.floor(Math.random() * (config.coinReward.max - config.coinReward.min + 1)) + config.coinReward.min;
    const xpReward = Math.floor(Math.random() * (config.xpReward.max - config.xpReward.min + 1)) + config.xpReward.min;
    const lanternReward = Math.floor(Math.random() * (config.lanternReward.max - config.lanternReward.min + 1)) + config.lanternReward.min;
    
    // Set reasonable availability (30 minutes for testing)
    const availabilityMinutes = 30;
    const spawnedAt = new Date();
    const expiresAt = new Date(spawnedAt.getTime() + availabilityMinutes * 60 * 1000);
    
    const box: MysteryBox = {
      id: Math.random().toString(36).substr(2, 9),
      latitude: boxLat.toString(),
      longitude: boxLng.toString(),
      coinReward,
      xpReward,
      lanternReward,
      rarity: config.rarity,
      spawnedAt: spawnedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      isCollected: false
    };
    
    this.activeBoxes.set(box.id, box);
    console.log(`🎁 MYSTERY BOX: Force spawned ${box.rarity} box near location (${boxLat}, ${boxLng}) - ${coinReward} coins, ${xpReward} XP, ${lanternReward} lanterns`);
    
    return box;
  }

  /**
   * Manually add a mystery box to active boxes (for testing)
   */
  addTestMysteryBox(latitude: number, longitude: number): MysteryBox {
    const boxId = 'test-box-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    const box: MysteryBox = {
      id: boxId,
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      coinReward: 5,
      xpReward: 15,
      lanternReward: 3,
      rarity: 'rare',
      spawnedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      isCollected: false
    };

    this.activeBoxes.set(boxId, box);
    console.log(`🎁 MYSTERY BOX: Added test box ${boxId} at (${latitude}, ${longitude})`);
    return box;
  }

  /**
   * Clean up expired boxes (called periodically)
   */
  async cleanupExpiredBoxes(): Promise<void> {
    const now = new Date();
    const expiredIds: string[] = [];
    
    for (const [id, box] of this.activeBoxes) {
      const expiresAt = new Date(box.expiresAt);
      if (expiresAt <= now) {
        expiredIds.push(id);
      }
    }
    
    expiredIds.forEach(id => this.activeBoxes.delete(id));
    
    if (expiredIds.length > 0) {
      console.log(`🎁 MYSTERY BOX: Cleaned up ${expiredIds.length} expired boxes`);
    }
  }
}

// Export singleton instance
export const mysteryBoxService = new MysteryBoxService();