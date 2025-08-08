/**
 * DEBUG: Upload Issue Investigation
 * 
 * This script investigates why frontend upload requests aren't reaching the server
 */

import { writeFileSync } from 'fs';
import * as path from "node:path";

async function debugUploadIssue() {
  console.log('🔍 DEBUGGING: Upload connectivity issue');
  console.log('======================================');
  
  try {
    // Test 1: Basic connectivity to server
    console.log('\n📋 Test 1: Basic server connectivity');
    const healthResponse = await fetch('http://localhost:5000/api/auth/user');
    console.log(`✅ Server responding: ${healthResponse.status} ${healthResponse.statusText}`);
    
    // Test 2: Check if upload endpoint exists
    console.log('\n📋 Test 2: Upload endpoint accessibility');
    const uploadResponse = await fetch('http://localhost:5000/api/videos/upload-binary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log(`✅ Upload endpoint responding: ${uploadResponse.status} ${uploadResponse.statusText}`);
    
    // Test 3: Check recent server logs for any errors
    console.log('\n📋 Test 3: Look for server errors');
    console.log('🔍 Check if server is receiving any upload requests at all');
    console.log('🔍 Look for the distinctive upload logging: "🚨🚨🚨 UPLOAD ENDPOINT HIT!"');
    
    // Test 4: Network timing
    console.log('\n📋 Test 4: Network timing test');
    const startTime = Date.now();
    try {
      await fetch('http://localhost:5000/api/auth/user');
      const endTime = Date.now();
      console.log(`✅ Network latency: ${endTime - startTime}ms`);
    } catch (error) {
      console.log(`❌ Network error: ${error.message}`);
    }
    
    console.log('\n🎯 DIAGNOSIS:');
    console.log('=============');
    console.log('If upload endpoint responds with 401/400 but no server logs appear,');
    console.log('the issue is likely:');
    console.log('1. Frontend request never leaving the browser');
    console.log('2. Proxy/routing issue intercepting requests');
    console.log('3. CORS or authentication middleware blocking silently');
    console.log('4. Large file upload timing out before reaching server');
    console.log('\n🔍 NEXT STEPS:');
    console.log('- Check browser Network tab for actual HTTP requests');
    console.log('- Verify file size isn\'t exceeding limits');
    console.log('- Check for any proxy or middleware interference');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugUploadIssue().catch(console.error);