/**
 * DEBUG: Upload Disappearing Videos Analysis
 * 
 * This script analyzes why videos disappear during upload without showing processing cards.
 * It examines the complete upload flow from frontend to backend.
 */

import { db } from './server/db.ts.js';
import { videos, users } from './shared/schema.ts.js';
import { eq, desc, and, gte } from 'drizzle-orm';
import fs from 'fs/promises';
import * as path from "node:path";

async function debugUploadDisappearingVideos() {
  try {
    console.log('🔍 DEBUG: Analyzing upload disappearing videos issue...');
    
    // 1. Check the specific user who reported the issue
    const userEmail = 'nomostories@gmail.com';
    const user = await db.select().from(users)
      .where(eq(users.email, userEmail))
      .limit(1);
    
    if (user.length === 0) {
      console.log(`❌ User not found: ${userEmail}`);
      return;
    }
    
    const userId = user[0].id;
    console.log(`👤 USER FOUND: ${userId} (${user[0].firstName} ${user[0].lastName})`);
    
    // 2. Check all their video attempts in the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentVideos = await db.select().from(videos)
      .where(and(
        eq(videos.userId, userId),
        gte(videos.createdAt, twentyFourHoursAgo)
      ))
      .orderBy(desc(videos.createdAt));
    
    console.log(`📊 RECENT VIDEOS (24h): Found ${recentVideos.length} videos for ${userEmail}`);
    recentVideos.forEach(video => {
      console.log(`  - ${video.id}: "${video.title}" - ${video.processingStatus} (${video.createdAt})`);
      if (video.flaggedReason) {
        console.log(`    Reason: ${video.flaggedReason}`);
      }
    });
    
    // 3. Check temp files to see if uploads are making it to server
    console.log('\n🗂️ TEMP FILES: Checking current temp uploads...');
    const tempDir = './uploads/temp-uploads/';
    let tempFiles = [];
    let recentTempFiles = [];
    try {
      tempFiles = await fs.readdir(tempDir);
      console.log(`📁 Found ${tempFiles.length} temp files`);
      
      // Show recent temp files (last 2 hours)
      for (const file of tempFiles) {
        try {
          const filePath = path.join(tempDir, file);
          const stats = await fs.stat(filePath);
          const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
          if (stats.mtime > twoHoursAgo) {
            recentTempFiles.push({
              name: file,
              size: stats.size,
              modified: stats.mtime
            });
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }
      
      console.log(`📄 RECENT TEMP FILES (2h): Found ${recentTempFiles.length} files`);
      recentTempFiles.forEach(file => {
        console.log(`  - ${file.name} (${Math.round(file.size/1024/1024)}MB) - ${file.modified}`);
      });
      
    } catch (error) {
      console.log('❌ Could not read temp directory:', error.message);
    }
    
    // 4. Check for common upload failure patterns
    console.log('\n🔍 FAILURE PATTERNS: Analyzing common issues...');
    
    // All videos stuck in uploading status
    const stuckVideos = await db.select().from(videos)
      .where(eq(videos.processingStatus, 'uploading'))
      .orderBy(desc(videos.createdAt))
      .limit(10);
    
    console.log(`⏰ STUCK IN UPLOADING: Found ${stuckVideos.length} videos stuck in uploading status`);
    stuckVideos.forEach(video => {
      console.log(`  - ${video.id}: "${video.title}" by ${video.userId} (${video.createdAt})`);
    });
    
    // Videos that failed in last 24 hours
    const failedVideos = await db.select().from(videos)
      .where(and(
        eq(videos.processingStatus, 'failed'),
        gte(videos.createdAt, twentyFourHoursAgo)
      ))
      .orderBy(desc(videos.createdAt));
    
    console.log(`❌ FAILED VIDEOS (24h): Found ${failedVideos.length} failed videos`);
    failedVideos.forEach(video => {
      console.log(`  - ${video.id}: "${video.title}" by ${video.userId}`);
      console.log(`    Reason: ${video.flaggedReason}`);
    });
    
    // 5. Check videos in processing status (should be very few)
    const processingVideos = await db.select().from(videos)
      .where(eq(videos.processingStatus, 'processing'))
      .orderBy(desc(videos.createdAt));
    
    console.log(`🔄 PROCESSING VIDEOS: Found ${processingVideos.length} videos in processing status`);
    processingVideos.forEach(video => {
      console.log(`  - ${video.id}: "${video.title}" by ${video.userId} (${video.createdAt})`);
    });
    
    // 6. Summary and recommendations
    console.log('\n📋 SUMMARY & DIAGNOSIS:');
    console.log(`================================`);
    console.log(`User: ${userEmail} (${userId})`);
    console.log(`Recent videos (24h): ${recentVideos.length}`);
    console.log(`Recent temp files (2h): ${recentTempFiles.length}`);
    console.log(`Currently stuck in uploading: ${stuckVideos.length}`);
    console.log(`Failed in last 24h: ${failedVideos.length}`);
    console.log(`Currently processing: ${processingVideos.length}`);
    
    console.log('\n🎯 LIKELY CAUSES:');
    if (stuckVideos.length > 0) {
      console.log('1. ⚠️  Videos getting stuck in "uploading" status (temp file issues)');
    }
    if (failedVideos.length > 0) {
      console.log('2. ❌ Upload failures due to missing temp files');
    }
    if (processingVideos.length > 0) {
      console.log('3. 🔄 Videos stuck in AI moderation pipeline');
    }
    if (recentTempFiles.length === 0 && recentVideos.length > 0) {
      console.log('4. 🗂️ Temp files being cleaned up too early');
    }
    
    console.log('\n✅ RECOMMENDATIONS:');
    console.log('1. Run fix_stuck_uploading_videos.js to clean up stuck videos');
    console.log('2. Monitor chunked upload completion logs for errors');
    console.log('3. Check if frontend is properly completing chunked uploads');
    console.log('4. Verify temp file cleanup timing doesn\'t interfere with processing');
    
  } catch (error) {
    console.error('❌ DEBUG: Error analyzing upload issues:', error);
  }
}

// Run the debug
debugUploadDisappearingVideos().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});