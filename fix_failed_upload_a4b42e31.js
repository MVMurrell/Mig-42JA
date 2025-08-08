/**
 * FIX: Manual processing for failed video a4b42e31-9018-44c1-bc46-c2e1cb6b4b96
 * 
 * This script manually processes the video that failed because the processor
 * couldn't find the temp file.
 */

import * as path from "node:path";
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function fixFailedUpload() {
  const videoId = 'a4b42e31-9018-44c1-bc46-c2e1cb6b4b96';
  const filename = 'XNXX_video_second_take_360p.mp4';
  
  console.log('🔧 FIXING: Failed video upload for', videoId);
  
  // Check current temp file location
  const currentPath = path.join('./uploads/temp-uploads', `${videoId}_${filename}`);
  console.log('📂 Current temp file path:', currentPath);
  console.log('📂 File exists:', fs.existsSync(currentPath));
  
  if (fs.existsSync(currentPath)) {
    console.log('✅ Temp file found, manually triggering processing...');
    
    try {
      // Import the upload processor directly using tsx
      const { uploadFirstProcessor } = await import('./server/uploadFirstProcessor.ts');
      
      console.log('🚀 Starting manual processing with uploadFirstProcessor...');
      
      const metadata = {
        title: 'Testing',
        description: 'hello',
        category: 'chat',
        latitude: 36.05723092,
        longitude: -94.16062965,
        visibility: 'everyone',
        groupId: null,
        frontendDuration: 25.0
      };
      
      // Process the video with MP4 file (no preprocessing needed)
      const success = await uploadFirstProcessor.processVideo(
        videoId,
        currentPath,
        metadata,
        false // false = no preprocessing needed for MP4
      );
      
      if (success) {
        console.log('✅ Video processing completed successfully!');
        console.log('🎯 Video should now be visible in your profile');
      } else {
        console.log('❌ Video processing failed');
      }
      
    } catch (error) {
      console.error('❌ Manual processing error:', error.message);
      console.error('📋 Error details:', error.stack);
    }
  } else {
    console.log('❌ Temp file not found at expected location');
    console.log('📂 Checking alternate locations...');
    
    // Check if file exists with different naming patterns
    const files = fs.readdirSync('./uploads/temp-uploads/');
    const matchingFiles = files.filter(file => file.includes(videoId));
    console.log('📂 Files matching video ID:', matchingFiles);
  }
}

fixFailedUpload().catch(error => {
  console.error('❌ Fix script failed:', error);
  process.exit(1);
});