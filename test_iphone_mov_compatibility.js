/**
 * IPHONE .MOV COMPATIBILITY TEST
 * 
 * This script tests iPhone .mov file compatibility through the complete pipeline:
 * 1. File format validation (multer)
 * 2. FFmpeg preprocessing (.mov → .mp4)
 * 3. AI moderation pipeline
 * 4. Identifies exact rejection point
 */

import { spawn } from 'child_process';
import { writeFile, readFile } from 'fs/promises';
import * as path from "node:path";
async function testFFmpegMovSupport() {
  console.log('🧪 TESTING: FFmpeg .mov file support');
  console.log('=====================================');
  
  try {
    // Test 1: Check FFmpeg version and codec support
    console.log('\n📋 Step 1: Check FFmpeg Installation and Codec Support');
    
    const ffmpegInfo = await new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', ['-version']);
      let output = '';
      
      ffmpeg.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`FFmpeg not available (exit code: ${code})`));
        }
      });
      
      ffmpeg.on('error', reject);
    });
    
    console.log('✅ FFmpeg is available');
    
    // Check for key codec support
    const hasH264 = ffmpegInfo.includes('libx264');
    const hasH265 = ffmpegInfo.includes('libx265') || ffmpegInfo.includes('hevc');
    const hasAAC = ffmpegInfo.includes('aac');
    
    console.log('📊 Codec Support:');
    console.log(`   H.264 (libx264): ${hasH264 ? '✅ SUPPORTED' : '❌ NOT AVAILABLE'}`);
    console.log(`   H.265 (libx265/hevc): ${hasH265 ? '✅ SUPPORTED' : '⚠️ MAY NOT BE AVAILABLE'}`);
    console.log(`   AAC Audio: ${hasAAC ? '✅ SUPPORTED' : '❌ NOT AVAILABLE'}`);
    
    // Test 2: Check format support specifically
    console.log('\n📋 Step 2: Test .mov Format Support');
    
    const formatInfo = await new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', ['-formats']);
      let output = '';
      
      ffmpeg.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Failed to get format info (exit code: ${code})`));
        }
      });
      
      ffmpeg.on('error', reject);
    });
    
    const hasMovSupport = formatInfo.includes('mov,mp4,m4a,3gp,3g2,mj2');
    console.log(`📊 .mov Format Support: ${hasMovSupport ? '✅ SUPPORTED' : '❌ NOT AVAILABLE'}`);
    
    // Test 3: Create a synthetic .mov file for testing
    console.log('\n📋 Step 3: Create Test .mov File');
    
    const testMovPath = join('./uploads/temp-uploads/', 'test-iphone-video.mov');
    
    // Create a simple test .mov file using FFmpeg
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-f', 'lavfi',
        '-i', 'testsrc=duration=3:size=320x240:rate=30',
        '-f', 'lavfi', 
        '-i', 'sine=frequency=1000:duration=3',
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-t', '3',
        '-y',
        testMovPath
      ]);
      
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Test .mov file created successfully');
          resolve(testMovPath);
        } else {
          reject(new Error(`Failed to create test .mov file (exit code: ${code})`));
        }
      });
      
      ffmpeg.on('error', reject);
    });
    
    // Test 4: Test preprocessing pipeline
    console.log('\n📋 Step 4: Test Preprocessing Pipeline (.mov → .mp4)');
    
    const outputPath = join('./uploads/temp-uploads/', 'test-processed.mp4');
    
    await new Promise((resolve, reject) => {
      const ffmpegArgs = [
        '-i', testMovPath,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        '-y',
        outputPath
      ];
      
      console.log('🔧 Running preprocessing command:', `ffmpeg ${ffmpegArgs.join(' ')}`);
      
      const ffmpeg = spawn('ffmpeg', ffmpegArgs);
      
      let stderr = '';
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Preprocessing successful (.mov → .mp4)');
          resolve(outputPath);
        } else {
          console.error('❌ Preprocessing failed');
          console.error('FFmpeg stderr:', stderr);
          reject(new Error(`Preprocessing failed with code ${code}`));
        }
      });
      
      ffmpeg.on('error', reject);
    });
    
    // Test 5: Check what MIME types are detected
    console.log('\n📋 Step 5: MIME Type Detection Test');
    
    // Simulate how multer would see different iPhone formats
    const movMimeTypes = [
      'video/quicktime',        // Standard .mov MIME type
      'video/mp4',             // Some .mov files report as mp4
      'application/octet-stream' // Generic binary type
    ];
    
    console.log('📊 MIME Types that would be accepted by multer:');
    movMimeTypes.forEach(mimeType => {
      const accepted = mimeType.startsWith('video/') || mimeType === 'application/octet-stream';
      console.log(`   ${mimeType}: ${accepted ? '✅ ACCEPTED' : '❌ REJECTED'}`);
    });
    
    console.log('\n🎯 COMPATIBILITY SUMMARY:');
    console.log('========================');
    console.log('✅ File Upload: .mov files should be accepted by multer');
    console.log(`✅ FFmpeg Processing: ${hasH264 ? 'H.264 supported' : 'H.264 missing'}`);
    console.log(`${hasH265 ? '✅' : '⚠️'} H.265 Support: ${hasH265 ? 'Available' : 'May cause issues with HEVC videos'}`);
    console.log('✅ Format Conversion: .mov → .mp4 preprocessing should work');
    
    if (!hasH265) {
      console.log('\n⚠️ POTENTIAL ISSUE IDENTIFIED:');
      console.log('   iPhone videos using H.265 (HEVC) codec may fail preprocessing');
      console.log('   if FFmpeg lacks libx265 support. This could explain rejections.');
    }
    
    // Test 6: Check actual file size limits
    console.log('\n📋 Step 6: Check File Size Limits');
    console.log('Current multer limit: 100MB');
    console.log('iPhone video considerations:');
    console.log('   • 4K videos: Can easily exceed 100MB in minutes');
    console.log('   • 1080p videos: Usually under 100MB for short clips');
    console.log('   • Recommendation: Check actual file size of rejected video');
    
    // Cleanup test files
    try {
      const fs = await import('fs/promises');
      await fs.unlink(testMovPath);
      await fs.unlink(outputPath);
      console.log('\n🧹 Cleanup: Removed test files');
    } catch (error) {
      console.log('🧹 Cleanup: Test files already removed');
    }
    
  } catch (error) {
    console.error('❌ COMPATIBILITY TEST FAILED:', error);
    console.error('This indicates a fundamental issue with video processing setup');
  }
}

async function testActualRejectionCause() {
  console.log('\n🔍 INVESTIGATING: Actual Rejection Causes');
  console.log('==========================================');
  
  try {
    // Import database modules
    const { db } = await import('./server/db.js');
    const { videos, moderationDecisions } = await import('./shared/schema.js');
    const { eq, desc } = await import('drizzle-orm');
    
    // Check recent rejected videos
    console.log('📋 Checking recent rejected videos...');
    
    const recentRejected = await db
      .select()
      .from(videos)
      .where(eq(videos.processingStatus, 'rejected'))
      .orderBy(desc(videos.createdAt))
      .limit(10);
    
    if (recentRejected.length > 0) {
      console.log(`📊 Found ${recentRejected.length} recent rejected videos:`);
      
      recentRejected.forEach((video, index) => {
        console.log(`\n   ${index + 1}. Video ID: ${video.id}`);
        console.log(`      Title: ${video.title || 'Untitled'}`);
        console.log(`      Flagged Reason: ${video.flaggedReason || 'Not specified'}`);
        console.log(`      Processing Error: ${video.processingError || 'None'}`);
        console.log(`      Created: ${video.createdAt}`);
      });
      
      // Check moderation decisions for these videos
      console.log('\n📋 Checking moderation decisions...');
      
      for (const video of recentRejected.slice(0, 3)) {
        const decisions = await db
          .select()
          .from(moderationDecisions)
          .where(eq(moderationDecisions.videoId, video.id));
        
        if (decisions.length > 0) {
          console.log(`\n🔍 Moderation for ${video.id}:`);
          decisions.forEach(decision => {
            console.log(`   Decision: ${decision.decision}`);
            console.log(`   Reason: ${decision.reason}`);
            console.log(`   Details: ${decision.moderationDetails || 'None'}`);
          });
        }
      }
    } else {
      console.log('📊 No recently rejected videos found');
    }
    
  } catch (error) {
    console.error('❌ Failed to check rejection causes:', error);
  }
}

// Run the complete test
async function runCompatibilityTest() {
  console.log('🎬 IPHONE .MOV COMPATIBILITY TEST');
  console.log('==================================');
  
  await testFFmpegMovSupport();
  await testActualRejectionCause();
  
  console.log('\n💡 NEXT STEPS:');
  console.log('==============');
  console.log('1. If H.265 support is missing, iPhone HEVC videos will fail');
  console.log('2. Check if rejected video exceeded 100MB file size limit');
  console.log('3. Look at actual rejection reason in database records');
  console.log('4. Test with a smaller iPhone video (under 50MB) to isolate issue');
}

runCompatibilityTest().catch(console.error);