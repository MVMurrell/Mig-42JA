/**
 * DEBUG MESSAGE 85: Manual processing to trace exact failure point
 */

async function debugMessage85Processing() {
  console.log('🔍 Debugging message 85 processing failure...');
  
  try {
    // Import required services
    const { uploadFirstProcessor } = await import('./server/uploadFirstProcessor.js');
    const { db } = await import('./server/storage.js');
    const { threadMessages } = await import('./shared/schema.js');
    const { eq } = await import('drizzle-orm');
    
    const messageId = 85;
    const tempFilePath = 'uploads/temp-uploads/8b32267e-53a1-4434-9601-985701b6d264_reconstructed_thread-message-1751422920309.webm';
    
    // Check current status
    console.log('📊 Current message status:');
    const currentStatus = await db.select()
      .from(threadMessages)
      .where(eq(threadMessages.id, messageId));
    console.log(JSON.stringify(currentStatus[0], null, 2));
    
    // Check if temp file exists
    const fs = await import('fs/promises');
    try {
      const stats = await fs.stat(tempFilePath);
      console.log(`📁 Temp file exists: ${stats.size} bytes`);
    } catch (error) {
      console.log(`❌ Temp file missing: ${error.message}`);
      return;
    }
    
    // Prepare metadata for processing
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
    
    console.log('🚀 Attempting manual processing with correct metadata...');
    console.log('📋 Metadata:', JSON.stringify(metadata, null, 2));
    
    // Test the corrected processor call
    const result = await uploadFirstProcessor.processVideo(messageId.toString(), tempFilePath, metadata);
    
    if (result) {
      console.log('✅ SUCCESS: Manual processing completed!');
    } else {
      console.log('❌ REJECTED: Manual processing was rejected by AI moderation');
    }
    
    // Check final status after processing
    const finalStatus = await db.select()
      .from(threadMessages)
      .where(eq(threadMessages.id, messageId));
    
    console.log('📊 Final status after processing:');
    console.log(JSON.stringify(finalStatus[0], null, 2));
    
  } catch (error) {
    console.error('❌ Debug processing failed:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n')?.slice(0, 5)
    });
  }
}

debugMessage85Processing().catch(console.error);