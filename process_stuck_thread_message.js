/**
 * PROCESS STUCK THREAD MESSAGE: Direct processing fix
 * 
 * This manually processes the stuck thread message using the uploadFirstProcessor
 * with the timeout mechanism now in place.
 */

async function processStuckThreadMessage() {
  console.log('🔧 Processing stuck thread message 85 using same successful pattern as video comments...');
  
  try {
    // Import the necessary modules
    const { uploadFirstProcessor } = await import('./server/uploadFirstProcessor.ts');
    const { storage } = await import('./server/storage.js');
    const fs = await import('fs/promises');
    
    const messageId = 85;
    const tempFilePath = 'uploads/temp-uploads/8b32267e-53a1-4434-9601-985701b6d264_reconstructed_thread-message-1751422920309.webm';
    
    // Check if file exists
    try {
      const stats = await fs.stat(tempFilePath);
      console.log(`✅ Found temp file: ${stats.size} bytes`);
    } catch (error) {
      console.log(`❌ Temp file missing: ${error.message}`);
      return;
    }
    
    // Use the SAME metadata structure that works for video comments
    const metadata = {
      videoType: 'thread_message',
      messageId: messageId.toString(),
      threadId: '186d325f-3079-4115-a236-f7b3c48ecf21',
      userId: 'google-oauth2|117032826996185616207',
      title: `Thread Video Message ${messageId}`,
      category: 'thread_message',
      duration: 4.9,
      visibility: 'public'
    };
    
    console.log('🚀 Starting processing with same pattern as successful video comments...');
    
    // Reset status to processing first
    await storage.updateThreadMessageStatus(messageId, 'processing', null);
    console.log(`🔄 Reset message ${messageId} status to 'processing'`);
    
    // Process using the SAME method that works for video comments
    const result = await uploadFirstProcessor.processVideo(messageId.toString(), tempFilePath, metadata);
    
    if (result) {
      console.log('✅ SUCCESS: Thread message processed successfully!');
    } else {
      console.log('❌ REJECTED: Thread message was rejected by AI moderation');
    }
    
    // Check final status
    const finalStatus = await storage.getThreadMessage(messageId);
    console.log('📊 Final status:', {
      id: finalStatus.id,
      processing_status: finalStatus.processing_status,
      flagged_reason: finalStatus.flagged_reason,
      video_url: finalStatus.video_url,
      bunny_video_id: finalStatus.bunny_video_id
    });
    
  } catch (error) {
    console.error('❌ Manual processing failed:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n')?.slice(0, 5)
    });
  }
}

processStuckThreadMessage().catch(console.error);