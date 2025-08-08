/**
 * TEST: Profile Picture Storage Debug
 * 
 * This script tests the exact storage.updateUserProfilePicture method
 * to see what's happening with the database update.
 */

// Import the storage instance and test the method directly
const { storage } = await import('./server/storage.js');

async function testProfilePictureStorage() {
  console.log('🧪 TEST: Starting profile picture storage debug...');
  
  try {
    const userId = 'google-oauth2|117032826996185616207';
    const testImageUrl = `https://test-storage-debug-${Date.now()}.jpg`;
    
    console.log('📝 TEST: About to update user:', userId);
    console.log('📝 TEST: New image URL:', testImageUrl);
    
    // Test the actual storage method
    await storage.updateUserProfilePicture(userId, testImageUrl);
    
    console.log('✅ TEST: Storage method completed');
    
    // Verify the result
    const user = await storage.getUserProfile(userId);
    console.log('🔍 TEST: User profile after update:', {
      id: user.id,
      profileImageUrl: user.profileImageUrl,
      updatedAt: user.updatedAt
    });
    
  } catch (error) {
    console.error('❌ TEST: Profile picture storage test failed:', error);
  }
}

testProfilePictureStorage();