/**
 * REAL-TIME UPLOAD MONITORING
 * 
 * This script monitors the upload process in real-time to ensure
 * videos properly reach GCS storage and complete AI moderation.
 */

import { db } from './server/db.ts.js';
import { videos } from './shared/schema.ts.js';
import { desc } from 'drizzle-orm';

let lastVideoCount = 0;
let monitoringActive = true;

async function monitorUploads() {
  console.log('🔍 UPLOAD MONITOR: Starting real-time upload monitoring...');
  console.log('📁 Watching for new videos to ensure GCS upload success');
  console.log('=' .repeat(60));

  while (monitoringActive) {
    try {
      // Get latest videos
      const allVideos = await db.select().from(videos)
        .orderBy(desc(videos.createdAt))
        .limit(5);

      // Check if new videos were added
      if (allVideos.length > lastVideoCount) {
        const newVideos = allVideos.slice(0, allVideos.length - lastVideoCount);
        
        for (const video of newVideos) {
          console.log(`\n🎥 NEW VIDEO DETECTED: ${video.title}`);
          console.log(`   ID: ${video.id}`);
          console.log(`   Status: ${video.processingStatus}`);
          console.log(`   User: ${video.userId}`);
          console.log(`   Created: ${video.createdAt}`);
          
          // Check GCS upload status
          if (video.gcsProcessingUrl) {
            console.log(`   ✅ GCS URL: ${video.gcsProcessingUrl}`);
          } else {
            console.log(`   ❌ GCS URL: MISSING - Upload may be in progress`);
          }
          
          // Check Bunny status
          if (video.bunnyVideoId) {
            console.log(`   📺 Bunny ID: ${video.bunnyVideoId}`);
          } else {
            console.log(`   📺 Bunny ID: Not yet assigned`);
          }
          
          // Check moderation status
          if (video.moderationResults) {
            const results = JSON.parse(video.moderationResults);
            console.log(`   🛡️ Moderation: ${results.approved ? 'Approved' : 'Under Review'}`);
          } else {
            console.log(`   🛡️ Moderation: Pending AI analysis`);
          }
          
          console.log(`   🔄 Processing Status: ${video.processingStatus}`);
          console.log(`   👁️ Active: ${video.isActive}`);
        }
        
        lastVideoCount = allVideos.length;
      }
      
      // Show current status summary
      const statusCounts = {
        processing: allVideos.filter(v => v.processingStatus === 'processing').length,
        approved: allVideos.filter(v => v.processingStatus === 'approved').length,
        rejected: allVideos.filter(v => v.processingStatus === 'rejected').length,
        withGCS: allVideos.filter(v => v.gcsProcessingUrl).length,
        withBunny: allVideos.filter(v => v.bunnyVideoId).length
      };
      
      process.stdout.write(`\r📊 Status: ${statusCounts.processing} processing | ${statusCounts.approved} approved | ${statusCounts.rejected} rejected | ${statusCounts.withGCS}/${allVideos.length} have GCS`);
      
      // Wait 2 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error('\n❌ Monitor error:', error.message);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Stopping upload monitor...');
  monitoringActive = false;
  process.exit(0);
});

// Start monitoring
monitorUploads().catch(console.error);