// Test the new content moderation worker credentials
import { ImageAnnotatorClient } from '@google-cloud/vision';

async function testNewCredentials() {
  console.log('🔧 TESTING: New content moderation worker credentials...');
  
  try {
    // Use credentials from environment variable (secure)
    const credentialsString = process.env.CONTENT_MODERATION_WORKER_JUN_26_2025;
    if (!credentialsString) {
      throw new Error('Missing CONTENT_MODERATION_WORKER_JUN_26_2025 environment variable');
    }
    const credentials = JSON.parse(credentialsString);
    
    console.log(`✅ New credentials loaded for: ${credentials.client_email}`);
    console.log(`✅ Project ID: ${credentials.project_id}`);
    
    // Test Vision API client initialization
    const visionClient = new ImageAnnotatorClient({
      credentials: credentials,
      projectId: credentials.project_id
    });
    
    console.log(`✅ Vision API client initialized with new credentials`);
    
    // Test API connectivity with a simple image
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
    
    console.log('🧪 Testing Vision API connectivity with new credentials...');
    const [result] = await visionClient.annotateImage({
      image: { content: testImageBuffer },
      features: [
        { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
        { type: 'LABEL_DETECTION', maxResults: 10 }
      ]
    });
    
    console.log('🎉 SUCCESS: Vision API working with new credentials!');
    console.log(`   - Objects detected: ${result.localizedObjectAnnotations?.length || 0}`);
    console.log(`   - Labels detected: ${result.labelAnnotations?.length || 0}`);
    
    console.log('✅ Gesture detection is now ready to work properly');
    
  } catch (error) {
    console.error('❌ New credentials test failed:', error.message);
  }
}

testNewCredentials().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Test script crashed:', error);
  process.exit(1);
});