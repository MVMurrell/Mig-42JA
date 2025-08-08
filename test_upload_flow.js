/**
 * TEST UPLOAD FLOW: Simulate the complete video upload pipeline
 */

import { uploadFirstProcessor } from './server/uploadFirstProcessor.ts.js';
import { writeFile } from 'fs/promises';
import * as path from "node:path";

async function testUploadFlow() {
  console.log('🧪 UPLOAD TEST: Testing complete video upload pipeline...');
  
  try {
    // Create a test video file in temp uploads directory
    const testVideoId = `test-${Date.now()}`;
    const testVideoPath = join('./uploads/temp-uploads/', `${testVideoId}_recorded-video.webm`);
    
    // Create a minimal test video file (just empty bytes for testing the upload process)
    console.log(`📁 UPLOAD TEST: Creating test video file: ${testVideoPath}`);
    await writeFile(testVideoPath, Buffer.alloc(1024, 0)); // 1KB empty file
    
    // Create test metadata
    const testMetadata = {
      title: 'Upload Test Video',
      description: 'Testing the upload pipeline',
      category: 'Other',
      latitude: '36.0572751',
      longitude: '-94.1606781',
      visibility: 'public',
      frontendDuration: 5
    };
    
    console.log(`🚀 UPLOAD TEST: Starting upload processor with:`);
    console.log(`   Video ID: ${testVideoId}`);
    console.log(`   Video Path: ${testVideoPath}`);
    console.log(`   Metadata:`, JSON.stringify(testMetadata, null, 2));
    
    // Run the upload processor
    const result = await uploadFirstProcessor.processVideo(
      testVideoId, 
      testVideoPath, 
      testMetadata, 
      false // synchronous for testing
    );
    
    console.log(`📊 UPLOAD TEST: Processing completed - Result: ${result}`);
    
    if (result) {
      console.log('✅ UPLOAD TEST: SUCCESS - Video processing pipeline worked');
    } else {
      console.log('❌ UPLOAD TEST: FAILED - Video processing pipeline rejected the video');
    }
    
    // Check database to see what was recorded
    console.log('🔍 UPLOAD TEST: Checking database for processed video...');
    
    const { sql } = await import('./server/storage.ts');
    const videoRecord = await sql`
      SELECT 
        id, 
        title, 
        processing_status, 
        gcs_processing_url, 
        flagged_reason,
        created_at
      FROM videos 
      WHERE id = ${testVideoId}
    `;
    
    if (videoRecord.length > 0) {
      const video = videoRecord[0];
      console.log('📊 UPLOAD TEST: Database record found:');
      console.log(`   Status: ${video.processing_status}`);
      console.log(`   GCS URL: ${video.gcs_processing_url || 'NOT SET'}`);
      console.log(`   Flag Reason: ${video.flagged_reason || 'None'}`);
      console.log(`   Created: ${video.created_at}`);
    } else {
      console.log('❌ UPLOAD TEST: No database record found for test video');
    }
    
  } catch (error) {
    console.error('❌ UPLOAD TEST: Pipeline failed with error:', error);
    console.error('❌ UPLOAD TEST: Error message:', error.message);
    console.error('❌ UPLOAD TEST: Stack trace:', error.stack);
    
    // Analyze the error
    if (error.message.includes('GCS')) {
      console.error('🚨 UPLOAD TEST: GCS-related error detected');
    } else if (error.message.includes('FFmpeg')) {
      console.error('🚨 UPLOAD TEST: Video processing error detected');
    } else if (error.message.includes('AI')) {
      console.error('🚨 UPLOAD TEST: AI moderation error detected');
    }
  }
}

testUploadFlow().catch(console.error);