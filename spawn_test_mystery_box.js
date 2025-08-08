/**
 * SPAWN TEST MYSTERY BOX
 * 
 * This script spawns a mystery box for testing the new simplified design
 */

import { Pool } from '@neondatabase/serverless';

async function spawnTestMysteryBox() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('🎁 MYSTERY BOX: Spawning test mystery box...');
    
    // Spawn mystery box near user location (Fayetteville area)
    const latitude = 36.0571 + (Math.random() - 0.5) * 0.01; // Small random offset
    const longitude = -94.1603 + (Math.random() - 0.5) * 0.01;
    
    // Random rarity (higher chance of rare for testing)
    const rarities = ['common', 'rare', 'epic', 'legendary'];
    const rarity = rarities[Math.floor(Math.random() * rarities.length)];
    
    // Rarity-based rewards
    const rewardsByRarity = {
      'common': { coins: 2, xp: 5, lanterns: 1, duration: 30 }, // 30 minutes
      'rare': { coins: 5, xp: 10, lanterns: 2, duration: 60 }, // 1 hour
      'epic': { coins: 10, xp: 20, lanterns: 3, duration: 120 }, // 2 hours
      'legendary': { coins: 25, xp: 50, lanterns: 5, duration: 240 } // 4 hours
    };
    
    const rewards = rewardsByRarity[rarity];
    const expiresAt = new Date(Date.now() + rewards.duration * 60 * 1000); // Convert minutes to milliseconds
    
    const result = await pool.query(`
      INSERT INTO mystery_boxes (
        latitude, longitude, coin_reward, xp_reward, lantern_reward, 
        rarity, expires_at, is_active, is_collected
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, false)
      RETURNING id, latitude, longitude, coin_reward, xp_reward, lantern_reward, rarity, expires_at
    `, [
      latitude.toString(),
      longitude.toString(),
      rewards.coins,
      rewards.xp,
      rewards.lanterns,
      rarity,
      expiresAt
    ]);
    
    const mysteryBox = result.rows[0];
    
    console.log('🎁 MYSTERY BOX: Successfully spawned test mystery box:', {
      id: mysteryBox.id,
      location: `${mysteryBox.latitude}, ${mysteryBox.longitude}`,
      rarity: mysteryBox.rarity,
      rewards: {
        coins: mysteryBox.coin_reward,
        xp: mysteryBox.xp_reward,
        lanterns: mysteryBox.lantern_reward
      },
      expiresAt: mysteryBox.expires_at
    });
    
    console.log('🎁 MYSTERY BOX: Test mystery box spawned successfully! Check the map.');
    
  } catch (error) {
    console.error('🎁 ERROR: Failed to spawn mystery box:', error);
  } finally {
    await pool.end();
  }
}

spawnTestMysteryBox();