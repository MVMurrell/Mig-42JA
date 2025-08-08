/**
 * TEST: Upload size limits investigation
 * 
 * This script tests different file sizes to find the exact limit where uploads fail
 */

import { writeFileSync } from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

async function testUploadSizeLimits() {
  console.log('🔍 TESTING: Upload size limits');
  console.log('===============================');
  
  const testSizes = [
    { name: '1MB', size: 1 * 1024 * 1024 },
    { name: '2MB', size: 2 * 1024 * 1024 },
    { name: '3MB', size: 3 * 1024 * 1024 },  // Your file size
    { name: '5MB', size: 5 * 1024 * 1024 },
    { name: '10MB', size: 10 * 1024 * 1024 },
    { name: '20MB', size: 20 * 1024 * 1024 },
  ];
  
  for (const test of testSizes) {
    try {
      console.log(`\n📋 Testing ${test.name} file (${test.size} bytes)`);
      
      // Create test file
      const testData = Buffer.alloc(test.size, 'A');
      const fileName = `test-${test.name}.webm`;
      writeFileSync(fileName, testData);
      
      // Create FormData
      const formData = new FormData();
      formData.append('video', testData, fileName);
      formData.append('title', `Test ${test.name}`);
      formData.append('description', 'Size limit test');
      formData.append('category', 'test');
      formData.append('latitude', '36.05717054');
      formData.append('longitude', '-94.16084126');
      formData.append('visibility', 'public');
      formData.append('duration', '3');
      
      // Test request
      const startTime = Date.now();
      const response = await fetch('http://localhost:5000/api/videos/upload-binary', {
        method: 'POST',
        body: formData,
        timeout: 30000  // 30 second timeout
      });
      const endTime = Date.now();
      
      console.log(`📥 Response: ${response.status} ${response.statusText} (${endTime - startTime}ms)`);
      
      if (response.status === 401) {
        console.log(`✅ ${test.name}: Request reached server (auth required)`);
      } else if (response.status === 413) {
        console.log(`❌ ${test.name}: Request too large (413 error)`);
      } else {
        const text = await response.text();
        console.log(`📝 ${test.name}: ${text.substring(0, 100)}...`);
      }
      
      // Cleanup
      try {
        const fs = await import('fs/promises');
        await fs.unlink(fileName);
      } catch {}
      
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
      
      if (error.message.includes('timeout')) {
        console.log(`⏰ ${test.name}: Request timed out - likely too large for proxy`);
      } else if (error.message.includes('ECONNRESET')) {
        console.log(`🔌 ${test.name}: Connection reset - proxy rejected request`);
      }
    }
  }
  
  console.log('\n🎯 DIAGNOSIS:');
  console.log('=============');
  console.log('If smaller files reach server but larger ones fail silently:');
  console.log('- Reverse proxy (Replit) has upload size limits');
  console.log('- Need to reduce video file size or compress before upload');
  console.log('- Or implement chunked upload for large files');
}

testUploadSizeLimits().catch(console.error);