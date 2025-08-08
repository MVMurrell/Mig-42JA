/**
 * TEST: Direct server upload to diagnose proxy interception
 * 
 * This tests if the Express server can receive upload requests when
 * sent directly from the backend (bypassing any browser/proxy issues)
 */

import FormData from 'form-data';
import { writeFileSync } from 'fs';
import fetch from 'node-fetch';

async function testDirectServerUpload() {
  console.log('🔍 TESTING: Direct server upload (bypassing browser/proxy)');
  console.log('========================================================');
  
  try {
    // Create a small test video file
    console.log('\n📋 Step 1: Create test video file');
    const testVideoData = Buffer.from('WEBM\x1A\x45\xDF\xA3' + 'Test content to see if server receives requests'.repeat(10));
    const testFilePath = './test-direct-upload.webm';
    writeFileSync(testFilePath, testVideoData);
    console.log(`✅ Test video created: ${testVideoData.length} bytes`);
    
    // Create FormData
    console.log('\n📋 Step 2: Prepare FormData');
    const formData = new FormData();
    formData.append('video', testVideoData, {
      filename: 'test-direct-upload.webm',
      contentType: 'video/webm'
    });
    formData.append('title', 'Direct Server Test');
    formData.append('description', 'Testing if server receives upload requests');
    formData.append('category', 'test');
    formData.append('latitude', '36.05717054');
    formData.append('longitude', '-94.16084126');
    formData.append('visibility', 'public');
    formData.append('duration', '3');
    
    // Add debug headers to match frontend
    const headers = formData.getHeaders();
    headers['X-Upload-Debug'] = 'direct-server-test';
    headers['X-Upload-Timestamp'] = Date.now().toString();
    
    console.log('📤 Making direct request to localhost:5000...');
    console.log('🔍 Headers:', headers);
    
    // Test against localhost (internal server)
    const response = await fetch('http://localhost:5000/api/videos/upload-binary', {
      method: 'POST',
      body: formData,
      headers: headers,
      timeout: 10000
    });
    
    console.log(`📥 Response status: ${response.status} ${response.statusText}`);
    
    if (response.status === 401) {
      console.log('✅ EXPECTED: Server requires authentication (confirms server is reachable)');
    } else {
      const responseText = await response.text();
      console.log('📝 Response body:', responseText.substring(0, 200));
    }
    
    console.log('\n🔍 CHECKING: Look for these logs in server console:');
    console.log('1. "🔍 BINARY UPLOAD: POST /api/videos/upload-binary"');
    console.log('2. "🔍 ALL REQUESTS: POST /api/videos/upload-binary"');
    console.log('3. "🚨🚨🚨 UPLOAD ENDPOINT HIT!"');
    
    if (response.status === 401) {
      console.log('\n✅ SUCCESS: Request reached Express server (auth required)');
      console.log('🔧 DIAGNOSIS: Browser/proxy is intercepting upload requests');
      console.log('🔧 SOLUTION: Need to fix browser request or proxy configuration');
    } else {
      console.log('\n⚠️  UNEXPECTED: Server response differs from browser attempt');
    }
    
    // Cleanup
    try {
      const fs = await import('fs/promises');
      await fs.unlink(testFilePath);
    } catch {}
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('🔧 DIAGNOSIS: Express server is not running on port 5000');
    } else if (error.message.includes('timeout')) {
      console.log('🔧 DIAGNOSIS: Server is not responding (may be overloaded)');
    } else {
      console.log('🔧 DIAGNOSIS: Network or server issue');
    }
  }
}

testDirectServerUpload().catch(console.error);