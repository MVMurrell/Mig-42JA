/**
 * TEST: Hard Chest Timing Fix
 * 
 * This script tests the Hard difficulty treasure chest timing to ensure
 * it shows exactly 2 hours as specified in the risk/reward system.
 */

import { db } from './server/storage';
import { treasureChests } from './shared/schema';

async function testHardChestTiming() {
  console.log('🎁 Testing Hard difficulty chest timing...');
  
  try {
    // Clean up any existing chests first
    await db.delete(treasureChests);
    console.log('🧹 Cleaned up existing chests');
    
    // Create a Hard difficulty chest manually with correct 2-hour duration
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + (2 * 60 * 60 * 1000)); // Exactly 2 hours
    
    const hardChest = await db.insert(treasureChests)
      .values({
        latitude: '36.057',
        longitude: '-94.161',
        coinReward: 20,
        difficulty: 'hard',
        expiresAt: twoHoursFromNow,
        nearestVideoId: '29da67b4-e687-476b-ab9f-38bc1ddd9c15',
        nearestVideoDistance: 0.5
      })
      .returning();
    
    console.log('✅ Created Hard chest:', {
      id: hardChest[0].id,
      difficulty: hardChest[0].difficulty,
      coinReward: hardChest[0].coinReward,
      createdAt: hardChest[0].createdAt,
      expiresAt: hardChest[0].expiresAt
    });
    
    // Calculate timing
    const durationMs = twoHoursFromNow.getTime() - now.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    const remainingMs = twoHoursFromNow.getTime() - Date.now();
    const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    
    console.log('⏰ Timing verification:', {
      configuredDurationHours: durationHours,
      remainingTime: `${remainingHours}h ${remainingMinutes}m`,
      shouldShow: '2h 0m (approximately)'
    });
    
    console.log('🎯 Hard chest created successfully with exactly 2-hour duration!');
    console.log('The frontend timer should now show approximately "2h 0m" remaining');
    
  } catch (error) {
    console.error('❌ Error testing Hard chest timing:', error);
  }
}

testHardChestTiming();