/**
 * TEST: Trigger actual upload to see real-time logs
 * 
 * This test uploads a video through the actual API endpoint
 * to capture the exact error that's causing GCS upload failures.
 */

import { writeFileSync, createReadStream } from 'fs';
import * as path from "node:path";
import FormData from 'form-data';
import fetch from 'node-fetch';

async function testActualUploadDebug() {
  console.log('🔍 TESTING: Actual Upload Debug');
  console.log('================================');
  
  try {
    // Step 1: Create a test video file
    console.log('\n📋 Step 1: Create test video file');
    const testVideoData = Buffer.from('WEBM\x1A\x45\xDF\xA3' + 'Debug upload test content'.repeat(100));
    const testFilePath = join('./uploads', 'debug-upload-test.webm');
    writeFileSync(testFilePath, testVideoData);
    console.log(`✅ Test video created: ${testFilePath} (${testVideoData.length} bytes)`);
    
    // Step 2: Test upload to trigger the actual error
    console.log('\n📋 Step 2: Test upload through /api/videos/upload-binary');
    
    const formData = new FormData();
    formData.append('video', createReadStream(testFilePath), 'debug-upload-test.webm');
    formData.append('title', 'Debug Upload Test');
    formData.append('description', 'Testing upload to debug GCS failure');
    formData.append('category', 'test');
    formData.append('latitude', '36.05717054');
    formData.append('longitude', '-94.16084126');
    formData.append('visibility', 'public');
    formData.append('duration', '5');
    
    console.log('📤 Making request to /api/videos/upload-binary...');
    console.log('🔍 Watch the server console for detailed logs');
    
    const response = await fetch('http://localhost:5000/api/videos/upload-binary', {
      method: 'POST',
      body: formData,
      headers: {
        // Add a test auth header to bypass authentication for testing
        'Authorization': 'Bearer test-token',
        ...formData.getHeaders()
      }
    });
    
    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    console.log('📝 Response Body:', responseText);
    
    // Step 3: Parse response and check for error patterns
    console.log('\n📋 Step 3: Analyze response for error patterns');
    
    if (responseText.includes('Content verification temporarily unavailable')) {
      console.log('🎯 CONFIRMED: Same error as your upload!');
      console.log('🔍 This indicates a credentials or GCS authentication issue');
    }
    
    if (responseText.includes('GOOGLE_APPLICATION_CREDENTIALS')) {
      console.log('🎯 CREDENTIALS ISSUE: Environment variable problem detected');
    }
    
    if (responseText.includes('GCS upload failed')) {
      console.log('🎯 GCS UPLOAD ISSUE: Direct GCS upload failure');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testActualUploadDebug();