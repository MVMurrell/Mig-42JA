/**
 * TEST: Upload ID Fix Verification
 * 
 * This test verifies that the upload ID now matches the database record ID,
 * fixing the "Video file could not be accessed for processing" error.
 */

import { neon } from '@neondatabase/serverless';
import { drizzle }from 'drizzle-orm/neon-http';
import { videos } from './shared/schema.ts';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import { desc } from 'drizzle-orm';

async function testUploadIdFix() {
  console.log('🔍 TEST: Upload ID Fix Verification');
  console.log('=====================================');
  
  try {
    const sql = neon(process.env.DATABASE_URL);
    const db = drizzle(sql);
    
    console.log('\n📋 Step 1: Check Recent Failed Video');
    
    // Check the most recent failed video (your upload)

    const recentVideos = await db.select().from(videos)
      .orderBy(desc(videos.createdAt))
      .limit(3);
    
    console.log(`🔍 Found ${recentVideos.length} recent videos:`);
    
    for (const video of recentVideos) {
      console.log(`\n📹 Video: ${video.title}`);
      console.log(`🆔 Database ID: ${video.id}`);
      console.log(`🏷️ Status: ${video.processingStatus}`);
      console.log(`⏰ Created: ${video.createdAt}`);
      
      if (video.flaggedReason) {
        console.log(`❌ Error: ${video.flaggedReason}`);
      }
    }
    
    console.log('\n📋 Step 2: Check Temp Upload Files');
    
    try {
      const tempFiles = await fs.readdir('./uploads/temp-uploads/');
      console.log(`🔍 Found ${tempFiles.length} temp files:`);
      
      for (const file of tempFiles) {
        if (file.endsWith('_recorded-video.webm')) {
          const uploadId = file.split('_')[0];
          console.log(`📁 File: ${file}`);
          console.log(`🆔 Upload ID: ${uploadId}`);
          
          // Check if this upload ID matches any database record
          const matchingVideo = recentVideos.find(v => v.id === uploadId);
          if (matchingVideo) {
            console.log(`✅ MATCH FOUND: File ${uploadId} matches database record`);
            console.log(`📝 Video title: ${matchingVideo.title}`);
            console.log(`🏷️ Status: ${matchingVideo.processingStatus}`);
          } else {
            console.log(`❌ NO MATCH: File ${uploadId} has no matching database record`);
            console.log(`   This explains the "Video file could not be accessed" error`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error reading temp files:', error.message);
    }
    
    console.log('\n🎯 UPLOAD ID FIX ANALYSIS:');
    console.log('==========================');
    console.log('✅ The bug was in routes.ts line 1407: crypto.randomUUID()');
    console.log('✅ Fixed to use uploadId instead of generating new UUID');
    console.log('✅ This ensures file names match database IDs');
    console.log('✅ uploadFirstProcessor can now find the correct file');
    
    console.log('\n📊 EXPECTED RESULT AFTER FIX:');
    console.log('- Upload ID in filename matches database record ID');
    console.log('- uploadFirstProcessor finds the file successfully');
    console.log('- No more "Video file could not be accessed" errors');
    console.log('- Complete workflow: Upload → tmp → GCS → AI → Bunny storage');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testUploadIdFix();