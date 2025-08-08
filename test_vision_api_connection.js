// Test Google Vision API connection with new dedicated credentials
import { ImageAnnotatorClient } from '@google-cloud/vision';

async function testVisionAPIConnection() {
  console.log('🔍 TESTING: Google Vision API Connection');
  console.log('📋 Using dedicated GOOGLE_VISION_API_JUN_26_2025 credentials');
  console.log('');
  
  try {
    // Test 1: Credentials and client initialization
    console.log('📝 TEST 1: Credentials and client initialization');
    const visionCredentials = process.env.GOOGLE_VISION_API_JUN_26_2025;
    
    if (!visionCredentials) {
      console.error('❌ FAIL: GOOGLE_VISION_API_JUN_26_2025 credentials not found in environment');
      return;
    }
    
    let credentials;
    try {
      credentials = JSON.parse(visionCredentials);
      console.log('✅ SUCCESS: Credentials parsed successfully');
      console.log('📄 Project ID:', credentials.project_id || 'Not specified');
      console.log('📄 Client Email:', credentials.client_email || 'Not specified');
    } catch (parseError) {
      console.error('❌ FAIL: Invalid JSON in credentials:', parseError.message);
      return;
    }
    
    // Test 2: Vision API client initialization
    console.log('');
    console.log('📝 TEST 2: Vision API client initialization');
    
    const visionClient = new ImageAnnotatorClient({
      credentials: credentials,
      projectId: credentials.project_id || 'steam-house-461401-t7'
    });
    
    console.log('✅ SUCCESS: Vision API client created');
    
    // Test 3: Simple test image (1x1 white pixel PNG)
    console.log('');
    console.log('📝 TEST 3: Safe content detection on test image');
    
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
    
    const [result] = await visionClient.safeSearchDetection({
      image: { content: testPngData }
    });
    
    console.log('✅ SUCCESS: Safe search detection completed');
    
    if (result.safeSearchAnnotation) {
      const safeSearch = result.safeSearchAnnotation;
      console.log('📊 Safe Search Results:');
      console.log(`  🔞 Adult: ${safeSearch.adult || 'UNKNOWN'}`);
      console.log(`  ⚔️ Violence: ${safeSearch.violence || 'UNKNOWN'}`);
      console.log(`  🩺 Medical: ${safeSearch.medical || 'UNKNOWN'}`);
      console.log(`  🎭 Spoof: ${safeSearch.spoof || 'UNKNOWN'}`);
      console.log(`  👤 Racy: ${safeSearch.racy || 'UNKNOWN'}`);
    } else {
      console.log('⚠️ WARNING: No safe search annotation returned');
    }
    
    // Test 4: Label detection
    console.log('');
    console.log('📝 TEST 4: Label detection on test image');
    
    const [labelResult] = await visionClient.labelDetection({
      image: { content: testPngData }
    });
    
    console.log('✅ SUCCESS: Label detection completed');
    
    if (labelResult.labelAnnotations && labelResult.labelAnnotations.length > 0) {
      console.log('🏷️ Detected Labels:');
      labelResult.labelAnnotations.slice(0, 5).forEach((label, index) => {
        console.log(`  ${index + 1}. ${label.description} (confidence: ${(label.score * 100).toFixed(1)}%)`);
      });
    } else {
      console.log('ℹ️ INFO: No labels detected (expected for simple test image)');
    }
    
    console.log('');
    console.log('🎯 OVERALL RESULT: Google Vision API is working correctly!');
    console.log('✅ Your GOOGLE_VISION_API_JUN_26_2025 credentials are properly configured');
    console.log('✅ The service account has the necessary permissions');
    console.log('✅ Image analysis is functioning as expected');
    
  } catch (error) {
    console.error('');
    console.error('❌ VISION API TEST FAILED:', error.message);
    
    // Provide specific guidance based on error type
    if (error.message.includes('PERMISSION_DENIED')) {
      console.error('');
      console.error('🔧 SOLUTION: Permission denied error detected');
      console.error('   Your service account needs these Google Cloud APIs enabled:');
      console.error('   • Cloud Vision API');
      console.error('   • Cloud Resource Manager API (if using project-level permissions)');
      console.error('');
      console.error('   Required IAM roles for the service account:');
      console.error('   • Cloud Vision API User (roles/ml.visionUser)');
      console.error('   • Or a custom role with vision.* permissions');
      
    } else if (error.message.includes('API_KEY_INVALID') || error.message.includes('UNAUTHENTICATED')) {
      console.error('');
      console.error('🔧 SOLUTION: Authentication error detected');
      console.error('   Please verify:');
      console.error('   • The service account key is valid and not expired');
      console.error('   • The JSON format is correct');
      console.error('   • The project_id in the credentials matches your Google Cloud project');
      
    } else if (error.message.includes('QUOTA_EXCEEDED')) {
      console.error('');
      console.error('🔧 SOLUTION: Quota exceeded');
      console.error('   • Check your Google Cloud Vision API quotas');
      console.error('   • Consider upgrading your billing plan if needed');
      
    } else if (error.message.includes('SERVICE_DISABLED')) {
      console.error('');
      console.error('🔧 SOLUTION: Vision API not enabled');
      console.error('   Enable the Cloud Vision API in your Google Cloud Console:');
      console.error('   https://console.cloud.google.com/apis/library/vision.googleapis.com');
      
    } else {
      console.error('');
      console.error('🔧 GENERAL TROUBLESHOOTING:');
      console.error('   1. Verify the service account has Vision API access');
      console.error('   2. Check that the Cloud Vision API is enabled in your project');
      console.error('   3. Ensure the credentials JSON is valid');
      console.error('   4. Verify network connectivity to Google Cloud services');
    }
  }
}

// Run the test
testVisionAPIConnection()
  .then(() => {
    console.log('');
    console.log('🏁 Vision API connection test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test script crashed:', error);
    process.exit(1);
  });