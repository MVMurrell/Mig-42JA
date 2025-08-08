// Simple debugging script to identify gesture detection failure
import { spawn } from 'child_process';
import * as path from "node:path";
import fs from 'fs/promises';

async function debugGestureFailure() {
  console.log('🔍 GESTURE FAILURE ANALYSIS: Testing each component...');
  
  // Test 1: Check if FFmpeg is available
  console.log('\n1. Testing FFmpeg availability...');
  try {
    const ffmpegResult = await testFFmpeg();
    console.log(ffmpegResult ? '✅ FFmpeg: Available' : '❌ FFmpeg: Not available');
  } catch (error) {
    console.log('❌ FFmpeg test failed:', error.message);
  }
  
  // Test 2: Check file system permissions
  console.log('\n2. Testing file system permissions...');
  try {
    const fsResult = await testFileSystem();
    console.log(fsResult ? '✅ File System: OK' : '❌ File System: Permission denied');
  } catch (error) {
    console.log('❌ File system test failed:', error.message);
  }
  
  // Test 3: Check Google Cloud credentials
  console.log('\n3. Testing Google Cloud credentials...');
  try {
    const credentialsResult = await testGoogleCredentials();
    console.log(credentialsResult ? '✅ Credentials: Valid' : '❌ Credentials: Invalid');
  } catch (error) {
    console.log('❌ Credentials test failed:', error.message);
  }
  
  // Test 4: Test a simple frame extraction
  console.log('\n4. Testing frame extraction with a simple video...');
  try {
    const extractionResult = await testFrameExtraction();
    console.log(extractionResult ? '✅ Frame Extraction: Working' : '❌ Frame Extraction: Failed');
  } catch (error) {
    console.log('❌ Frame extraction test failed:', error.message);
  }
  
  console.log('\n🏁 Analysis complete');
}

function testFFmpeg() {
  return new Promise((resolve) => {
    const ffmpeg = spawn('ffmpeg', ['-version']);
    
    ffmpeg.on('close', (code) => {
      resolve(code === 0);
    });
    
    ffmpeg.on('error', () => {
      resolve(false);
    });
  });
}

async function testFileSystem() {
  try {
    const tempDir = '/tmp';
    const testFile = join(tempDir, 'gesture-test.txt');
    
    // Test write
    await fs.writeFile(testFile, 'test');
    
    // Test read
    await fs.readFile(testFile, 'utf8');
    
    // Test delete
    await fs.unlink(testFile);
    
    // Test directory listing
    await fs.readdir(tempDir);
    
    return true;
  } catch (error) {
    return false;
  }
}

async function testGoogleCredentials() {
  try {
    const serviceAccountKey = process.env.GOOGLE_CLOUD_CREDENTIALS;
    if (!serviceAccountKey) {
      console.log('   - GOOGLE_CLOUD_CREDENTIALS not found');
      return false;
    }
    
    const credentials = JSON.parse(serviceAccountKey);
    console.log(`   - Project ID: ${credentials.project_id}`);
    console.log(`   - Client Email: ${credentials.client_email}`);
    
    return true;
  } catch (error) {
    console.log(`   - Parsing error: ${error.message}`);
    return false;
  }
}

function testFrameExtraction() {
  return new Promise(async (resolve) => {
    try {
      // Create a minimal test video (1 second, black screen)
      const testVideoPath = '/tmp/test_video.mp4';
      const framePattern = '/tmp/test_frame_%03d.jpg';
      
      console.log('   - Creating test video...');
      
      // Create test video using FFmpeg
      const createVideo = spawn('ffmpeg', [
        '-f', 'lavfi',
        '-i', 'color=black:size=320x240:duration=1',
        '-c:v', 'libx264',
        '-y',
        testVideoPath
      ]);
      
      createVideo.on('close', async (code) => {
        if (code !== 0) {
          console.log('   - Failed to create test video');
          resolve(false);
          return;
        }
        
        console.log('   - Test video created, extracting frames...');
        
        // Extract frames
        const extractFrames = spawn('ffmpeg', [
          '-i', testVideoPath,
          '-vf', 'fps=1',
          '-q:v', '2',
          framePattern,
          '-y'
        ]);
        
        extractFrames.on('close', async (extractCode) => {
          try {
            if (extractCode === 0) {
              // Check if frames were created
              const files = await fs.readdir('/tmp');
              const frames = files.filter(f => f.startsWith('test_frame_'));
              console.log(`   - Extracted ${frames.length} frames`);
              
              // Clean up
              await fs.unlink(testVideoPath);
              for (const frame of frames) {
                await fs.unlink(join('/tmp', frame));
              }
              
              resolve(frames.length > 0);
            } else {
              console.log(`   - Frame extraction failed (code: ${extractCode})`);
              resolve(false);
            }
          } catch (cleanupError) {
            console.log(`   - Cleanup error: ${cleanupError.message}`);
            resolve(false);
          }
        });
        
        extractFrames.on('error', (error) => {
          console.log(`   - Frame extraction spawn error: ${error.message}`);
          resolve(false);
        });
      });
      
      createVideo.on('error', (error) => {
        console.log(`   - Video creation spawn error: ${error.message}`);
        resolve(false);
      });
      
    } catch (error) {
      console.log(`   - Test setup error: ${error.message}`);
      resolve(false);
    }
  });
}

// Run the analysis
debugGestureFailure().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Analysis script crashed:', error);
  process.exit(1);
});