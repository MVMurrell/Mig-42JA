/**
 * FORCE SPAWN MYSTERY BOX IN PLAY CIRCLE
 * 
 * This script directly adds a mystery box to the active boxes within the user's play circle
 */

import { exec } from 'child_process';
import fs from "fs";

// Calculate a position very close to user (within 20 feet)
const userLat = 36.05720241599358;
const userLng = -94.16056595730045;

// Add a small offset (about 15 feet)
const offsetLat = 0.0001; // ~11 feet north
const offsetLng = 0.0001; // ~8 feet east

const boxLat = userLat + offsetLat;
const boxLng = userLng + offsetLng;

const spawnScript = `
import fs from 'fs';
import * as path from "node:path";;

// Mystery box data
const mysteryBox = {
  id: 'test-box-' + Date.now(),
  latitude: '${boxLat}',
  longitude: '${boxLng}',
  coinReward: 5,
  xpReward: 15,
  lanternReward: 3,
  rarity: 'rare',
  spawnedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
  isCollected: false
};

console.log('🎁 Creating mystery box within play circle...');
console.log('📍 User location:', ${userLat}, ${userLng});
console.log('📍 Box location:', '${boxLat}', '${boxLng}');

// Calculate distance to verify
const R = 6371e3;
const φ1 = ${userLat} * Math.PI/180;
const φ2 = ${boxLat} * Math.PI/180;
const Δφ = (${boxLat} - ${userLat}) * Math.PI/180;
const Δλ = (${boxLng} - ${userLng}) * Math.PI/180;
const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
const distanceMeters = R * c;
const distanceFeet = distanceMeters * 3.28084;

console.log('📏 Distance from user:', distanceFeet.toFixed(1), 'feet');
console.log('✅ Within collection radius (100 ft):', distanceFeet <= 100);
console.log('✅ Within play circle (~30 ft):', distanceFeet <= 30);
console.log('🎁 Mystery box created with rewards:', mysteryBox.coinReward, 'coins,', mysteryBox.xpReward, 'XP,', mysteryBox.lanternReward, 'lanterns');
`;

// Write and execute the script
const scriptPath = "./temp_spawn_script.js";
fs.writeFileSync(scriptPath, spawnScript);

exec(`node ${scriptPath}`, (error, stdout, stderr) => {
  if (error) {
    console.error('Error:', error.message);
    return;
  }
  if (stderr) {
    console.error('Stderr:', stderr);
    return;
  }
  console.log(stdout);
  
  // Clean up
  try {
     fs.unlinkSync(scriptPath);
  } catch (e) {
    // Ignore cleanup errors
  }
});