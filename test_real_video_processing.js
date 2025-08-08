/**
 * TEST REAL VIDEO PROCESSING: Use a proper UUID and simulate real video
 */

import { uploadFirstProcessor } from './server/uploadFirstProcessor.ts.js';
import { writeFile } from 'fs/promises';
import * as path from "node:path";
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';

async function createValidTestVideo(outputPath) {
  return new Promise((resolve, reject) => {
    // Create a 5-second valid video file using FFmpeg
    const ffmpegArgs = [
      '-f', 'lavfi',
      '-i', 'testsrc=duration=5:size=320x240:rate=30',
      '-f', 'lavfi', 
      '-i', 'sine=frequency=1000:duration=5',
      '-c:v', 'libvpx',
      '-c:a', 'libvorbis',
      '-t', '5',
      '-y',
      outputPath
    ];
    
    console.log(`🎬 Creating valid test video: ${outputPath}`);
    
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    
    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Valid test video created successfully`);
        resolve(outputPath);
      } else {
        console.error(`❌ FFmpeg failed with code ${code}`);
        console.error(`❌ FFmpeg stderr:`, stderr);
        reject(new Error(`Test video creation failed`));
      }
    });
    
    ffmpeg.on('error', reject);
  });
}

async function testRealVideoProcessing() {
  console.log('🧪 REAL VIDEO TEST: Testing with valid UUID and real video data...');
  
  try {
    // Generate proper UUID for video ID
    const testVideoId = randomUUID();
    const testVideoPath = join('./uploads/temp-uploads/', `${testVideoId}_recorded-video.webm`);
    
    // Create a valid test video file
    await createValidTestVideo(testVideoPath);
    
    // Create test metadata (same format as chunked upload)
    const testMetadata = {
      title: 'Real Video Test',
      description: 'Testing with valid video and UUID',
      category: 'Other',
      latitude: '36.0572751',
      longitude: '-94.1606781',
      visibility: 'public',
      frontendDuration: 5
    };
    
    console.log(`🚀 REAL VIDEO TEST: Starting upload processor with:`);
    console.log(`   Video ID: ${testVideoId}`);
    console.log(`   Video Path: ${testVideoPath}`);
    
    // Run the upload processor
    const result = await uploadFirstProcessor.processVideo(
      testVideoId, 
      testVideoPath, 
      testMetadata, 
      false // synchronous for testing
    );
    
    console.log(`📊 REAL VIDEO TEST: Processing completed - Result: ${result}`);
    
    // Check database to see what was recorded
    console.log('🔍 REAL VIDEO TEST: Checking database for processed video...');
    
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
      console.log('📊 REAL VIDEO TEST: Database record found:');
      console.log(`   Status: ${video.processing_status}`);
      console.log(`   GCS URL: ${video.gcs_processing_url || 'NOT SET'}`);
      console.log(`   Flag Reason: ${video.flagged_reason || 'None'}`);
      console.log(`   Created: ${video.created_at}`);
      
      if (result && video.processing_status === 'approved') {
        console.log('🎉 SUCCESS: Video processed successfully through entire pipeline!');
      } else if (!result && video.processing_status === 'rejected') {
        console.log(`⚠️ REJECTED: Video was properly rejected - Reason: ${video.flagged_reason}`);
      } else {
        console.log('❓ UNEXPECTED: Result mismatch between processor and database');
      }
    } else {
      console.log('❌ REAL VIDEO TEST: No database record found for test video');
    }
    
  } catch (error) {
    console.error('❌ REAL VIDEO TEST: Pipeline failed with error:', error);
    console.error('❌ REAL VIDEO TEST: Error message:', error.message);
    
    // Analyze the error
    if (error.message.includes('GCS')) {
      console.error('🚨 REAL VIDEO TEST: GCS-related error detected');
    } else if (error.message.includes('FFmpeg')) {
      console.error('🚨 REAL VIDEO TEST: Video processing error detected');
    } else if (error.message.includes('AI')) {
      console.error('🚨 REAL VIDEO TEST: AI moderation error detected');
    } else if (error.message.includes('uuid')) {
      console.error('🚨 REAL VIDEO TEST: Database UUID error detected');
    }
  }
}

testRealVideoProcessing().catch(console.error);