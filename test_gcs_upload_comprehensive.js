/**
 * COMPREHENSIVE GCS UPLOAD TEST
 * 
 * This test will:
 * 1. Test direct GCS upload with current credentials
 * 2. Verify file actually exists after upload
 * 3. Test the exact upload method used by uploadFirstProcessor
 * 4. Identify why uploads are failing silently
 */

import { Storage } from '@google-cloud/storage';
import { writeFile, readFile, unlink } from 'fs/promises';
import * as path from "node:path";

async function testGCSUploadComprehensive() {
  console.log('🔍 COMPREHENSIVE GCS UPLOAD TEST');
  console.log('='.repeat(50));
  
  try {
    // Test 1: Verify credentials
    console.log('\n📋 Test 1: Credential Verification');
    const contentModerationCredentials = process.env.CONTENT_MODERATION_WORKER_JUN_26_2025;
    
    if (!contentModerationCredentials) {
      console.error('❌ CONTENT_MODERATION_WORKER_JUN_26_2025 not found');
      return;
    }
    
    const credentials = JSON.parse(contentModerationCredentials);
    console.log(`✅ Credentials found: ${credentials.client_email}`);
    console.log(`✅ Project ID: ${credentials.project_id}`);
    
    // Test 2: Initialize Storage client
    console.log('\n📋 Test 2: Storage Client Initialization');
    const storage = new Storage({
      credentials: credentials,
      projectId: credentials.project_id
    });
    console.log('✅ Storage client initialized');
    
    // Test 3: Bucket access
    console.log('\n📋 Test 3: Bucket Access Test');
    const bucketName = 'jemzy-video-moderation-steam-house-461401-t7';
    const bucket = storage.bucket(bucketName);
    
    try {
      const [bucketExists] = await bucket.exists();
      console.log(`Bucket exists: ${bucketExists}`);
      
      if (!bucketExists) {
        console.error(`❌ Bucket ${bucketName} does not exist`);
        return;
      }
      
      // Test bucket permissions
      const [metadata] = await bucket.getMetadata();
      console.log(`✅ Bucket accessible: ${metadata.name}`);
      console.log(`   Location: ${metadata.location}`);
      console.log(`   Storage class: ${metadata.storageClass}`);
      
    } catch (bucketError) {
      console.error('❌ Bucket access failed:', bucketError.message);
      return;
    }
    
    // Test 4: Create test video file
    console.log('\n📋 Test 4: Test File Creation');
    const testVideoId = `test-upload-${Date.now()}`;
    const testFilePath = join('./uploads', `${testVideoId}.webm`);
    
    // Create a small test video file (just some binary data)
    const testData = Buffer.from('WEBM test file content for GCS upload testing');
    await writeFile(testFilePath, testData);
    console.log(`✅ Test file created: ${testFilePath} (${testData.length} bytes)`);
    
    // Test 5: Direct GCS upload test
    console.log('\n📋 Test 5: Direct GCS Upload Test');
    const fileName = `raw-videos/${testVideoId}.webm`;
    const file = bucket.file(fileName);
    
    try {
      console.log('📤 Starting upload...');
      await file.save(testData, {
        metadata: {
          contentType: 'video/webm',
          cacheControl: 'no-cache',
        },
        resumable: false,
        timeout: 60000,
      });
      
      console.log('✅ Upload completed');
      
      // Verify upload
      console.log('🔍 Verifying upload...');
      const [exists] = await file.exists();
      if (exists) {
        const [metadata] = await file.getMetadata();
        console.log(`✅ Upload verified: ${metadata.size} bytes`);
        console.log(`   Content type: ${metadata.contentType}`);
        console.log(`   Created: ${metadata.timeCreated}`);
        
        // Clean up test file
        await file.delete();
        console.log('🧹 Test file cleaned up from GCS');
      } else {
        console.error('❌ File does not exist after upload!');
      }
      
    } catch (uploadError) {
      console.error('❌ Direct upload failed:', uploadError.message);
      console.error('   Error code:', uploadError.code);
      console.error('   Error details:', uploadError.details);
    }
    
    // Test 6: Test the exact uploadFirstProcessor method
    console.log('\n📋 Test 6: uploadFirstProcessor Method Test');
    
    try {
      console.log('🔍 Testing exact method used by uploadFirstProcessor...');
      
      // Read file like uploadFirstProcessor does
      const videoBuffer = await readFile(testFilePath);
      console.log(`File read successfully: ${videoBuffer.length} bytes`);
      
      if (videoBuffer.length === 0) {
        console.error('❌ Video buffer is empty!');
      } else {
        console.log('✅ Video buffer contains data');
      }
      
      const testFileName2 = `raw-videos/${testVideoId}-processor-test.webm`;
      const testFile2 = bucket.file(testFileName2);
      
      // Use exact same upload parameters as uploadFirstProcessor
      await testFile2.save(videoBuffer, {
        metadata: {
          contentType: 'video/mp4', // Note: uploadFirstProcessor uses video/mp4
          cacheControl: 'no-cache',
        },
        resumable: false,
        timeout: 60000,
      });
      
      // Verify like uploadFirstProcessor does
      const [exists2] = await testFile2.exists();
      if (!exists2) {
        console.error('❌ CRITICAL: Upload verification failed - file does not exist in GCS after upload');
      } else {
        const [metadata2] = await testFile2.getMetadata();
        console.log(`✅ uploadFirstProcessor method works: ${metadata2.size} bytes`);
        
        // Clean up
        await testFile2.delete();
        console.log('🧹 Processor test file cleaned up');
      }
      
    } catch (processorError) {
      console.error('❌ uploadFirstProcessor method failed:', processorError.message);
      
      // Check if it's the ENAMETOOLONG error we suspect
      if (processorError.message.includes('ENAMETOOLONG')) {
        console.error('🚨 FOUND THE ISSUE: ENAMETOOLONG error detected!');
        console.error('   This means the credentials environment variable is too long');
        console.error('   The system is treating the JSON content as a file path');
      }
    }
    
    // Test 7: Check recent failed uploads
    console.log('\n📋 Test 7: Check Recent Failed Videos');
    console.log('Checking if recent videos have valid GCS files...');
    
    const recentVideoTests = [
      'gs://jemzy-video-moderation-steam-house-461401-t7/raw-videos/42149480-e2bb-4a9d-8483-562fd2ef5cd7.webm',
      'gs://jemzy-video-moderation-steam-house-461401-t7/raw-videos/cfa439bf-8ae0-4974-8c9c-d89f7082c374.webm'
    ];
    
    for (const gcsUri of recentVideoTests) {
      const match = gcsUri.match(/^gs:\/\/([^\/]+)\/(.+)$/);
      if (match) {
        const [, bucketName, fileName] = match;
        const testBucket = storage.bucket(bucketName);
        const testFile = testBucket.file(fileName);
        
        const [exists] = await testFile.exists();
        console.log(`   ${fileName}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
        
        if (!exists) {
          console.log(`   🚨 SECURITY BREACH: Video reached users without GCS file`);
        }
      }
    }
    
    // Clean up local test file
    await unlink(testFilePath);
    console.log('🧹 Local test file cleaned up');
    
    console.log('\n🎯 TEST SUMMARY:');
    console.log('================');
    console.log('If all tests passed: GCS upload works, issue is elsewhere');
    console.log('If upload failed: We found the exact root cause');
    console.log('If ENAMETOOLONG error: Credentials configuration issue');
    console.log('Missing recent files: Confirms silent upload failures');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testGCSUploadComprehensive().catch(console.error);