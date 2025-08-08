/**
 * TEST TREASURE CHEST SPAWNING
 * 
 * This script tests the treasure chest spawning system to confirm it's working
 */

import { TreasureChestService } from './server/treasureChestService.js.js';

async function testTreasureSpawning() {
  console.log('🎁 TESTING: Starting treasure chest spawn test...');
  
  try {
    const service = new TreasureChestService();
    
    // Test spawning a treasure chest
    const chestId = await service.spawnTreasureChest();
    
    if (chestId) {
      console.log(`✅ SUCCESS: Spawned treasure chest with ID: ${chestId}`);
      
      // Get active chests to confirm it was created
      const activeChests = await service.getActiveTreasureChests();
      console.log(`🎁 ACTIVE CHESTS: Found ${activeChests.length} active treasure chests`);
      
      if (activeChests.length > 0) {
        console.log('📍 CHEST DETAILS:', activeChests[0]);
      }
    } else {
      console.log('❌ FAILED: Could not spawn treasure chest');
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error);
  }
}

testTreasureSpawning();