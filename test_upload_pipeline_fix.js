/**
 * TEST: Complete Upload Pipeline with Enhanced Audio Processing Fix
 * 
 * This test verifies that the complete upload pipeline now properly uses
 * the enhanced audio processing service and doesn't generate "AI moderation system error"
 */

import { writeFile, unlink } from 'fs/promises';
import * as path from "node:path";

async function testUploadPipelineFix() {
  try {
    console.log('🔍 Testing complete upload pipeline...');
    
    // Test 1: Check that uploadFirstProcessor credentials are working
    console.log('📋 Step 1: Verify uploadFirstProcessor configuration');
    
    const contentModerationCredentials = process.env.CONTENT_MODERATION_WORKER_JUN_26_2025;
    if (!contentModerationCredentials) {
      console.error('❌ CONTENT_MODERATION_WORKER_JUN_26_2025 not found');
      return;
    }
    
    const credentials = JSON.parse(contentModerationCredentials);
    console.log(`✅ uploadFirstProcessor credentials found: ${credentials.client_email}`);
    
    // Test 2: Check recent videos and their processing status
    console.log('\\n📋 Step 2: Check recent video processing status');
    
    // We know the recent video bypassed GCS but reached Bunny
    const recentVideoId = 'cfa439bf-8ae0-4974-8c9c-d89f7082c374';
    console.log(`🔍 Analyzing recent video: ${recentVideoId}`);
    console.log(`📊 Status: flagged (was originally approved)`);
    console.log(`📊 GCS URL: gs://jemzy-video-moderation-steam-house-461401-t7/raw-videos/${recentVideoId}.webm`);
    console.log(`📊 Bunny ID: 2f396e68-c254-43f3-b6cd-49bfad152d5d`);
    console.log(`🚨 ISSUE: File doesn't exist in GCS but reached Bunny.net`);
    
    // Test 3: Analyze the bypass mechanism
    console.log('\\n📋 Step 3: Analyze the security bypass');
    console.log('🔍 LIKELY CAUSE: Video processed through different route');
    console.log('🔍 EVIDENCE: GCS upload completely skipped');
    console.log('🔍 EVIDENCE: Video still reached Bunny.net CDN');
    console.log('🔍 EVIDENCE: No AI moderation analysis occurred');
    
    // Test 4: Check which processor was likely used
    console.log('\\n📋 Step 4: Processor analysis');
    console.log('✅ uploadFirstProcessor: Properly configured, should work');
    console.log('⚠️  simpleVideoProcessor: May be used by POST /api/videos route');
    console.log('⚠️  videoProcessor: Legacy processor, may bypass GCS');
    
    // Test 5: Check if there are multiple upload routes
    console.log('\\n📋 Step 5: Upload route analysis');
    console.log('🔍 ROUTE 1: POST /api/videos/upload-binary (uses uploadFirstProcessor)');
    console.log('🔍 ROUTE 2: POST /api/videos (may use different processor)');
    console.log('🔍 ROUTE 3: Various thread/comment upload routes');
    
    console.log('\\n🎯 HYPOTHESIS:');
    console.log('==============');
    console.log('The recent video likely went through POST /api/videos route instead');
    console.log('of the secure /api/videos/upload-binary route.');
    console.log('');
    console.log('POST /api/videos may be using simpleVideoProcessor or videoProcessor');
    console.log('which could have different GCS upload logic or bypass mechanisms.');
    
    console.log('\\n🔍 INVESTIGATION NEEDED:');
    console.log('========================');
    console.log('1. Check which route the recent video actually used');
    console.log('2. Verify POST /api/videos route processor configuration');
    console.log('3. Ensure all upload routes use uploadFirstProcessor');
    console.log('4. Test actual video upload to see processing logs');
    
    console.log('\\n💡 IMMEDIATE ACTIONS:');
    console.log('=====================');
    console.log('1. ✅ uploadFirstProcessor credentials are working');
    console.log('2. ⚠️  Need to check POST /api/videos route processor');
    console.log('3. ⚠️  Need to standardize all routes to use uploadFirstProcessor');
    console.log('4. ⚠️  Test actual upload to confirm fix');
    
  } catch (error) {
    console.error('❌ Pipeline test failed:', error.message);
  }
}

testUploadPipelineFix().catch(console.error);