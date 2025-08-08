/**
 * MANUAL TRIGGER: Pending AI Processor for stuck video
 */

import { db } from './server/db.js.js';
import { videos } from './shared/schema.js.js';
import { eq } from 'drizzle-orm';
import { uploadFirstProcessor } from './server/uploadFirstProcessor.js.js';
import fs from 'fs';

async function triggerPendingProcessor() {
  console.log('🔍 Searching for videos stuck in pending_ai_analysis...');
  
  try {
    // Find videos stuck in pending analysis
    const stuckVideos = await db
      .select()
      .from(videos)
      .where(eq(videos.processingStatus, 'pending_ai_analysis'));
    
    console.log(`📊 Found ${stuckVideos.length} videos stuck in pending_ai_analysis`);
    
    for (const video of stuckVideos) {
      console.log(`\n🎯 Processing stuck video: ${video.id} - "${video.title}"`);
      
      // Check if temp file exists
      const tempPath = `./uploads/temp-uploads/${video.id}_XNXX_video_second_take_360p.mp4`;
      
      if (fs.existsSync(tempPath)) {
        console.log(`✅ Temp file found: ${tempPath}`);
        
        // Reconstruct metadata
        const metadata = {
          title: video.title || 'Untitled',
          description: video.description || '',
          category: video.category || 'chat',
          latitude: video.latitude || 0,
          longitude: video.longitude || 0,
          visibility: video.visibility || 'everyone',
          groupId: video.group_id || null,
          frontendDuration: video.duration || 25.0
        };
        
        console.log('🚀 Triggering uploadFirstProcessor...');
        
        const success = await uploadFirstProcessor.processVideo(
          video.id,
          tempPath,
          metadata,
          false // Already preprocessed
        );
        
        if (success) {
          console.log(`✅ SUCCESS: Video ${video.id} processed successfully!`);
        } else {
          console.log(`❌ FAILED: Video ${video.id} processing failed`);
        }
        
      } else {
        console.log(`❌ Temp file not found: ${tempPath}`);
      }
    }
    
  } catch (error) {
    console.error('❌ ERROR in pending processor:', error.message);
  }
}

triggerPendingProcessor().catch(console.error);