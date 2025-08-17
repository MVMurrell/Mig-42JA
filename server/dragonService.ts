/**
 * Dragon Service - Manages cooperative dragon challenges
 * 
 * Features:
 * - Spawns dragons only where 50+ videos exist within 200ft radius
 * - Maintains 10+ mile distance between dragons
 * - 24-hour availability window per dragon
 * - Cooperative defeat mechanism requiring multiple users
 * - Proportional coin rewards based on user contribution
 */

import { db } from './db.ts';
import { videos, dragons, dragonAttacks, dragonRewards, users } from '../shared/schema.ts';
import { eq, and, sql, gt, lt, ne, isNotNull } from 'drizzle-orm';
type DBDragonAttackInsert =  typeof dragonAttacks.$inferInsert;  

interface LocationData {
  latitude: number;
  longitude: number;
}

interface DragonSpawnData {
  latitude: string;
  longitude: string;
  coinReward: number;
  totalHealth: number;
  currentHealth: number;
  videoCount: number;
  nearestVideoIds: string[];
  expiresAt: Date;
}

class DragonService {
  private readonly SPAWN_CHECK_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 1 week
  private readonly MIN_VIDEOS_IN_RADIUS = 50; // Production: 50+ videos required in attack radius
  private readonly DRAGON_RADIUS_METERS = 60.96; // 200ft
  private readonly MIN_DISTANCE_BETWEEN_DRAGONS = 16093.4; // Production: 10 miles between dragons
  private readonly DRAGON_LIFESPAN_HOURS = 24;
  private readonly MAX_ACTIVE_DRAGONS = 10; // Global limit

  constructor() {
    console.log('🐉 Dragon Service initialized');
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  /**
   * Find all videos within radius of a location
   */
  private async findVideosInRadius(latitude: number, longitude: number, radiusMeters: number) {
    // Use ST_DWithin for proper geographic distance calculation
    const nearbyVideos = await db
      .select({
        id: videos.id,
        latitude: videos.latitude,
        longitude: videos.longitude,
        title: videos.title
      })
      .from(videos)
      .where(
        and(
          eq(videos.isActive, true),
          eq(videos.processingStatus, 'approved'), // Only count approved videos that users can watch
          isNotNull(videos.latitude),
          isNotNull(videos.longitude),
          sql`ST_DWithin(
            ST_MakePoint(${videos.longitude}::float, ${videos.latitude}::float)::geography,
            ST_MakePoint(${longitude}, ${latitude})::geography,
            ${radiusMeters}
          )`
        )
      );

    return nearbyVideos;
  }

  /**
   * Check if location is valid for dragon spawn (minimum distance from existing dragons)
   */
  private async isValidDragonLocation(latitude: number, longitude: number): Promise<boolean> {
    const existingDragons = await db
      .select({
        latitude: dragons.latitude,
        longitude: dragons.longitude
      })
      .from(dragons)
      .where(
        and(
          eq(dragons.isActive, true),
          gt(dragons.expiresAt, new Date())
        )
      );

    // Check distance from all existing active dragons
    for (const dragon of existingDragons) {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        parseFloat(dragon.latitude),
        parseFloat(dragon.longitude)
      );

      if (distance < this.MIN_DISTANCE_BETWEEN_DRAGONS) {
        return false;
      }
    }

    return true;
  }

