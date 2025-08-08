// Test script to verify gesture detection fix
import { ImageAnnotatorClient } from '@google-cloud/vision';

async function testGestureDetectionFix() {
  console.log('🔧 TESTING: Gesture detection credential fix...');
  
  try {
    // Test the corrected credential variable
    const serviceAccountKey = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    
    if (!serviceAccountKey) {
      console.log('❌ GOOGLE_APPLICATION_CREDENTIALS not found');
      return;
    }
    
    console.log(`✅ Credential variable found (${serviceAccountKey.length} characters)`);
    
    // Test JSON parsing
    const credentials = JSON.parse(serviceAccountKey);
    console.log(`✅ Credentials parsed successfully`);
    console.log(`   - Project ID: ${credentials.project_id}`);
    console.log(`   - Client Email: ${credentials.client_email}`);
    
    // Test Vision API client initialization
    const visionClient = new ImageAnnotatorClient({
      credentials: credentials,
      projectId: credentials.project_id
    });
    
    console.log(`✅ Vision API client initialized`);
    
    // Test simple API call with 1x1 test image
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
    
    console.log('🧪 Testing Vision API connectivity...');
    const [result] = await visionClient.annotateImage({
      image: { content: testImageBuffer },
      features: [
        { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
        { type: 'LABEL_DETECTION', maxResults: 10 }
      ]
    });
    
    console.log('✅ Vision API call successful');
    console.log(`   - Objects detected: ${result.localizedObjectAnnotations?.length || 0}`);
    console.log(`   - Labels detected: ${result.labelAnnotations?.length || 0}`);
    
    console.log('🎉 GESTURE DETECTION FIX VERIFIED - Credentials working correctly');
    
  } catch (error) {
    console.error('❌ Gesture detection test failed:', error.message);
  }
}

testGestureDetectionFix().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Test script crashed:', error);
  process.exit(1);
});