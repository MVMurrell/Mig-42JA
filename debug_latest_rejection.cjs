/**
 * DEBUG: Latest Video Rejection Analysis
 * 
 * Analyzes the specific video that was just rejected to understand
 * why the audio processing fix didn't resolve the issue
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { videos, users } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

async function debugLatestRejection() {
  try {
    console.log('\n🕵️ DEBUGGING: Latest video rejection');
    
    // Get the rejected video
    const [rejectedVideo] = await db.select()
      .from(videos)
      .where(eq(videos.id, '40b0b22a-211d-483f-ba71-a49afaf0379d'));
    
    if (!rejectedVideo) {
      console.log('❌ Video not found');
      return;
    }
    
    console.log('\n📄 VIDEO DETAILS:');
    console.log('Title:', rejectedVideo.title);
    console.log('Status:', rejectedVideo.processingStatus);
    console.log('Flag reason:', rejectedVideo.flaggedReason);
    console.log('Audio flag:', rejectedVideo.audioFlagReason);
    console.log('Created:', rejectedVideo.createdAt);
    console.log('Updated:', rejectedVideo.updatedAt);
    console.log('GCS URL:', rejectedVideo.gcsProcessingUrl);
    console.log('Bunny ID:', rejectedVideo.bunnyVideoId);
    
    // Test if the fixed upload processor is now working
    console.log('\n🔧 TESTING: Upload processor fix');
    
    const { uploadFirstProcessor } = await import('./server/uploadFirstProcessor');
    
    // Test the runAIModeration method directly
    if (rejectedVideo.gcsProcessingUrl) {
      console.log('\n🔍 Testing runAIModeration with corrected method calls...');
      
      try {
        const result = await uploadFirstProcessor.runAIModeration(
          rejectedVideo.id, 
          rejectedVideo.gcsProcessingUrl
        );
        
        console.log('\n✅ AI MODERATION RESULT:');
        console.log('Approved:', result.approved);
        console.log('Video moderation:', result.videoModeration);
        console.log('Audio moderation:', result.audioModeration);
        console.log('Transcription:', result.transcription);
        console.log('Flag reason:', result.flagReason);
        
        if (result.approved) {
          console.log('\n🎉 SUCCESS: The fix worked! Video should now be approved');
          console.log('The original rejection was due to the method name bug');
        } else {
          console.log('\n⚠️ Video legitimately rejected by AI moderation:');
          console.log('Reason:', result.flagReason);
        }
        
      } catch (error) {
        console.log('\n❌ AI moderation still failing:');
        console.log('Error:', error.message);
        console.log('This indicates the fix may not be complete');
      }
    } else {
      console.log('\n❌ No GCS URL found - video never made it to storage');
    }
    
  } catch (error) {
    console.error('\n❌ Debug failed:', error);
  }
  
  process.exit(0);
}

debugLatestRejection();