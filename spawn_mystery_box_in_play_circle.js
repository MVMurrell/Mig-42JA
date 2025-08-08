/**
 * SPAWN MYSTERY BOX IN PLAY CIRCLE
 * 
 * This script spawns a mystery box directly within the user's play circle for immediate collection
 */

import { mysteryBoxService } from './server/mysteryBoxService.js.js';

async function spawnMysteryBoxInPlayCircle() {
  try {
    // User's current location from logs
    const userLat = 36.05720241599358;
    const userLng = -94.16056595730045;
    
    console.log('🎁 Spawning mystery box within play circle at:', userLat, userLng);
    
    const box = await mysteryBoxService.forceSpawnNearLocation(userLat, userLng);
    
    console.log('✅ Mystery box spawned successfully!');
    console.log(`📍 Location: ${box.latitude}, ${box.longitude}`);
    console.log(`🎁 Rewards: ${box.coinReward} coins, ${box.xpReward} XP, ${box.lanternReward} lanterns`);
    console.log(`⭐ Rarity: ${box.rarity}`);
    console.log(`🕒 Expires: ${box.expiresAt}`);
    
    // Calculate distance to verify it's within play circle
    const distanceMeters = calculateDistance(
      userLat, userLng,
      parseFloat(box.latitude), parseFloat(box.longitude)
    );
    const distanceFeet = distanceMeters * 3.28084;
    
    console.log(`📏 Distance from user: ${distanceFeet.toFixed(1)} feet`);
    console.log(`✅ Within collection radius (100 ft): ${distanceFeet <= 100}`);
    console.log(`✅ Within play circle (~30 ft): ${distanceFeet <= 30}`);
    
  } catch (error) {
    console.error('❌ Error spawning mystery box:', error);
  }
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lng2-lng1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

spawnMysteryBoxInPlayCircle();