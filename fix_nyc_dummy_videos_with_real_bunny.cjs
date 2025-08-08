/**
 * FIX NYC DUMMY VIDEOS WITH REAL BUNNY STORAGE
 * 
 * This script replaces the dummy NYC videos with ones that use real
 * Bunny video IDs so the lantern feature can actually play videos.
 */

import { neonConfig, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import ws from "ws";
import { randomUUID } from  'crypto';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

async function fixNYCDummyVideos() {
  try {
    console.log('🔧 FIXING NYC DUMMY VIDEOS: Updating to use real Bunny storage...');

    // First, delete all existing dummy videos
    await db.execute(`
      DELETE FROM videos 
      WHERE bunny_video_id LIKE 'dummy-nyc-%' 
      OR title IN ('Times Square Vibes', 'Central Park Beauty', 'Brooklyn Bridge Walk', 'NYC Street Food', 'Empire State View', 'Statue of Liberty')
    `);
    console.log('🗑️ Deleted existing dummy videos');

    // Get the real video that exists in Bunny storage
    const realVideos = await db.execute(`
      SELECT bunny_video_id, video_url, thumbnail_url 
      FROM videos 
      WHERE bunny_video_id IS NOT NULL 
      AND bunny_video_id NOT LIKE 'dummy-%'
      AND processing_status = 'approved'
      LIMIT 1
    `);

    if (realVideos.rows.length === 0) {
      console.error('❌ No real videos found in Bunny storage');
      return;
    }

    const realVideo = realVideos.rows[0];
    console.log('✅ Found real video:', realVideo.bunny_video_id);

    // Create new NYC dummy videos using the real Bunny video ID
    const nycVideosData = [
      {
        title: 'Manhattan Cafe',
        description: 'Cozy coffee shop in Manhattan',
        category: 'services',
        latitude: '40.7061',  // Brooklyn Bridge area (where lantern detected videos)
        longitude: '-73.9969',
        bunny_video_id: realVideo.bunny_video_id,
        video_url: realVideo.video_url,
        thumbnail_url: realVideo.thumbnail_url
      },
      {
        title: 'Brooklyn Bridge Walk',
        description: 'Walking across the iconic Brooklyn Bridge',
        category: 'travel',
        latitude: '40.7061',  // Same area for lantern detection
        longitude: '-73.9969',
        bunny_video_id: realVideo.bunny_video_id,
        video_url: realVideo.video_url,
        thumbnail_url: realVideo.thumbnail_url
      },
      {
        title: 'NYC Street Food',
        description: 'Amazing street food in the city',
        category: 'food',
        latitude: '40.7505',  // Times Square area
        longitude: '-73.9934',
        bunny_video_id: realVideo.bunny_video_id,
        video_url: realVideo.video_url,
        thumbnail_url: realVideo.thumbnail_url
      }
    ];

    // Insert the new videos with real Bunny URLs
    for (const videoData of nycVideosData) {
      const videoId = randomUUID();
      
      await db.execute(`
        INSERT INTO videos (
          id, title, description, category, user_id, processing_status, is_active,
          latitude, longitude, bunny_video_id, video_url, thumbnail_url,
          transcription_text, views, likes, created_at, updated_at
        ) VALUES (
          '${videoId}',
          '${videoData.title}',
          '${videoData.description}',
          '${videoData.category}',
          'google-oauth2|117032826996185616207',
          'approved',
          true,
          '${videoData.latitude}',
          '${videoData.longitude}',
          '${videoData.bunny_video_id}',
          '${videoData.video_url}',
          '${videoData.thumbnail_url}',
          '${videoData.title.toLowerCase()} nyc new york',
          ${Math.floor(Math.random() * 100) + 10},
          ${Math.floor(Math.random() * 20) + 1},
          NOW(),
          NOW()
        )
      `);
      
      console.log(`✅ Created video: ${videoData.title} using real Bunny ID: ${videoData.bunny_video_id}`);
    }

    console.log('🎉 SUCCESS: All NYC dummy videos now use real Bunny storage!');
    console.log('🏮 Lantern should now be able to play actual videos');

  } catch (error) {
    console.error('❌ Error fixing NYC dummy videos:', error);
  } finally {
    await pool.end();
  }
}

// Run the fix
fixNYCDummyVideos();