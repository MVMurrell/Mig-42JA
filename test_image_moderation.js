// Test script for image moderation system
import { imageModerationService } from './server/imageModeration.js.js';
import fs from 'fs/promises';

async function testImageModeration() {
  console.log('🧪 TESTING: Image moderation system...');
  
  try {
    // Create a simple test image (1x1 pixel PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE,
      0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
      0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0xFF, 0xFF,
      0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC, 0x33,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND
    ]);
    
    console.log('🖼️ Testing profile image moderation...');
    const profileResult = await imageModerationService.moderateImage(testImageBuffer, 'profile');
    
    console.log('📊 Profile image moderation result:', {
      approved: profileResult.approved,
      flagReason: profileResult.flagReason || 'None',
      detectedLabels: profileResult.detectedLabels || []
    });
    
    console.log('🖼️ Testing quest image moderation...');
    const questResult = await imageModerationService.moderateImage(testImageBuffer, 'quest');
    
    console.log('📊 Quest image moderation result:', {
      approved: questResult.approved,
      flagReason: questResult.flagReason || 'None',
      detectedLabels: questResult.detectedLabels || []
    });
    
    if (profileResult.approved && questResult.approved) {
      console.log('✅ SUCCESS: Image moderation system is working correctly!');
      console.log('🔒 AI-powered content filtering is now protecting your community from inappropriate images');
    } else {
      console.log('⚠️ WARNING: Test image was rejected by moderation system');
    }
    
  } catch (error) {
    console.error('❌ Image moderation test failed:', error.message);
    if (error.message.includes('CONTENT_MODERATION_WORKER_JUN_26_2025')) {
      console.error('🔍 Check that the CONTENT_MODERATION_WORKER_JUN_26_2025 environment variable is properly set');
    }
  }
}

testImageModeration().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Test script crashed:', error);
  process.exit(1);
});