import { execSync } from 'child_process';

async function triggerStuckVideo() {
  try {
    console.log('🔧 MANUAL TRIGGER: Starting processing for stuck video...');
    
    // Use tsx to run TypeScript directly
    const result = execSync(`npx tsx -e "
import { uploadFirstProcessor } from './server/uploadFirstProcessor.js.js';
import { readdir } from 'fs/promises';
import * as path from "node:path";

async function processStuckVideo() {
  try {
    const videoId = '5788ec5c-f5b5-4d73-9bb2-ea058e926196';
    console.log('Looking for video file in /tmp...');
    
    // List all files in /tmp to find our video
    const files = await readdir('/tmp');
    const videoFiles = files.filter(f => f.includes(videoId) || f.includes('video_' + videoId));
    console.log('Found files:', videoFiles);
    
    let videoPath;
    if (videoFiles.length > 0) {
      videoPath = join('/tmp', videoFiles[0]);
      console.log('Using video file:', videoPath);
    } else {
      // Create a dummy file for processing - the processor should handle missing files gracefully
      videoPath = '/tmp/dummy_video.webm';
      console.log('No video file found, using dummy path for processing trigger');
    }
    
    await uploadFirstProcessor.processVideo(videoId, videoPath, {
      title: 'Event 777',
      description: '',
      category: 'events',
      latitude: '36.05717424',
      longitude: '-94.16055225',
      visibility: 'everyone',
      groupId: null,
      frontendDuration: 6
    });
    
    console.log('✅ MANUAL TRIGGER: Processing completed successfully');
  } catch (error) {
    console.error('❌ MANUAL TRIGGER FAILED:', error.message);
  }
}

processStuckVideo();
"`, { encoding: 'utf8', stdio: 'inherit' });
    
  } catch (error) {
    console.error('❌ Failed to trigger processing:', error.message);
  }
}

triggerStuckVideo();