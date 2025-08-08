/**
 * CREATE NYC DUMMY VIDEOS
 * 
 * This script creates dummy videos in New York City area for testing
 * the lantern feature functionality.
 */

import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle }  from "drizzle-orm/neon-serverless";
import { sql }  from "drizzle-orm";
import ws from "ws";
import { randomUUID } from "crypto";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

async function createNYCDummyVideos() {
  try {
    console.log('🗽 NYC DUMMY VIDEOS: Creating test videos in New York City...');

    // Define NYC area coordinates
    const nycVideos = [
      {
        id: randomUUID(),
        title: 'Times Square Vibes',
        description: 'Checking out the bustling energy of Times Square',
        category: 'travel',
        user_id: 'google-oauth2|117032826996185616207',
        processing_status: 'approved',
        is_active: true,
        latitude: '40.7580',
        longitude: '-73.9855',
        thumbnail_url: 'https://storage.googleapis.com/jemzy-videos-storage/thumbnails/dummy-nyc-1.jpg',
        bunny_video_id: 'dummy-nyc-1',
        video_url: 'https://video.bunnycdn.com/dummy-nyc-1.mp4',
        transcription_text: 'times square new york city energy bustling',
        views: 45,
        likes: 12
      },
      {
        id: randomUUID(),
        title: 'Central Park Beauty',
        description: 'Beautiful day in Central Park',
        category: 'nature',
        user_id: 'google-oauth2|117032826996185616207',
        processing_status: 'approved',
        is_active: true,
        latitude: '40.7812',
        longitude: '-73.9665',
        thumbnail_url: 'https://storage.googleapis.com/jemzy-videos-storage/thumbnails/dummy-nyc-2.jpg',
        bunny_video_id: 'dummy-nyc-2',
        video_url: 'https://video.bunnycdn.com/dummy-nyc-2.mp4',
        transcription_text: 'central park nature beautiful trees walking',
        views: 78,
        likes: 23
      },
      {
        id: randomUUID(),
        title: 'Brooklyn Bridge Walk',
        description: 'Walking across the iconic Brooklyn Bridge',
        category: 'travel',
        user_id: 'google-oauth2|117032826996185616207',
        processing_status: 'approved',
        is_active: true,
        latitude: '40.7061',
        longitude: '-73.9969',
        thumbnail_url: 'https://storage.googleapis.com/jemzy-videos-storage/thumbnails/dummy-nyc-3.jpg',
        bunny_video_id: 'dummy-nyc-3',
        video_url: 'https://video.bunnycdn.com/dummy-nyc-3.mp4',
        transcription_text: 'brooklyn bridge walking manhattan skyline',
        views: 92,
        likes: 34
      },
      {
        id: randomUUID(),
        title: 'NYC Street Food',
        description: 'Amazing food truck in Manhattan',
        category: 'food',
        user_id: 'google-oauth2|117032826996185616207',
        processing_status: 'approved',
        is_active: true,
        latitude: '40.7505',
        longitude: '-73.9934',
        thumbnail_url: 'https://storage.googleapis.com/jemzy-videos-storage/thumbnails/dummy-nyc-4.jpg',
        bunny_video_id: 'dummy-nyc-4',
        video_url: 'https://video.bunnycdn.com/dummy-nyc-4.mp4',
        transcription_text: 'street food truck manhattan delicious lunch',
        views: 67,
        likes: 18
      },
      {
        id: randomUUID(),
        title: 'Empire State View',
        description: 'Amazing view from Empire State Building',
        category: 'travel',
        user_id: 'google-oauth2|117032826996185616207',
        processing_status: 'approved',
        is_active: true,
        latitude: '40.7484',
        longitude: '-73.9857',
        thumbnail_url: 'https://storage.googleapis.com/jemzy-videos-storage/thumbnails/dummy-nyc-5.jpg',
        bunny_video_id: 'dummy-nyc-5',
        video_url: 'https://video.bunnycdn.com/dummy-nyc-5.mp4',
        transcription_text: 'empire state building view skyline amazing',
        views: 156,
        likes: 45
      },
      {
        id: randomUUID(),
        title: 'Statue of Liberty',
        description: 'Visit to Lady Liberty',
        category: 'travel',
        user_id: 'google-oauth2|117032826996185616207',
        processing_status: 'approved',
        is_active: true,
        latitude: '40.6892',
        longitude: '-74.0445',
        thumbnail_url: 'https://storage.googleapis.com/jemzy-videos-storage/thumbnails/dummy-nyc-6.jpg',
        bunny_video_id: 'dummy-nyc-6',
        video_url: 'https://video.bunnycdn.com/dummy-nyc-6.mp4',
        transcription_text: 'statue of liberty ferry island tourism',
        views: 134,
        likes: 41
      }
    ];

    console.log('🗽 NYC DUMMY VIDEOS: Inserting videos into database...');
    
    for (const video of nycVideos) {
      await pool.query(`
        INSERT INTO videos (
          id, title, description, category, user_id, processing_status,
          is_active, latitude, longitude, thumbnail_url, bunny_video_id,
          video_url, transcription_text, views, likes, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW()
        )
      `, [
        video.id, video.title, video.description, video.category, video.user_id,
        video.processing_status, video.is_active, video.latitude, video.longitude,
        video.thumbnail_url, video.bunny_video_id, video.video_url, video.transcription_text,
        video.views, video.likes
      ]);
      
      console.log(`✅ Created: ${video.title} at (${video.latitude}, ${video.longitude})`);
    }

    console.log('🗽 NYC DUMMY VIDEOS: Successfully created 6 dummy videos in NYC!');
    console.log('📍 Locations include:');
    console.log('   - Times Square (40.7580, -73.9855)');
    console.log('   - Central Park (40.7812, -73.9665)');
    console.log('   - Brooklyn Bridge (40.7061, -73.9969)');
    console.log('   - Manhattan Food Truck (40.7505, -73.9934)');
    console.log('   - Empire State Building (40.7484, -73.9857)');
    console.log('   - Statue of Liberty (40.6892, -74.0445)');
    console.log('');
    console.log('🏮 You can now test the lantern feature by:');
    console.log('   1. Navigate to NYC on the map');
    console.log('   2. Tap the lantern button to place a lantern');
    console.log('   3. Videos within 500 meters will start playing in group mode');

  } catch (error) {
    console.error('❌ Error creating NYC dummy videos:', error);
  } finally {
    await pool.end();
  }
}

createNYCDummyVideos();