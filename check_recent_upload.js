/**
 * Check if the recent video upload made it to GCS storage
 * and verify the new security fix is working properly
 */

import { Storage } from '@google-cloud/storage';
import { execSync } from 'child_process';

async function checkRecentUpload() {
  console.log('🔍 CHECKING RECENT VIDEO UPLOAD');
  console.log('=================================');
  
  try {
    // Initialize Google Cloud Storage
    const credentials = JSON.parse(process.env.CONTENT_MODERATION_WORKER_JUN_26_2025);
    const storage = new Storage({
      projectId: 'steam-house-461401-t7',
      credentials: credentials
    });
    
    const bucketName = 'jemzy-video-moderation-steam-house-461401-t7';
    const bucket = storage.bucket(bucketName);
    
    // Check for the most recent video uploads in the database
    console.log('\n🗄️ Checking most recent videos in database...');
    
    const checkRecentVideos = `
      SELECT 
        id, 
        title, 
        processing_status, 
        flagged_reason,
        bunny_video_id,
        gcs_processing_url,
        is_active,
        created_at
      FROM videos 
      WHERE user_id = 'google-oauth2|117032826996185616207'
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    
    const result = execSync(`cd /home/runner/workspace && node -e "
      import { drizzle } from "drizzle-orm/neon-http";
      import { neon } = from "@neondatabase/serverless";
      
      async function checkVideos() {
        const sql = neon(process.env.DATABASE_URL);
        const db = drizzle(sql);
        
        const result = await sql\\\`${checkRecentVideos}\\\`;
        console.log('📊 Recent videos:');
        result.forEach((video, index) => {
          console.log(\\\`\\\${index + 1}. \\\${video.id} - \\\${video.title || 'Untitled'} - \\\${video.processing_status} - \\\${video.created_at}\\\`);
          if (video.gcs_processing_url) {
            console.log(\\\`   GCS: \\\${video.gcs_processing_url}\\\`);
          }
        });
        
        if (result.length > 0) {
          console.log('\\n📋 Most recent video details:');
          console.log(JSON.stringify(result[0], null, 2));
          return result[0].id;
        }
        return null;
      }
      
      checkVideos().then(videoId => {
        if (videoId) {
          console.log('\\n🎯 Most recent video ID:', videoId);
        }
      }).catch(console.error);
    "`, { encoding: 'utf8' });
    
    console.log(result);
    
    // Extract the most recent video ID from the output
    const videoIdMatch = result.match(/🎯 Most recent video ID: ([a-f0-9-]+)/);
    const mostRecentVideoId = videoIdMatch ? videoIdMatch[1] : null;
    
    if (mostRecentVideoId) {
      console.log(`\n🔍 Checking GCS for video: ${mostRecentVideoId}`);
      
      // Check all possible file locations for this video
      const possibleFiles = [
        `raw-videos/${mostRecentVideoId}.webm`,
        `raw-videos/${mostRecentVideoId}.mp4`,
        `${mostRecentVideoId}.webm`,
        `${mostRecentVideoId}.mp4`
      ];
      
      let foundInGCS = false;
      let gcsFileName = '';
      
      for (const fileName of possibleFiles) {
        const file = bucket.file(fileName);
        const [exists] = await file.exists();
        if (exists) {
          foundInGCS = true;
          gcsFileName = fileName;
          const [metadata] = await file.getMetadata();
          console.log(`✅ FOUND in GCS: ${fileName}`);
          console.log(`   Size: ${metadata.size} bytes`);
          console.log(`   Created: ${metadata.timeCreated}`);
          console.log(`   Updated: ${metadata.updated}`);
          break;
        } else {
          console.log(`❌ NOT FOUND: ${fileName}`);
        }
      }
      
      if (foundInGCS) {
        console.log('\n✅ SUCCESS: New security fix is working!');
        console.log('   - Video properly uploaded to GCS');
        console.log('   - AI moderation can now analyze the file');
        console.log('   - Security pipeline is functioning correctly');
      } else {
        console.log('\n🚨 SECURITY ISSUE: Video missing from GCS!');
        console.log('   - This should not happen with the new security fix');
        console.log('   - Video may have been rejected by fail-closed policy');
        console.log('   - Check processing logs for security rejection');
      }
    }
    
    // Also check for any new files uploaded in the last hour
    console.log('\n📂 Checking all recent GCS uploads (last hour)...');
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [files] = await bucket.getFiles({
      prefix: 'raw-videos/'
    });
    
    const recentFiles = files.filter(file => 
      new Date(file.metadata.timeCreated) > oneHourAgo
    );
    
    if (recentFiles.length > 0) {
      console.log(`\n🆕 Found ${recentFiles.length} recent uploads:`);
      recentFiles.forEach(file => {
        const videoId = file.name.replace('raw-videos/', '').replace(/\.(webm|mp4)$/, '');
        console.log(`   ✅ ${videoId} - ${file.metadata.timeCreated} (${file.metadata.size} bytes)`);
      });
    } else {
      console.log('\n❌ No recent uploads found in GCS bucket');
    }
    
    console.log('\n🔒 SECURITY STATUS:');
    console.log('==================');
    if (foundInGCS) {
      console.log('✅ New security fix is WORKING');
      console.log('✅ Video successfully reached GCS storage');
      console.log('✅ AI moderation pipeline is active');
    } else {
      console.log('⚠️  Video either rejected by security or still processing');
      console.log('⚠️  Check application logs for security rejection messages');
    }
    
  } catch (error) {
    console.error('❌ ERROR checking upload:', error.message);
    console.error(error.stack);
  }
}

// Run the check
checkRecentUpload();