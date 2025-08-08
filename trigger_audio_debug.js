import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as path from "node:path";

// Simulate the exact same environment and execution as our audio processing service
async function testFFmpegInNodeContext() {
  const videoPath = '/tmp/test_audio_debug.mp4';
  const outputPath = '/tmp/test_audio_extract.flac';
  
  console.log('=== TESTING FFMPEG IN NODE.JS CONTEXT ===');
  
  // Check if input file exists
  try {
    const stats = await fs.stat(videoPath);
    console.log(`Input file exists: ${stats.size} bytes`);
  } catch (error) {
    console.error('Input file not found:', error.message);
    return;
  }
  
  return new Promise((resolve, reject) => {
    const ffmpegArgs = [
      '-i', videoPath,
      '-vn',
      '-acodec', 'flac',
      '-ar', '16000',
      '-ac', '1',
      '-y',
      outputPath
    ];
    
    console.log(`FFmpeg command: ffmpeg ${ffmpegArgs.join(' ')}`);
    
    let stderrOutput = '';
    let stdoutOutput = '';
    
    const ffmpeg = spawn('ffmpeg', ffmpegArgs, {
      env: process.env,
      cwd: process.cwd()
    });
    
    ffmpeg.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdoutOutput += chunk;
      console.log(`FFmpeg stdout: ${chunk.trim()}`);
    });
    
    ffmpeg.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderrOutput += chunk;
      console.log(`FFmpeg stderr: ${chunk.trim()}`);
    });

    ffmpeg.on('close', (code) => {
      console.log(`\n=== FFMPEG COMPLETED ===`);
      console.log(`Exit code: ${code}`);
      console.log(`Complete stdout: ${stdoutOutput || '(none)'}`);
      console.log(`Complete stderr: ${stderrOutput || '(none)'}`);
      
      if (code === 0) {
        console.log('SUCCESS: FFmpeg extraction worked in Node.js context');
        resolve(outputPath);
      } else {
        console.error('FAILURE: FFmpeg failed in Node.js context');
        reject(new Error(`FFmpeg failed with code ${code}: ${stderrOutput}`));
      }
    });
    
    ffmpeg.on('error', (error) => {
      console.error('FFmpeg spawn error:', error);
      reject(error);
    });
  });
}

testFFmpegInNodeContext()
  .then(result => console.log('Test completed successfully:', result))
  .catch(error => console.error('Test failed:', error.message));