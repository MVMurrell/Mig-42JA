/**
 * FIX: Upload MP4 video to Bunny storage
 * 
 * This fixes uploaded .mp4 files that completed AI moderation but failed Bunny upload
 */

import { bunnyService } from './server/bunnyService.js.js';
import { db } from './server/db.js.js';
import { videos } from './shared/schema.js.js';
import { eq } from 'drizzle-orm';
import fs from 'fs';

async function fixUploadedMP4Bunny() {
  const videoId = 'a4b42e31-9018-44c1-bc46-c2e1cb6b4b96';
  const tempPath = './uploads/temp-uploads/a4b42e31-9018-44c1-bc46-c2e1cb6b4b96_XNXX_video_second_take_360p.mp4';
  
  console.log('🎯 Fixing uploaded MP4 video for Bunny storage...');
  
  try {
    if (!fs.existsSync(tempPath)) {
      console.log('❌ Temp file not found, cannot upload to Bunny');
      return;
    }
    
    console.log('✅ Temp file found, uploading to Bunny...');
    
    // Upload directly to Bunny using the existing MP4 file
    const bunnyVideoId = await bunnyService.uploadVideo(tempPath, videoId);
    
    if (bunnyVideoId) {
      console.log(`✅ Bunny upload successful: ${bunnyVideoId}`);
      
      // Update database with Bunny video ID and video URL
      await db
        .update(videos)
        .set({
          bunnyVideoId: bunnyVideoId,
          videoUrl: `/api/videos/bunny-proxy/${bunnyVideoId}`,
          isActive: true
        })
        .where(eq(videos.id, videoId));
      
      console.log('✅ Database updated with Bunny video details');
      console.log('📱 Your "Testing" video should now be streamable in your profile!');
      
    } else {
      console.log('❌ Bunny upload failed');
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

fixUploadedMP4Bunny().catch(console.error);