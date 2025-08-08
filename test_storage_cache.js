/**
 * TEST: Storage Cache Issue Investigation
 * 
 * This script tests if the storage layer is reading the updated database correctly
 */

import { DatabaseStorage } from './server/storage.ts.js';

async function testStorageCache() {
  console.log('🧪 TESTING: Storage cache vs direct database query...');
  
  const storage = new DatabaseStorage();
  const userId = 'google-oauth2|117032826996185616207';
  
  try {
    console.log('📥 Testing storage.getUserById():');
    const userFromStorage = await storage.getUserById(userId);
    console.log('Storage result:', {
      profileImageUrl: userFromStorage?.profileImageUrl,
      readyPlayerMeAvatarUrl: userFromStorage?.readyPlayerMeAvatarUrl
    });
    
    console.log('📊 Expected URLs:');
    console.log('Profile Image (GCS):', 'https://storage.googleapis.com/jemzy-images-storage/profiles/google-oauth2%7C117032826996185616207/cc71d3be-13b6-4bb7-b381-d53bec716f14.jpg');
    console.log('Ready Player Me:', 'https://models.readyplayer.me/683c9f5e75019e7352305622.png?scene=portrait&transparent=true&width=256&height=256');
    
    const expectedGCS = 'https://storage.googleapis.com/jemzy-images-storage/profiles/google-oauth2%7C117032826996185616207/cc71d3be-13b6-4bb7-b381-d53bec716f14.jpg';
    const expectedRPM = 'https://models.readyplayer.me/683c9f5e75019e7352305622.png?scene=portrait&transparent=true&width=256&height=256';
    
    console.log('\n🔍 ANALYSIS:');
    
    if (userFromStorage?.profileImageUrl === expectedGCS) {
      console.log('✅ Profile image URL is CORRECT in storage layer');
    } else {
      console.log('❌ Profile image URL is WRONG in storage layer');
      console.log('Expected:', expectedGCS);
      console.log('Actual:', userFromStorage?.profileImageUrl);
    }
    
    if (userFromStorage?.readyPlayerMeAvatarUrl === expectedRPM) {
      console.log('✅ Ready Player Me URL is CORRECT in storage layer');
    } else {
      console.log('❌ Ready Player Me URL is WRONG in storage layer'); 
      console.log('Expected:', expectedRPM);
      console.log('Actual:', userFromStorage?.readyPlayerMeAvatarUrl);
    }
    
  } catch (error) {
    console.error('❌ ERROR during storage test:', error);
  }
  
  process.exit(0);
}

testStorageCache();