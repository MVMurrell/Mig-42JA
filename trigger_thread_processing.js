import { ThreadVideoModerator } from './server/threadVideoModerator.js.js';
import { storage } from './server/storage.js.js';

async function triggerThreadProcessing() {
  try {
    console.log('🔧 MANUAL TRIGGER: Processing stuck thread message 63');
    
    // Get the thread message details
    const message = await storage.getThreadMessage(63);
    if (!message) {
      console.log('❌ Thread message 63 not found');
      return;
    }
    
    console.log('Current message status:', message.processing_status);
    console.log('Bunny video ID:', message.bunny_video_id);
    
    // Check if video file exists in temp directory
    const tempFilePath = '/tmp/thread-msg-63_processed.mp4';
    
    // Initialize thread video moderator
    const moderator = new ThreadVideoModerator();
    
    console.log('🔧 Starting manual moderation process...');
    
    // Process the video through the moderation pipeline
    await moderator.processThreadVideo(tempFilePath, {
      messageId: 63,
      userId: message.user_id,
      threadId: message.thread_id,
      maxDuration: 30
    });
    
    console.log('✅ Manual processing completed');
    
  } catch (error) {
    console.error('❌ Manual processing failed:', error);
    
    // Mark as failed if processing fails
    try {
      await storage.updateThreadMessageStatus(
        63,
        'failed',
        'Manual processing failed - system error'
      );
      console.log('🔄 Marked message as failed');
    } catch (updateError) {
      console.error('❌ Failed to update status:', updateError);
    }
  }
}

triggerThreadProcessing();