  /**
   * Find potential dragon spawn locations
   */
  private async findPotentialSpawnLocations(): Promise<DragonSpawnData[]> {
    console.log('🐉 DRAGON: Finding potential spawn locations...');

    // First, debug what's in the database without any filters
    const allVideosCount = await db
      .select({ count: sql`COUNT(*)` })
      .from(videos);
    console.log('🐉 DRAGON: Total videos in database:', allVideosCount);

    // Check each filter condition separately
    const activeVideos = await db
      .select({ count: sql`COUNT(*)` })
      .from(videos)
      .where(eq(videos.isActive, true));
    console.log('🐉 DRAGON: Active videos:', activeVideos);

    const approvedVideos = await db
      .select({ count: sql`COUNT(*)` })
      .from(videos)
      .where(eq(videos.processingStatus, 'approved'));
    console.log('🐉 DRAGON: Approved videos:', approvedVideos);

    const coordVideos = await db
      .select({ count: sql`COUNT(*)` })
      .from(videos)
      .where(and(
        isNotNull(videos.latitude),
        isNotNull(videos.longitude)
      ));
    console.log('🐉 DRAGON: Videos with coordinates:', coordVideos);

    // Get all approved videos with coordinates
    const allVideos = await db
      .select({
        id: videos.id,
        latitude: videos.latitude,
        longitude: videos.longitude,
        title: videos.title,
        isActive: videos.isActive,
        processingStatus: videos.processingStatus
      })
      .from(videos)
      .where(
        and(
          eq(videos.isActive, true),
          // TODO: For testing, accept any video with coordinates - in production, change back to 'approved' only  
          // eq(videos.processingStatus, 'approved'),
          isNotNull(videos.latitude),
          isNotNull(videos.longitude)
        )
      );

    console.log(`🐉 DRAGON: Analyzing ${allVideos.length} videos for spawn potential`);
    
    // Debug: Log all videos found
    if (allVideos.length > 0) {
      console.log('🐉 DRAGON: Found videos:', allVideos.map(v => ({
        id: v.id,
        title: v.title,
        lat: v.latitude,
        lng: v.longitude,
        isActive: v.isActive,
        status: v.processingStatus
      })));
    } else {
      console.log('🐉 DRAGON: No videos found matching criteria');
    }

    const potentialLocations: DragonSpawnData[] = [];
    const processedCoordinates = new Set<string>();

    // Group videos by approximate location (to avoid duplicate spawns in same area)
    for (const video of allVideos) {
      const lat = parseFloat(video.latitude!);
      const lng = parseFloat(video.longitude!);
      
      // Round coordinates to avoid duplicate checks for very close locations
      const coordinateKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
      if (processedCoordinates.has(coordinateKey)) {
        continue;
      }
      processedCoordinates.add(coordinateKey);

      // Check if this location is valid for dragon spawn
      if (!(await this.isValidDragonLocation(lat, lng))) {
        continue;
      }

      // Find all videos within dragon radius
      const videosInRadius = await this.findVideosInRadius(lat, lng, this.DRAGON_RADIUS_METERS);

      // Check if we have enough videos for a dragon spawn
      if (videosInRadius.length >= this.MIN_VIDEOS_IN_RADIUS) {
        // Determine coin reward based on video density
        const coinReward = videosInRadius.length >= 100 ? 200 : 100;
        
        console.log(`🐉 DRAGON: Potential spawn at ${lat.toFixed(6)}, ${lng.toFixed(6)} with ${videosInRadius.length} videos (${coinReward} coin reward)`);

        potentialLocations.push({
          latitude: lat.toString(),
          longitude: lng.toString(),
          coinReward,
          totalHealth: coinReward, // Health equals reward amount
          currentHealth: coinReward,
          videoCount: videosInRadius.length,
          nearestVideoIds: videosInRadius.map(v => v.id),
          expiresAt: new Date(Date.now() + (this.DRAGON_LIFESPAN_HOURS * 60 * 60 * 1000))
        });
      }
    }

    console.log(`🐉 DRAGON: Found ${potentialLocations.length} potential spawn locations`);
    return potentialLocations;
  }

  /**
   * Spawn a new dragon at the best available location
   */
  public async spawnDragon(): Promise<boolean> {
    try {
      console.log('🐉 DRAGON: Checking for dragon spawn opportunity...');

      // Check if we're at max dragon limit
      const activeDragons = await db
        .select()
        .from(dragons)
        .where(
          and(
            eq(dragons.isActive, true),
            gt(dragons.expiresAt, new Date()),
            eq(dragons.isDefeated, false)
          )
        );

      if (activeDragons.length >= this.MAX_ACTIVE_DRAGONS) {
        console.log(`🐉 DRAGON: Max dragons (${this.MAX_ACTIVE_DRAGONS}) already active`);
        return false;
      }

      const potentialLocations = await this.findPotentialSpawnLocations();
      
      if (potentialLocations.length === 0) {
        console.log('🐉 DRAGON: No suitable locations found for dragon spawn');
        return false;
      }

      // Select the location with most videos (highest priority)
      const bestLocation = potentialLocations.reduce((best, current) => 
        current.videoCount > best.videoCount ? current : best
      );

      // Create the dragon
      const [newDragon] = await db
        .insert(dragons)
        .values(bestLocation)
        .returning();

      console.log(`🐉 DRAGON: Successfully spawned dragon ${newDragon.id} at ${bestLocation.latitude}, ${bestLocation.longitude} with ${bestLocation.videoCount} videos and ${bestLocation.coinReward} coin reward!`);
      
      return true;
    } catch (error) {
      console.error('🐉 DRAGON: Error spawning dragon:', error);
      return false;
    }
  }

