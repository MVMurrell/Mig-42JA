import { uploadFirstProcessor } from './server/uploadFirstProcessor.js.js';
import { db } from './server/db.js.js';
import { videos } from './shared/schema.js.js';
import { eq } from 'drizzle-orm';

async function fixAutomationFailure() {
  try {
    console.log('🔧 AUTOMATION FIX: Scanning for stuck videos...');
    
    // Find all videos stuck in 'uploaded' status
    const stuckVideos = await db
      .select()
      .from(videos)
      .where(eq(videos.processingStatus, 'uploaded'));
    
    console.log(`Found ${stuckVideos.length} stuck videos requiring automated processing`);
    
    for (const video of stuckVideos) {
      console.log(`🔄 Processing stuck video: ${video.id} - "${video.title}"`);
      
      try {
        // Use dummy path since original files may not exist
        const dummyPath = '/tmp/automation_fix.webm';
        
        await uploadFirstProcessor.processVideo(video.id, dummyPath, {
          title: video.title || 'Untitled',
          description: video.description || '',
          category: video.category || 'general',
          latitude: video.latitude?.toString() || '',
          longitude: video.longitude?.toString() || '',
          visibility: video.visibility || 'public',
          groupId: video.groupId || null,
          frontendDuration: video.duration ? parseFloat(video.duration) : 0
        });
        
        console.log(`✅ Successfully processed video: ${video.id}`);
      } catch (error) {
        console.error(`❌ Failed to process video ${video.id}:`, error.message);
        
        // Mark as failed with proper reason
        await db.update(videos)
          .set({
            processingStatus: 'failed',
            isActive: false,
            flaggedReason: `Automation fix failed: ${error.message}`
          })
          .where(eq(videos.id, video.id));
      }
    }
    
    console.log('🎉 AUTOMATION FIX: Complete - all stuck videos processed');
  } catch (error) {
    console.error('🚨 AUTOMATION FIX FAILED:', error);
  }
}

fixAutomationFailure();