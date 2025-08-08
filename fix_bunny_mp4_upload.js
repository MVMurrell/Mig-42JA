/**
 * FIX: Proper MP4 upload to Bunny with correct file reading
 */

import fs from 'fs';
import fetch from 'node-fetch';
import { db } from './server/db.js.js';
import { videos } from './shared/schema.js.js';
import { eq } from 'drizzle-orm';

async function fixBunnyMP4Upload() {
  const videoId = 'a4b42e31-9018-44c1-bc46-c2e1cb6b4b96';
  const tempPath = './uploads/temp-uploads/a4b42e31-9018-44c1-bc46-c2e1cb6b4b96_XNXX_video_second_take_360p.mp4';
  
  const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
  const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID || '450591';
  
  console.log('🎯 Fixing MP4 upload to Bunny with proper file reading...');
  
  try {
    if (!fs.existsSync(tempPath)) {
      console.log('❌ Temp file not found');
      return;
    }
    
    const fileStats = fs.statSync(tempPath);
    console.log(`✅ File found: ${fileStats.size} bytes`);
    
    // Read the entire file as buffer
    const videoBuffer = fs.readFileSync(tempPath);
    console.log(`✅ File read into buffer: ${videoBuffer.length} bytes`);
    
    // Step 1: Create video record in Bunny
    console.log('📤 Creating video record in Bunny...');
    const createResponse = await fetch(`https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`, {
      method: 'POST',
      headers: {
        'AccessKey': BUNNY_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Testing'
      })
    });
    
    const createResult = await createResponse.json();
    console.log('📤 Bunny video created:', createResult.guid);
    
    // Step 2: Upload video file
    console.log('📤 Uploading video file to Bunny...');
    const uploadResponse = await fetch(`https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${createResult.guid}`, {
      method: 'PUT',
      headers: {
        'AccessKey': BUNNY_API_KEY,
        'Content-Type': 'video/mp4'
      },
      body: videoBuffer
    });
    
    const uploadResult = await uploadResponse.json();
    console.log('✅ Upload response:', uploadResult);
    
    if (uploadResponse.ok) {
      // Update database with correct Bunny video ID
      await db
        .update(videos)
        .set({
          bunnyVideoId: createResult.guid,
          videoUrl: `/api/videos/bunny-proxy/${createResult.guid}`,
          isActive: true
        })
        .where(eq(videos.id, videoId));
      
      console.log('✅ Database updated with new Bunny video ID');
      console.log(`📱 Video should now stream properly: ${createResult.guid}`);
      
    } else {
      console.log('❌ Upload failed:', uploadResponse.status, uploadResult);
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

fixBunnyMP4Upload().catch(console.error);