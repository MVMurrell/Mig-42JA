/**
 * CHECK: Latest video GCS file existence
 * 
 * Check if video 50c5ebaa-ef3f-474f-8b52-6c8f5cb0bb10 made it to GCS storage
 */

import { Storage } from '@google-cloud/storage';

async function checkLatestVideoGCS() {
  try {
    console.log('🔍 Checking if video 50c5ebaa-ef3f-474f-8b52-6c8f5cb0bb10 made it to GCS...');
    
    // Initialize GCS with credentials
    const storage = new Storage({
      projectId: 'steam-house-461401-t7',
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });
    
    const bucketName = 'jemzy-video-storage';
    const bucket = storage.bucket(bucketName);
    
    // List all files in the bucket
    const [files] = await bucket.getFiles();
    
    console.log(`📁 Total files in bucket: ${files.length}`);
    
    // Look for files containing the video ID
    const videoId = '50c5ebaa-ef3f-474f-8b52-6c8f5cb0bb10';
    const matchingFiles = files.filter(file => file.name.includes(videoId));
    
    console.log(`🎯 Files matching video ID ${videoId}:`, matchingFiles.length);
    
    if (matchingFiles.length > 0) {
      console.log('✅ VIDEO FOUND IN GCS!');
      matchingFiles.forEach(file => {
        console.log(`  📄 File: ${file.name}`);
        console.log(`  📅 Created: ${file.metadata.timeCreated}`);
        console.log(`  📦 Size: ${file.metadata.size} bytes`);
      });
    } else {
      console.log('❌ VIDEO NOT FOUND IN GCS');
      
      // Show recent files for context
      const recentFiles = files
        .sort((a, b) => new Date(b.metadata.timeCreated) - new Date(a.metadata.timeCreated))
        .slice(0, 5);
        
      console.log('📋 Recent files in bucket:');
      recentFiles.forEach(file => {
        console.log(`  📄 ${file.name} (${file.metadata.timeCreated})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking GCS:', error.message);
  }
}

checkLatestVideoGCS();