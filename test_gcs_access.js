/**
 * TEST GCS ACCESS: Quick test to verify bucket access
 */

import { Storage } from '@google-cloud/storage';

async function testGCSAccess() {
  console.log('🔍 GCS TEST: Testing Google Cloud Storage access...');
  
  try {
    // Initialize storage with same credentials as uploadFirstProcessor
    const contentModerationCredentials = process.env.CONTENT_MODERATION_WORKER_JUN_26_2025;
    
    if (!contentModerationCredentials) {
      throw new Error('CONTENT_MODERATION_WORKER_JUN_26_2025 credentials not found');
    }

    const credentials = JSON.parse(contentModerationCredentials);
    
    const storage = new Storage({
      credentials: credentials,
      projectId: credentials.project_id || 'steam-house-461401-t7'
    });
    
    console.log('✅ GCS TEST: Storage initialized successfully');
    
    // Test bucket access
    const bucketName = 'jemzy-video-moderation-steam-house-461401-t7';
    const bucket = storage.bucket(bucketName);
    
    console.log(`🔍 GCS TEST: Testing access to bucket: ${bucketName}`);
    
    // Check if bucket exists and we have access
    const [exists] = await bucket.exists();
    console.log(`📂 GCS TEST: Bucket exists: ${exists}`);
    
    if (exists) {
      // Try to list files in the bucket (limited to first 5)
      console.log('🔍 GCS TEST: Listing recent files in bucket...');
      const [files] = await bucket.getFiles({ 
        prefix: 'raw-videos/',
        maxResults: 5 
      });
      
      console.log(`📁 GCS TEST: Found ${files.length} files in raw-videos/ folder:`);
      files.forEach(file => {
        console.log(`  - ${file.name} (created: ${file.metadata.timeCreated})`);
      });
      
      // Try to create a test file to verify write permissions
      console.log('🔍 GCS TEST: Testing write permissions...');
      const testFileName = `raw-videos/test-${Date.now()}.txt`;
      const testFile = bucket.file(testFileName);
      
      await testFile.save('test content for GCS access verification', {
        metadata: {
          contentType: 'text/plain',
        },
      });
      
      console.log(`✅ GCS TEST: Successfully created test file: ${testFileName}`);
      
      // Clean up test file
      await testFile.delete();
      console.log(`🧹 GCS TEST: Cleaned up test file`);
      
      console.log('🎉 GCS TEST: All tests PASSED - bucket access is working correctly');
      
    } else {
      console.log('❌ GCS TEST: Bucket does not exist or access denied');
    }
    
  } catch (error) {
    console.error('❌ GCS TEST: Failed:', error);
    console.error('❌ GCS TEST: Error details:', error.message);
    
    if (error.message.includes('403')) {
      console.error('🚨 GCS TEST: PERMISSION DENIED - Check service account permissions');
    } else if (error.message.includes('404')) {
      console.error('🚨 GCS TEST: BUCKET NOT FOUND - Check bucket name');
    } else if (error.message.includes('invalid_grant')) {
      console.error('🚨 GCS TEST: INVALID CREDENTIALS - Check service account JSON');
    }
  }
}

testGCSAccess().catch(console.error);