  /**
   * Attack a dragon by watching a video in its radius
   */
  public async attackDragon(dragonId: string, userId: string, videoId: string): Promise<{ success: boolean; message: string; dragonDefeated?: boolean; coinsEarned?: number }> {
    try {
      console.log(`🐉 ATTACK: User ${userId} attacking dragon ${dragonId} with video ${videoId}`);

      // User ID is already in database format from routes.ts
      const mappedUserId = userId;

      // Get dragon details
      const [dragon] = await db
        .select()
        .from(dragons)
        .where(eq(dragons.id, dragonId));

      if (!dragon) {
        return { success: false, message: 'Dragon not found' };
      }

      if (dragon.isDefeated) {
        return { success: false, message: 'Dragon has already been defeated' };
      }

      if (new Date() > dragon.expiresAt) {
        return { success: false, message: 'Dragon has expired' };
      }

      // Check if user has already attacked this dragon
      const existingAttack = await db
        .select()
        .from(dragonAttacks)
        .where(
          and(
            eq(dragonAttacks.dragonId, dragonId),
            eq(dragonAttacks.userId, mappedUserId)
          )
        );

      if (existingAttack.length > 0) {
        return { success: false, message: 'You have already attacked this dragon' };
      }

      // Verify video is within dragon radius
      const [video] = await db
        .select()
        .from(videos)
        .where(eq(videos.id, videoId));

      if (!video || !video.latitude || !video.longitude) {
        return { success: false, message: 'Video not found or has no location data' };
      }

      const distance = this.calculateDistance(
        parseFloat(dragon.latitude),
        parseFloat(dragon.longitude),
        parseFloat(video.latitude),
        parseFloat(video.longitude)
      );

      if (distance > this.DRAGON_RADIUS_METERS) {
        return { success: false, message: 'Video is not within dragon radius' };
      }

      // Record the attack
      await db
        .insert(dragonAttacks)
        .values({
          dragonId: dragonId,
          userId: mappedUserId,
          videoId: videoId,
          damageDealt: 1
        } as DBDragonAttackInsert);

      // Update dragon health
      const newHealth = dragon.currentHealth - 1;
      
      await db
        .update(dragons)
        .set({ currentHealth: newHealth })
        .where(eq(dragons.id, dragonId));

      console.log(`🐉 ATTACK: Dragon ${dragonId} health reduced to ${newHealth}/${dragon.totalHealth}`);

      // Check if dragon is defeated
      if (newHealth <= 0) {
        return await this.defeatDragon(dragonId);
      }

      return {
        success: true,
        message: `Attack successful! Dragon health: ${newHealth}/${dragon.totalHealth}`
      };

    } catch (error) {
      console.error('🐉 ATTACK: Error attacking dragon:', error);
      return { success: false, message: 'Failed to attack dragon' };
    }
  }

  /**
   * Handle dragon defeat and distribute rewards
   */
  private async defeatDragon(dragonId: string): Promise<{ success: boolean; message: string; dragonDefeated: boolean; coinsEarned?: number }> {
    console.log(`🐉 DEFEAT: Dragon ${dragonId} has been defeated!`);

    // Mark dragon as defeated
    await db
      .update(dragons)
      .set({
        isDefeated: true,
        defeatedAt: new Date(),
        currentHealth: 0
      } as Partial<typeof dragons.$inferInsert>)
      .where(eq(dragons.id, dragonId));

    // Get all attackers
    const attackers = await db
      .select()
      .from(dragonAttacks)
      .where(eq(dragonAttacks.dragonId, dragonId));

    // Get dragon details for reward calculation
    const [dragon] = await db
      .select()
      .from(dragons)
      .where(eq(dragons.id, dragonId));

    if (!dragon) {
      console.error('🐉 DEFEAT: Dragon not found during reward distribution');
      return { success: false, message: 'Dragon not found', dragonDefeated: true };
    }

    // Calculate and distribute rewards
    const totalDamage = attackers.reduce((sum, attack) => sum + attack.damageDealt, 0);
    const coinReward = dragon.coinReward;

    console.log(`🐉 DEFEAT: Distributing ${coinReward} coins among ${attackers.length} attackers`);

    for (const attacker of attackers) {
      const damagePercentage = attacker.damageDealt / totalDamage;
      const coinsEarned = Math.floor(coinReward * damagePercentage);

      // Award coins to user
      await db
        .update(users)
        .set({
          gemCoins: sql`${users.gemCoins} + ${coinsEarned}`
        } as Partial<typeof users.$inferInsert>)
        .where(eq(users.id, attacker.userId));

      // Record reward
      await db
        .insert(dragonRewards)
        .values({
          dragonId,
          userId: attacker.userId,
          coinsEarned,
          damageContribution: attacker.damageDealt,
          totalDamageDealt: totalDamage
        });

      console.log(`🐉 DEFEAT: Awarded ${coinsEarned} coins to user ${attacker.userId} (${(damagePercentage * 100).toFixed(1)}% contribution)`);
    }

    return {
      success: true,
      message: `Dragon defeated! ${coinReward} coins distributed among ${attackers.length} heroes!`,
      dragonDefeated: true
    };
  }

