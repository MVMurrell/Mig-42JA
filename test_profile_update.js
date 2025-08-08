import { DatabaseStorage } from './server/storage.ts.js';

async function testProfilePictureUpdate() {
  console.log('🧪 Testing profile picture database update...');
  
  const storage = new DatabaseStorage();
  const userId = 'google-oauth2|117032826996185616207';
  const testUrl = 'https://storage.googleapis.com/jemzy-images-storage/test-update.jpg';
  
  try {
    console.log('📥 Current user data before update:');
    const userBefore = await storage.getUserById(userId);
    console.log('Profile URL before:', userBefore?.profileImageUrl);
    
    console.log('🔄 Attempting database update...');
    await storage.updateUserProfilePicture(userId, testUrl);
    console.log('✅ Update completed without errors');
    
    console.log('📤 User data after update:');
    const userAfter = await storage.getUserById(userId);
    console.log('Profile URL after:', userAfter?.profileImageUrl);
    
    if (userAfter?.profileImageUrl === testUrl) {
      console.log('✅ SUCCESS: Database update worked correctly!');
    } else {
      console.log('❌ FAILED: Database was not updated');
      console.log('Expected:', testUrl);
      console.log('Actual:', userAfter?.profileImageUrl);
    }
    
  } catch (error) {
    console.error('❌ ERROR during database test:', error);
  }
  
  process.exit(0);
}

testProfilePictureUpdate();