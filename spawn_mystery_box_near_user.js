/**
 * SPAWN MYSTERY BOX NEAR USER
 * 
 * This script spawns a mystery box near your current location for testing the collection flow
 */

async function spawnMysteryBoxNearUser() {
  try {
    // Your current location from the logs
    const userLocation = {
      latitude: 36.05720241599358,
      longitude: -94.16056595730045
    };

    console.log('🎁 Spawning mystery box near user location:', userLocation);

    const response = await fetch('http://localhost:5000/api/mystery-boxes/force-spawn-near', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=your-session-cookie' // Would need actual session
      },
      body: JSON.stringify(userLocation)
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Success! Mystery box spawned:', result.box);
      console.log(`📍 Location: ${result.box.latitude}, ${result.box.longitude}`);
      console.log(`🎁 Rewards: ${result.box.coinReward} coins, ${result.box.xpReward} XP, ${result.box.lanternReward} lanterns`);
      console.log(`⭐ Rarity: ${result.box.rarity}`);
    } else {
      console.error('❌ Failed to spawn mystery box:', result.message);
    }
  } catch (error) {
    console.error('❌ Error spawning mystery box:', error);
  }
}

spawnMysteryBoxNearUser();