  /**
   * Get all active dragons
   */
  public async getActiveDragons() {
    const activeDragons = await db
      .select()
      .from(dragons)
      .where(
        and(
          eq(dragons.isActive, true),
          gt(dragons.expiresAt, new Date()),
          eq(dragons.isDefeated, false)
        )
      );

    return activeDragons;
  }

  /**
   * Get dragon details including attack progress
   */
  public async getDragonDetails(dragonId: string) {
    const [dragon] = await db
      .select()
      .from(dragons)
      .where(eq(dragons.id, dragonId));

    if (!dragon) {
      return null;
    }

    const attacks = await db
      .select()
      .from(dragonAttacks)
      .where(eq(dragonAttacks.dragonId, dragonId));

    return {
      ...dragon,
      attackCount: attacks.length,
      participants: attacks.length
    };
  }

  /**
   * Normalize user ID by removing duplicate prefixes
   */
  private normalizeUserId(userId: string): string {
    // Handle double-prefixed IDs like "replit|google-oauth2|117032826996185616207"
    if (userId.startsWith('replit|') && userId.includes('|', 7)) {
      const normalized = userId.substring(7); // Remove "replit|" prefix
      console.log(`🐉 NORMALIZE: Fixed double-prefixed user ID: ${userId} → ${normalized}`);
      return normalized;
    }
    return userId;
  }

  /**
   * Get comprehensive dragon details with attacker information for the modal
   */
  public async getDragonDetailsWithAttacks(dragonId: string) {
    const [dragon] = await db
      .select()
      .from(dragons)
      .where(eq(dragons.id, dragonId));

    if (!dragon) {
      return null;
    }

    // Get all attacks for this dragon
    const attacks = await db
      .select()
      .from(dragonAttacks)
      .where(eq(dragonAttacks.dragonId, dragonId));

    // Calculate attacker summaries with normalized user IDs
    const attackerMap = new Map<string, { userId: string; totalDamage: number; }>();
    
    for (const attack of attacks) {
      const normalizedUserId = this.normalizeUserId(attack.userId);
      const existing = attackerMap.get(normalizedUserId);
      if (existing) {
        existing.totalDamage += attack.damageDealt;
      } else {
        attackerMap.set(normalizedUserId, {
          userId: normalizedUserId,
          totalDamage: attack.damageDealt
        });
      }
    }

    const attackers = Array.from(attackerMap.values())
      .sort((a, b) => b.totalDamage - a.totalDamage); // Sort by damage descending

    return {
      ...dragon,
      attacks,
      attackers
    };
  }

  /**
   * Cleanup expired dragons
   */
  public async cleanupExpiredDragons() {
    const expired = await db
      .update(dragons)
      .set({ isActive: false } as Partial<typeof dragons.$inferInsert>)
      .where(
        and(
          eq(dragons.isActive, true),
          lt(dragons.expiresAt, new Date())
        )
      )
      .returning();

    if (expired.length > 0) {
      console.log(`🐉 CLEANUP: Deactivated ${expired.length} expired dragons`);
    }

    return expired.length;
  }

  /**
   * Start dragon spawning system
   */
  public startDragonSystem() {
    console.log('🐉 Starting dragon system...');
    
    // Initial cleanup
    this.cleanupExpiredDragons();
    
    // Check for spawn opportunity immediately
    setTimeout(() => {
      this.spawnDragon();
    }, 5000); // 5 second delay to let server fully start

    // Set up periodic spawn checks (once per week)
    setInterval(async () => {
      await this.cleanupExpiredDragons();
      await this.spawnDragon();
    }, this.SPAWN_CHECK_INTERVAL);

    // Set up daily cleanup
    setInterval(() => {
      this.cleanupExpiredDragons();
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }
}

export const dragonService = new DragonService();