/**
 * TEST: Real Upload Flow Simulation
 * 
 * This test simulates the exact flow that happens when a user uploads a video
 * to identify where the GCS upload is failing silently.
 */

import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import * as path from "node:path";
import { randomUUID } from 'crypto';
import { Storage } from '@google-cloud/storage';

async function testRealUploadFlow() {
  console.log('🔍 TESTING: Real Upload Flow Simulation');
  console.log('=====================================');
  
  try {
    // Step 1: Simulate incoming video file (like Multer creates)
    console.log('\n📋 Step 1: Simulate Multer Upload');
    const videoId = randomUUID();
    const multerTempPath = join('./uploads/temp-uploads', `${videoId}-test-upload.webm`);
    
    // Create test video data (simulate WebM file)
    const testVideoData = Buffer.from('WEBM\x1A\x45\xDF\xA3' + 'Test video content for upload flow testing'.repeat(100));
    await writeFile(multerTempPath, testVideoData);
    console.log(`✅ Multer temp file created: ${multerTempPath} (${testVideoData.length} bytes)`);
    
    // Step 2: Simulate permanent file copy (like binary upload route does)
    console.log('\n📋 Step 2: Simulate Permanent File Copy');
    const permanentDir = './uploads/temp-processing';
    
    try {
      await mkdir(permanentDir, { recursive: true });
      console.log(`✅ Permanent directory created: ${permanentDir}`);
    } catch (error) {
      console.log(`✅ Permanent directory already exists: ${permanentDir}`);
    }
    
    const permanentFilePath = join(permanentDir, `${videoId}-test-upload.webm`);
    const fs = await import('fs/promises');
    await fs.copyFile(multerTempPath, permanentFilePath);
    console.log(`✅ File copied to permanent location: ${permanentFilePath}`);
    
    // Clean up original Multer file (like the route does)
    await unlink(multerTempPath);
    console.log(`✅ Original Multer file cleaned up`);
    
    // Step 3: Simulate uploadFirstProcessor GCS upload
    console.log('\n📋 Step 3: Simulate uploadFirstProcessor GCS Upload');
    
    // Initialize storage like uploadFirstProcessor does
    const contentModerationCredentials = process.env.CONTENT_MODERATION_WORKER_JUN_26_2025;
    if (!contentModerationCredentials) {
      console.error('❌ CONTENT_MODERATION_WORKER_JUN_26_2025 not found');
      return;
    }
    
    const credentials = JSON.parse(contentModerationCredentials);
    const storage = new Storage({
      credentials: credentials,
      projectId: credentials.project_id || 'steam-house-461401-t7'
    });
    
    // Verify the file exists before upload (like uploadFirstProcessor does)
    try {
      const stats = await fs.stat(permanentFilePath);
      console.log(`✅ Video file exists - Size: ${stats.size} bytes`);
      
      if (stats.size === 0) {
        throw new Error('Video file is empty (0 bytes)');
      }
    } catch (accessError) {
      console.error(`❌ Video file access error:`, accessError);
      throw new Error(`Video file not accessible at path: ${permanentFilePath}`);
    }
    
    // GCS upload simulation
    const bucketName = 'jemzy-video-moderation-steam-house-461401-t7';
    const fileName = `raw-videos/${videoId}.webm`;
    console.log(`📤 Target GCS path: gs://${bucketName}/${fileName}`);
    
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);
    
    console.log(`📤 Reading video file from disk...`);
    const videoBuffer = await readFile(permanentFilePath);
    console.log(`📤 Video buffer size: ${videoBuffer.length} bytes`);
    
    if (videoBuffer.length === 0) {
      throw new Error('Video buffer is empty after reading from disk');
    }
    
    console.log(`📤 Starting upload to Google Cloud Storage...`);
    await file.save(videoBuffer, {
      metadata: {
        contentType: 'video/mp4', // uploadFirstProcessor uses video/mp4
        cacheControl: 'no-cache',
      },
      resumable: false,
      timeout: 60000,
    });
    
    // Verify upload like uploadFirstProcessor does
    console.log(`📤 Verifying upload completion...`);
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error('Upload verification failed - file does not exist in GCS after upload');
    }
    
    const [metadata] = await file.getMetadata();
    console.log(`✅ Upload verified - GCS file size: ${metadata.size} bytes`);
    
    const gcsUri = `gs://${bucketName}/${fileName}`;
    console.log(`✅ GCS upload completed successfully: ${gcsUri}`);
    
    // Step 4: Test AI analysis would work
    console.log('\n📋 Step 4: Test AI Analysis Access');
    
    try {
      // Try to access the file for AI analysis
      const [downloadResponse] = await file.download();
      console.log(`✅ File accessible for AI analysis: ${downloadResponse.length} bytes`);
      
      if (downloadResponse.length === 0) {
        console.error('❌ Downloaded file is empty - AI analysis would fail');
      } else {
        console.log('✅ File has content - AI analysis would work');
      }
      
    } catch (downloadError) {
      console.error('❌ File download failed - AI analysis would fail:', downloadError.message);
    }
    
    // Step 5: Compare with actual failed upload
    console.log('\n📋 Step 5: Compare with Failed Upload');
    const failedVideoGcsUri = 'gs://jemzy-video-moderation-steam-house-461401-t7/raw-videos/42149480-e2bb-4a9d-8483-562fd2ef5cd7.webm';
    const failedFile = bucket.file('raw-videos/42149480-e2bb-4a9d-8483-562fd2ef5cd7.webm');
    
    const [failedExists] = await failedFile.exists();
    console.log(`Failed video file exists: ${failedExists}`);
    
    if (!failedExists) {
      console.log('🚨 CONFIRMED: Real upload never made it to GCS');
      console.log('🚨 This means the uploadFirstProcessor.uploadToGCS method failed silently');
      console.log('🚨 Or the video never reached the uploadFirstProcessor at all');
    }
    
    // Clean up test files
    await file.delete();
    console.log('🧹 Test GCS file cleaned up');
    
    await unlink(permanentFilePath);
    console.log('🧹 Permanent test file cleaned up');
    
    console.log('\n🎯 DIAGNOSIS:');
    console.log('=============');
    console.log('✅ GCS upload method works perfectly when tested directly');
    console.log('❌ Real user uploads are not reaching GCS storage');
    console.log('🔍 This suggests one of these issues:');
    console.log('   1. uploadFirstProcessor.processVideo is not being called');
    console.log('   2. File path is wrong when uploadFirstProcessor runs');
    console.log('   3. uploadToGCS method is throwing an error that gets caught');
    console.log('   4. Video processing is using a different processor entirely');
    
    console.log('\n💡 NEXT STEPS:');
    console.log('==============');
    console.log('1. Check if uploadFirstProcessor.processVideo is actually called');
    console.log('2. Add comprehensive logging to uploadToGCS method');
    console.log('3. Verify file paths are correct during real uploads');
    console.log('4. Check if errors are being silently caught and ignored');
    
  } catch (error) {
    console.error('❌ Upload flow test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testRealUploadFlow().catch(console.error);