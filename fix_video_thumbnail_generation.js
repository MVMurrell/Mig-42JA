/**
 * FIX: Generate thumbnail for the uploaded MP4 video
 * 
 * This script fetches video metadata from Bunny API and updates the database
 * with the proper thumbnail URL for the "Testing" video.
 */

import fetch from 'node-fetch';
import { db } from './server/db.js.js';
import { videos } from './shared/schema.js.js';
import { eq } from 'drizzle-orm';

async function fixVideoThumbnailGeneration() {
  const videoId = 'a4b42e31-9018-44c1-bc46-c2e1cb6b4b96';
  const bunnyVideoId = '5fcabf58-2eec-4392-a493-03d74bcf9b6b';
  
  const BUNNY_API_KEY = process.env.BUNNY_API_KEY;
  const BUNNY_LIBRARY_ID = process.env.BUNNY_LIBRARY_ID || '450591';
  
  console.log('🎯 Fixing thumbnail generation for Testing video...');
  
  try {
    // Fetch video metadata from Bunny API to get thumbnail info
    console.log('📤 Fetching video metadata from Bunny...');
    const response = await fetch(`https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${bunnyVideoId}`, {
      method: 'GET',
      headers: {
        'AccessKey': BUNNY_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.log('❌ Failed to fetch video metadata:', response.status);
      return;
    }
    
    const videoMetadata = await response.json();
    console.log('✅ Video metadata:', {
      guid: videoMetadata.guid,
      status: videoMetadata.status,
      thumbnailCount: videoMetadata.thumbnailCount,
      thumbnailFileName: videoMetadata.thumbnailFileName,
      views: videoMetadata.views,
      length: videoMetadata.length,
      title: videoMetadata.title
    });
    
    // Generate thumbnail URL based on Bunny CDN pattern
    const thumbnailUrl = `https://vz-7c674c55-8ff.b-cdn.net/${bunnyVideoId}/thumbnail.jpg`;
    
    console.log('🖼️ Thumbnail URL:', thumbnailUrl);
    
    // Test if thumbnail exists
    const thumbnailResponse = await fetch(thumbnailUrl, { method: 'HEAD' });
    console.log('🖼️ Thumbnail exists:', thumbnailResponse.ok);
    
    // Update video record with thumbnail URL and duration (as number in seconds)
    const durationInSeconds = videoMetadata.length || null;
    
    await db
      .update(videos)
      .set({
        thumbnailUrl: thumbnailUrl,
        duration: durationInSeconds,
        views: videoMetadata.views || 0
      })
      .where(eq(videos.id, videoId));
    
    console.log('✅ Database updated with thumbnail and metadata');
    console.log('📱 Your "Testing" video should now have a proper thumbnail in the profile!');
    
    // Force thumbnail generation if needed
    if (videoMetadata.thumbnailCount === 0) {
      console.log('🔄 Triggering thumbnail generation...');
      
      const thumbnailGenResponse = await fetch(`https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos/${bunnyVideoId}/thumbnail`, {
        method: 'POST',
        headers: {
          'AccessKey': BUNNY_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          time: 3.0 // Generate thumbnail at 3 seconds
        })
      });
      
      if (thumbnailGenResponse.ok) {
        console.log('✅ Thumbnail generation triggered');
      } else {
        console.log('❌ Thumbnail generation failed:', thumbnailGenResponse.status);
      }
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

fixVideoThumbnailGeneration().catch(console.error);