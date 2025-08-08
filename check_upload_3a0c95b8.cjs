/**
 * CHECK: Upload 3a0c95b8-7614-40cb-bd2e-8fb9652c3550 Status
 * 
 * Verify if the video made it to GCS storage and check processing status
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import fs from "fs";
import * as path from "node:path";
import {eq} from "drizzle-orm";

// Import schema directly with SQL queries
const videos = {
  id: 'id',
  title: 'title',
  processingStatus: 'processing_status',
  videoUrl: 'video_url',
  gcsProcessingUrl: 'gcs_processing_url',
  bunnyVideoId: 'bunny_video_id',
  moderationResults: 'moderation_results',
  createdAt: 'created_at'
};

async function checkUploadStatus() {
  try {
    console.log('🔍 CHECK: Upload 3a0c95b8-7614-40cb-bd2e-8fb9652c3550 Status');
    console.log('=====================================================');

    // Connect to database
    const sql = neon(process.env.DATABASE_URL);
    const db = drizzle(sql);
    
    const uploadId = '3a0c95b8-7614-40cb-bd2e-8fb9652c3550';
    
    console.log('\n📋 Step 1: Check Database Record');
    // const { eq } = require('drizzle-orm');
    const videoRecord = await db.select().from(videos)
      .where(eq(videos.id, uploadId))
      .limit(1);
    
    if (videoRecord.length === 0) {
      console.log('❌ NO DATABASE RECORD FOUND for upload ID:', uploadId);
      console.log('   This indicates the upload ID fix may not be working');
      return;
    }
    
    const video = videoRecord[0];
    console.log('✅ Database record found:');
    console.log('   🆔 ID:', video.id);
    console.log('   📹 Title:', video.title);
    console.log('   🏷️ Processing Status:', video.processingStatus);
    console.log('   🔗 Video URL:', video.videoUrl);
    console.log('   🌐 GCS Processing URL:', video.gcsProcessingUrl);
    console.log('   🐰 Bunny Video ID:', video.bunnyVideoId);
    console.log('   ⏰ Created:', video.createdAt);
    
    console.log('\n📋 Step 2: Check Temp File');
    const tempDir = './uploads/temp-uploads';
    const expectedFilename = `${uploadId}_recorded-video.webm`;
    const tempFilePath = path.join(tempDir, expectedFilename);
    
    if (fs.existsSync(tempFilePath)) {
      const stats = fs.statSync(tempFilePath);
      console.log('✅ Temp file exists:');
      console.log('   📁 Path:', tempFilePath);
      console.log('   📊 Size:', stats.size, 'bytes');
      console.log('   ⏰ Created:', stats.birthtime);
    } else {
      console.log('❌ Temp file NOT FOUND:', tempFilePath);
      console.log('   This means the uploadFirstProcessor may have processed it');
    }
    
    console.log('\n📋 Step 3: Analysis');
    
    if (video.gcsProcessingUrl) {
      console.log('✅ GCS Processing URL exists - video made it to GCS storage');
      console.log('   🌐 GCS URL:', video.gcsProcessingUrl);
    } else {
      console.log('❌ NO GCS Processing URL - video did NOT make it to GCS storage');
      console.log('   This indicates the uploadFirstProcessor failed to upload to GCS');
    }
    
    if (video.bunnyVideoId) {
      console.log('✅ Bunny Video ID exists - video made it to Bunny storage');
      console.log('   🐰 Bunny ID:', video.bunnyVideoId);
    } else {
      console.log('❌ NO Bunny Video ID - video did NOT make it to Bunny storage');
    }
    
    console.log('\n🎯 WORKFLOW STATUS:');
    console.log('Upload → Temp:', fs.existsSync(tempFilePath) ? '✅' : '⚠️ (processed)');
    console.log('Temp → GCS:', video.gcsProcessingUrl ? '✅' : '❌');
    console.log('GCS → AI Moderation:', video.moderationResults ? '✅' : '❌');
    console.log('AI → Bunny Storage:', video.bunnyVideoId ? '✅' : '❌');
    
    if (video.processingStatus === 'processing' && !video.gcsProcessingUrl) {
      console.log('\n🚨 ISSUE IDENTIFIED:');
      console.log('   Video is stuck in processing status without GCS upload');
      console.log('   The uploadFirstProcessor may have failed silently');
      console.log('   Need to check uploadFirstProcessor logs for errors');
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkUploadStatus();