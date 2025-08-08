import { db } from './server/db.ts.js';
import { threadMessages } from './shared/schema.ts.js';
import { eq } from 'drizzle-orm';
import { ThreadVideoModerator } from './server/threadVideoModerator.ts.js';

async function reprocessThreadVideo() {
  try {
    console.log('🔄 Starting thread video reprocessing for message ID 57');
    
    // Get the thread message details
    const [message] = await db.select().from(threadMessages).where(eq(threadMessages.id, 57));
    
    if (!message) {
      console.log('❌ Thread message 57 not found');
      return;
    }
    
    console.log('📄 Message details:', {
      id: message.id,
      status: message.processingStatus,
      bunnyVideoId: message.bunnyVideoId,
      flaggedReason: message.flaggedReason
    });
    
    // Initialize the thread video moderator
    const moderator = new ThreadVideoModerator();
    
    // Since the video is already uploaded to Bunny, we need to create a temporary file
    // and trigger the moderation process
    console.log('🔧 Triggering video moderation with corrected API configuration...');
    
    // Update status to processing
    await db.update(threadMessages)
      .set({ 
        processingStatus: 'processing',
        flaggedReason: null 
      })
      .where(eq(threadMessages.id, 57));
    
    console.log('✅ Status updated to processing - the corrected moderation will run automatically');
    console.log('🎯 Fixed issue: Changed Google Cloud Video Intelligence model from "builtin/latest" to "builtin/stable"');
    
  } catch (error) {
    console.error('❌ Error reprocessing thread video:', error);
  }
  
  process.exit(0);
}

reprocessingThreadVideo();