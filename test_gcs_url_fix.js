import { Storage } from '@google-cloud/storage';

async function testGCSUrlAccess() {
  try {
    console.log('🔧 Testing GCS URL access and regeneration...');
    
    // Initialize with same credentials as our app
    const contentCredentials = process.env.CONTENT_MODERATION_WORKER_JUN_26_2025;
    if (!contentCredentials) {
      throw new Error('CONTENT_MODERATION_WORKER_JUN_26_2025 credentials not found');
    }

    const credentials = JSON.parse(contentCredentials);
    const storage = new Storage({
      credentials: credentials,
      projectId: credentials.project_id || 'steam-house-461401-t7'
    });

    const bucketName = 'jemzy-images-storage';
    const fileName = 'quests/google-oauth2|117032826996185616207/eeaa0ae1-11c5-4ed7-959e-1028f197aeb9.jpg';
    
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);

    // Check if file exists
    console.log('📁 Checking if file exists...');
    const [exists] = await file.exists();
    console.log(`File exists: ${exists}`);

    if (!exists) {
      console.log('❌ File does not exist in GCS');
      return;
    }

    // Generate new signed URL with different configurations
    console.log('🔗 Generating new signed URL...');
    
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });

    console.log('✅ NEW SIGNED URL:', signedUrl);

    // Test the URL
    console.log('🧪 Testing URL access...');
    const response = await fetch(signedUrl, { method: 'HEAD' });
    console.log(`📊 URL Test Result: ${response.status} ${response.statusText}`);
    
    if (response.status === 200) {
      console.log('🎉 SUCCESS: URL is working!');
    } else {
      console.log('❌ FAILED: URL still returns error');
    }

  } catch (error) {
    console.error('🚨 Error:', error.message);
  }
}

testGCSUrlAccess();