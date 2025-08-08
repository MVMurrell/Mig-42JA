/**
 * DEBUG: Test GCS Upload for uploadFirstProcessor
 * 
 * This script tests the exact GCS upload method used by uploadFirstProcessor
 * to identify why no recent videos are reaching GCS storage.
 */

import { Storage } from '@google-cloud/storage';

async function testGCSUpload() {
  try {
    console.log('🔍 Testing GCS upload configuration...');
    
    // Check credentials
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    console.log(`📁 Credentials path: ${credentialsPath}`);
    
    if (!credentialsPath) {
      console.error('❌ GOOGLE_APPLICATION_CREDENTIALS not set');
      return;
    }
    
    // Initialize storage the same way uploadFirstProcessor does
    const storage = new Storage({
      keyFilename: credentialsPath
    });
    
    const bucketName = 'jemzy-video-moderation-steam-house-461401-t7';
    console.log(`🪣 Target bucket: ${bucketName}`);
    
    const bucket = storage.bucket(bucketName);
    
    // Test bucket access
    try {
      const [metadata] = await bucket.getMetadata();
      console.log(`✅ Bucket accessible - Location: ${metadata.location}`);
    } catch (bucketError) {
      console.error('❌ Cannot access bucket:', bucketError.message);
      return;
    }
    
    // Create a tiny test file
    const testVideoId = 'test-gcs-upload-' + Date.now();
    const fileName = `raw-videos/${testVideoId}.webm`;
    const file = bucket.file(fileName);
    
    console.log(`📤 Testing upload to: gs://${bucketName}/${fileName}`);
    
    // Create minimal test data
    const testData = Buffer.from('test video data');
    
    try {
      await file.save(testData, {
        metadata: {
          contentType: 'video/mp4',
          cacheControl: 'no-cache',
        },
        resumable: false,
        timeout: 30000,
      });
      
      console.log('✅ Test upload successful');
      
      // Verify it exists
      const [exists] = await file.exists();
      console.log(`✅ File verification: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
      
      // Clean up test file
      await file.delete();
      console.log('✅ Test file cleaned up');
      
    } catch (uploadError) {
      console.error('❌ Upload failed:', uploadError.message);
      console.error('Full error:', uploadError);
    }
    
  } catch (error) {
    console.error('❌ GCS test failed:', error.message);
    console.error('Full error:', error);
  }
}

testGCSUpload().catch(console.error);