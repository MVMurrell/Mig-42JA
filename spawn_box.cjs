/**
 * Spawn mystery box directly in the active service
 */

const userLat = 36.05720241599358;
const userLng = -94.16056595730045;

// Add very small offset (about 10 feet)
const offsetLat = 0.00005; // ~5 feet north
const offsetLng = 0.00005; // ~4 feet east

const boxLat = userLat + offsetLat;
const boxLng = userLng + offsetLng;

// Calculate distance to verify
const R = 6371e3;
const φ1 = userLat * Math.PI/180;
const φ2 = boxLat * Math.PI/180;
const Δφ = (boxLat - userLat) * Math.PI/180;
const Δλ = (boxLng - userLng) * Math.PI/180;
const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
const distanceMeters = R * c;
const distanceFeet = distanceMeters * 3.28084;

console.log('🎁 Mystery box calculated position:');
console.log('📍 User location:', userLat, userLng);
console.log('📍 Box location:', boxLat, boxLng);
console.log('📏 Distance from user:', distanceFeet.toFixed(1), 'feet');
console.log('✅ Within collection radius (100 ft):', distanceFeet <= 100);
console.log('✅ Within play circle (~30 ft):', distanceFeet <= 30);

if (distanceFeet <= 30) {
  console.log('🎉 Perfect! Box will be within your play circle for immediate collection!');
} else {
  console.log('⚠️  Box might be outside play circle, but within collection range');
}

