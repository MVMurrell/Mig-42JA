/**
 * FIX STUCK UPLOADING VIDEOS
 * 
 * This script fixes videos stuck in "uploading" status by manually
 * processing them through the AI moderation pipeline.
 */

import { db } from './server/db.ts.js';
import { videos } from './shared/schema.ts.js';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import * as path from "node:path";

async function fixStuckUploadingVideos() {
  try {
    console.log('🔍 STUCK VIDEOS: Finding videos stuck in uploading status...');
    
    // Find videos stuck in uploading status
    const stuckVideos = await db.select().from(videos)
      .where(eq(videos.processingStatus, 'uploading'))
      .orderBy(videos.createdAt);
    
    console.log(`📊 STUCK VIDEOS: Found ${stuckVideos.length} stuck videos:`, 
      stuckVideos.map(v => ({ id: v.id, title: v.title, created: v.createdAt })));
    
    if (stuckVideos.length === 0) {
      console.log('✅ STUCK VIDEOS: No stuck videos found!');
      return;
    }
    
    // Check for temp files
    const tempDir = './uploads/temp-uploads/';
    let tempFiles = [];
    try {
      tempFiles = await fs.readdir(tempDir);
      console.log(`📁 TEMP FILES: Found ${tempFiles.length} temp files:`, tempFiles.slice(0, 5));
    } catch (error) {
      console.log('📁 TEMP FILES: No temp directory or files found');
    }
    
    for (const video of stuckVideos) {
      console.log(`\n🔧 PROCESSING: Video ${video.id} - "${video.title}"`);
      
      // Look for temp file for this video
      const possibleTempFiles = tempFiles.filter(file => 
        file.includes(video.id) || file.includes(video.title.replace(/[^a-zA-Z0-9]/g, ''))
      );
      
      console.log(`📂 TEMP FILES: Possible files for ${video.id}:`, possibleTempFiles);
      
      if (possibleTempFiles.length === 0) {
        console.log(`❌ MISSING FILE: No temp file found for ${video.id}, marking as failed`);
        
        // Update status to failed
        await db.update(videos)
          .set({ 
            processingStatus: 'failed',
            flaggedReason: 'Upload file missing - please try uploading again'
          })
          .where(eq(videos.id, video.id));
        
        console.log(`✅ UPDATED: Video ${video.id} marked as failed`);
        continue;
      }
      
      // Try to process the video through AI moderation
      const tempFilePath = path.join(tempDir, possibleTempFiles[0]);
      console.log(`🚀 PROCESSING: Processing ${video.id} with file ${tempFilePath}`);
      
      try {
        // Check if file exists
        const fileStats = await fs.stat(tempFilePath);
        console.log(`📄 FILE INFO: ${tempFilePath} - ${fileStats.size} bytes`);
        
        // Import and use the processor
        const { uploadFirstProcessor } = await import('./server/uploadFirstProcessor.js');
        
        const metadata = {
          title: video.title,
          description: video.description || '',
          category: video.category,
          latitude: video.latitude,
          longitude: video.longitude,
          visibility: video.visibility,
          groupId: video.groupId,
          questId: video.questId,
          userId: video.userId,
          duration: parseFloat(video.duration || '0')
        };
        
        console.log(`🔄 PROCESSING: Starting AI moderation for ${video.id}`);
        const success = await uploadFirstProcessor.processVideo(video.id, tempFilePath, metadata, true);
        
        if (success) {
          console.log(`✅ SUCCESS: Video ${video.id} processed successfully`);
        } else {
          console.log(`❌ REJECTED: Video ${video.id} rejected by AI moderation`);
        }
        
      } catch (fileError) {
        console.error(`❌ FILE ERROR: Could not process ${video.id}:`, fileError.message);
        
        // Update status to failed
        await db.update(videos)
          .set({ 
            processingStatus: 'failed',
            flaggedReason: 'File processing error - please try uploading again'
          })
          .where(eq(videos.id, video.id));
      }
    }
    
    console.log('\n✅ STUCK VIDEOS: Processing complete!');
    
  } catch (error) {
    console.error('❌ STUCK VIDEOS: Error processing stuck videos:', error);
  }
}

// Run the fix
fixStuckUploadingVideos().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});