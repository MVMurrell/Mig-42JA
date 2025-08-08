import fs from 'fs';
import fetch from 'node-fetch';

// Create a simple 1x1 pixel white PNG for testing
const testPngData = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
  0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
  0x49, 0x48, 0x44, 0x52, // IHDR
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE,
  0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
  0x49, 0x44, 0x41, 0x54, // IDAT
  0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0xFF, 0xFF,
  0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC, 0x33,
  0x00, 0x00, 0x00, 0x00, // IEND chunk length
  0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND
]);

async function testImageUpload() {
  console.log('🧪 Testing AI-powered image moderation...');
  
  try {
    // Create FormData for image upload
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    
    // Add the test image buffer as a blob
    formData.append('image', testPngData, {
      filename: 'test.png',
      contentType: 'image/png'
    });
    
    console.log('📤 Uploading test image to moderation endpoint...');
    
    // Test profile image upload
    const response = await fetch('http://localhost:5000/api/upload/image?type=profile', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ SUCCESS: Profile image passed AI moderation!');
      console.log('📄 Response:', result);
    } else {
      const error = await response.json();
      console.log('❌ REJECTED: Image failed AI moderation');
      console.log('📄 Error:', error);
    }
    
    // Test quest image upload
    const questResponse = await fetch('http://localhost:5000/api/upload/image?type=quest', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    if (questResponse.ok) {
      const result = await questResponse.json();
      console.log('✅ SUCCESS: Quest image passed AI moderation!');
      console.log('📄 Response:', result);
    } else {
      const error = await questResponse.json();
      console.log('❌ REJECTED: Quest image failed AI moderation');
      console.log('📄 Error:', error);
    }
    
  } catch (error) {
    console.error('🔥 Test failed:', error.message);
  }
}

testImageUpload();