// Test Vision API with explicit project configuration
import { ImageAnnotatorClient } from '@google-cloud/vision';

async function testExplicitProjectConfig() {
  console.log('🔧 TESTING: Explicit project configuration for Vision API...');
  
  try {
    const visionCredentials = process.env.GOOGLE_VISION_CREDENTIALS;
    if (!visionCredentials) {
      console.error('❌ GOOGLE_VISION_CREDENTIALS not found');
      return;
    }
    
    const credentials = JSON.parse(visionCredentials);
    console.log(`✅ Using credentials for: ${credentials.client_email}`);
    console.log(`✅ Target project: ${credentials.project_id}`);
    
    // Create Vision client with explicit project override
    const visionClient = new ImageAnnotatorClient({
      credentials: credentials,
      projectId: credentials.project_id,
      keyFilename: undefined, // Ensure we don't use any default key file
      keyFile: undefined,     // Ensure we don't use any default key file
    });
    
    // Also try setting the project explicitly in the request
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE,
      0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54,
      0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0xFF, 0xFF,
      0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC, 0x33,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    console.log('🧪 Testing Vision API with explicit project configuration...');
    
    // Make the request with explicit project in the parent parameter
    const request = {
      parent: `projects/${credentials.project_id}`,
      image: { content: testImageBuffer },
      features: [
        { type: 'OBJECT_LOCALIZATION', maxResults: 5 },
        { type: 'LABEL_DETECTION', maxResults: 5 }
      ]
    };
    
    const [result] = await visionClient.annotateImage(request);
    
    console.log('🎉 SUCCESS: Vision API working with explicit project config!');
    console.log(`   - Objects detected: ${result.localizedObjectAnnotations?.length || 0}`);
    console.log(`   - Labels detected: ${result.labelAnnotations?.length || 0}`);
    
    console.log('✅ Gesture detection system ready for full operation');
    
  } catch (error) {
    console.error('❌ Explicit project config test failed:', error.message);
    
    if (error.message.includes('PERMISSION_DENIED')) {
      console.log('🔍 Still getting permission denied - API may need time to propagate');
      console.log('   Wait 5-10 minutes and try again');
    }
  }
}

testExplicitProjectConfig().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Test script crashed:', error);
  process.exit(1);
});