/**
 * TEST CLEAN VIDEO: Create a simple, clean video that should pass AI moderation
 */

import { uploadFirstProcessor } from './server/uploadFirstProcessor.ts.js';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';

async function createCleanTestVideo(outputPath) {
  return new Promise((resolve, reject) => {
    // Create a very simple, clean video: white screen with simple text
    const ffmpegArgs = [
      '-f', 'lavfi',
      '-i', 'color=white:size=320x240:duration=3',
      '-f', 'lavfi', 
      '-i', 'sine=frequency=440:duration=3',
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-t', '3',
      '-pix_fmt', 'yuv420p',
      '-y',
      outputPath
    ];
    
    console.log(`🎬 Creating clean test video: ${outputPath}`);
    
    const ffmpeg = spawn('ffmpeg', ffmpegArgs);
    
    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Clean test video created successfully`);
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

async function testCleanVideo() {
  console.log('🧪 CLEAN VIDEO TEST: Testing with simple, appropriate content...');
  
  try {
    // Generate proper UUID for video ID
    const testVideoId = randomUUID();
    const testVideoPath = `./uploads/temp-uploads/${testVideoId}_recorded-video.mp4`;
    
    // Create a clean test video file
    await createCleanTestVideo(testVideoPath);
    
    // Create test metadata
    const testMetadata = {
      title: 'Clean Test Video',
      description: 'Simple clean video for testing',
      category: 'Other',
      latitude: '36.0572751',
      longitude: '-94.1606781',
      visibility: 'public',
      frontendDuration: 3
    };
    
    console.log(`🚀 CLEAN VIDEO TEST: Starting upload processor with:`);
    console.log(`   Video ID: ${testVideoId}`);
    console.log(`   Video Path: ${testVideoPath}`);
    
    // Run the upload processor
    const result = await uploadFirstProcessor.processVideo(
      testVideoId, 
      testVideoPath, 
      testMetadata, 
      false // synchronous for testing
    );
    
    console.log(`📊 CLEAN VIDEO TEST: Processing completed - Result: ${result}`);
    
    if (result) {
      console.log('🎉 SUCCESS: Clean video passed AI moderation!');
      console.log('🎉 Video upload pipeline is working end-to-end!');
    } else {
      console.log('⚠️ REJECTED: Even clean video was rejected - AI moderation may be too strict');
    }
    
  } catch (error) {
    console.error('❌ CLEAN VIDEO TEST: Pipeline failed with error:', error);
    console.error('❌ CLEAN VIDEO TEST: Error message:', error.message);
  }
}

testCleanVideo().catch(console.error);