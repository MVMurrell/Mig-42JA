/**
 * TEST: Current GCS Upload Capability
 * 
 * This test checks if GCS uploads are working with the current credentials
 * to identify why the "making so much money" video failed to upload.
 */

import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import * as path from "node:path";

async function testCurrentGCSUpload() {
  try {
    console.log('🔍 Testing current GCS upload capability...');
    
    // Check current credentials
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    console.log('📋 Credentials path:', credentialsPath);
    
    if (!credentialsPath || !fs.existsSync(credentialsPath)) {
      console.log('❌ Credentials file missing or not found');
      return;
    }
    
    // Initialize GCS client
    const storage = new Storage({
      keyFilename: credentialsPath,
      projectId: 'steam-house-461401-t7'
    });
    
    const bucketName = 'jemzy-video-moderation-steam-house-461401-t7';
    const bucket = storage.bucket(bucketName);
    
    // Check bucket access
    console.log('🔍 Testing bucket access...');
    const [bucketExists] = await bucket.exists();
    console.log('📦 Bucket exists:', bucketExists);
    
    if (!bucketExists) {
      console.log('❌ Bucket does not exist or no access');
      return;
    }
    
    // Create test file
    const testContent = Buffer.from('Test upload content for GCS capability check');
    const testFileName = `test-uploads/capability-test-${Date.now()}.txt`;
    const file = bucket.file(testFileName);
    
    console.log('⬆️ Attempting test upload...');
    
    // Try upload
    await file.save(testContent, {
      metadata: {
        contentType: 'text/plain'
      }
    });
    
    console.log('✅ Test upload successful!');
    
    // Verify file exists
    const [fileExists] = await file.exists();
    console.log('✅ File exists after upload:', fileExists);
    
    // Get public URL
    const publicUrl = `gs://${bucketName}/${testFileName}`;
    console.log('📋 File URL:', publicUrl);
    
    // Clean up test file
    await file.delete();
    console.log('🧹 Test file cleaned up');
    
    console.log('✅ GCS upload is working correctly');
    return true;
    
  } catch (error) {
    console.error('❌ GCS Upload Test Failed:', error.message);
    console.error('Error details:', error);
    return false;
  }
}

testCurrentGCSUpload();