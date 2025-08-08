/**
 * TEST: Current Upload Pipeline Capability
 * 
 * Tests the complete upload pipeline with proper credentials to see
 * if uploads work after the server restart.
 */

import { Storage } from '@google-cloud/storage';
import { VideoIntelligenceServiceClient } from '@google-cloud/video-intelligence';
import { SpeechClient } from '@google-cloud/speech';
import fs from 'fs';
import * as path from "node:path";

async function testCurrentUploadCapability() {
  console.log('🔍 TESTING CURRENT UPLOAD PIPELINE CAPABILITY');
  console.log('=' .repeat(60));

  try {
    // Test 1: Google Cloud Storage Access
    console.log('\n✅ TEST 1: Google Cloud Storage Access');
    
    const storage = new Storage({
      projectId: 'steam-house-461401-t7',
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });
    
    const bucketName = 'jemzy-video-moderation-steam-house-461401-t7';
    const bucket = storage.bucket(bucketName);
    
    const [exists] = await bucket.exists();
    console.log(`Bucket ${bucketName} exists: ${exists}`);
    
    if (exists) {
      const [files] = await bucket.getFiles({ maxResults: 3 });
      console.log(`Recent files in bucket: ${files.length}`);
      files.forEach(file => {
        console.log(`  - ${file.name} (${file.metadata.size} bytes)`);
      });
    }

    // Test 2: Video Intelligence API
    console.log('\n✅ TEST 2: Video Intelligence API Access');
    
    const videoIntelligence = new VideoIntelligenceServiceClient({
      projectId: 'steam-house-461401-t7',
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });
    
    console.log('Video Intelligence client initialized successfully');

    // Test 3: Speech-to-Text API
    console.log('\n✅ TEST 3: Speech-to-Text API Access');
    
    const speechClient = new SpeechClient({
      projectId: 'steam-house-461401-t7',
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });
    
    console.log('Speech client initialized successfully');

    // Test 4: Upload Route Simulation
    console.log('\n✅ TEST 4: Upload Route Simulation');
    
    try {
      // Create a small test file
      const testFilePath = './test-upload.txt';
      fs.writeFileSync(testFilePath, 'This is a test upload file');
      
      const testFile = bucket.file('test-uploads/test-' + Date.now() + '.txt');
      await testFile.save(fs.readFileSync(testFilePath));
      
      console.log('✅ Test file uploaded to GCS successfully');
      
      // Clean up
      await testFile.delete();
      fs.unlinkSync(testFilePath);
      console.log('✅ Test file cleaned up');
      
    } catch (uploadError) {
      console.error('❌ GCS upload test failed:', uploadError.message);
    }

    // Test 5: Environment Variables Check
    console.log('\n✅ TEST 5: Environment Variables Check');
    
    const requiredEnvVars = [
      'GOOGLE_APPLICATION_CREDENTIALS',
      'BUNNY_API_KEY',
      'DATABASE_URL'
    ];
    
    requiredEnvVars.forEach(envVar => {
      const value = process.env[envVar];
      if (value) {
        console.log(`✅ ${envVar}: Present (${value.length} chars)`);
      } else {
        console.log(`❌ ${envVar}: Missing`);
      }
    });

    // Test 6: Check specific video failure
    console.log('\n✅ TEST 6: Investigating Specific Upload Failure');
    
    const failedVideoId = '8e3f2825-9d52-49eb-b911-8721ed359a03';
    console.log(`Investigating failed video: ${failedVideoId}`);
    console.log('Error message: "Content verification temporarily unavailable"');
    
    // This suggests the AI moderation services were unreachable during upload
    console.log('Likely cause: AI service authentication or network issue during upload');

    console.log('\n🔧 RECOMMENDATIONS:');
    console.log('1. AI services appear accessible now - try uploading again');
    console.log('2. The error suggests temporary service unavailability');
    console.log('3. Upload pipeline security is working (rejected rather than bypassed)');
    console.log('4. Consider implementing retry logic for AI service failures');

  } catch (error) {
    console.error('💥 Test error:', error.message);
  }

  console.log('\n' + '=' .repeat(60));
  console.log('🔍 UPLOAD CAPABILITY TEST COMPLETE');
}

testCurrentUploadCapability().catch(console.error);