/**
 * DEBUG: Complete Upload Flow Analysis for Message 85
 * 
 * This script traces the complete upload flow to identify exactly
 * where the processing failed in the pipeline.
 */

async function debugCompleteUploadFlow() {
  console.log('🔍 DEBUGGING: Complete upload flow for message 85...');
  
  try {
    const { db } = await import('./server/storage.js');
    const { threadMessages } = await import('./shared/schema.js');
    const { eq } = await import('drizzle-orm');
    const fs = await import('fs/promises');
    
    // Step 1: Check current message status
    console.log('\n📊 Step 1: Current message status');
    const message = await db.select()
      .from(threadMessages)
      .where(eq(threadMessages.id, 85));
    
    if (message.length === 0) {
      console.log('❌ Message 85 not found in database');
      return;
    }
    
    const currentMessage = message[0];
    console.log('Current status:', currentMessage.processing_status);
    console.log('Flagged reason:', currentMessage.flagged_reason);
    console.log('Created at:', currentMessage.created_at);
    console.log('Video URL:', currentMessage.video_url);
    console.log('Bunny Video ID:', currentMessage.bunny_video_id);
    
    // Step 2: Check temp file status
    console.log('\n📁 Step 2: Temp file verification');
    const tempFilePath = 'uploads/temp-uploads/8b32267e-53a1-4434-9601-985701b6d264_reconstructed_thread-message-1751422920309.webm';
    
    try {
      const stats = await fs.stat(tempFilePath);
      console.log(`✅ Temp file exists: ${stats.size} bytes`);
      console.log(`📅 File created: ${stats.birthtime}`);
      console.log(`📅 File modified: ${stats.mtime}`);
    } catch (error) {
      console.log(`❌ Temp file missing: ${error.message}`);
      return;
    }
    
    // Step 3: Check processing metadata and attempt manual processing
    console.log('\n🔧 Step 3: Manual processing attempt');
    
    const metadata = {
      videoType: 'thread_message',
      messageId: '85',
      threadId: '186d325f-3079-4115-a236-f7b3c48ecf21',
      userId: 'google-oauth2|117032826996185616207',
      title: 'Thread Video Message 85',
      category: 'thread_message',
      duration: 4.9,
      visibility: 'public'
    };
    
    console.log('📋 Processing metadata:', JSON.stringify(metadata, null, 2));
    
    // Step 4: Verify processor exists and is callable
    console.log('\n🚀 Step 4: Processor verification');
    
    try {
      const { uploadFirstProcessor } = await import('./server/uploadFirstProcessor.js');
      console.log('✅ uploadFirstProcessor imported successfully');
      console.log('✅ processVideo method exists:', typeof uploadFirstProcessor.processVideo);
      
      // Step 5: Attempt processing
      console.log('\n⚡ Step 5: Processing attempt');
      console.log('Using message ID: 85 (corrected from upload ID)');
      
      const result = await uploadFirstProcessor.processVideo('85', tempFilePath, metadata);
      
      if (result) {
        console.log('✅ SUCCESS: Processing completed successfully!');
      } else {
        console.log('❌ PROCESSING FAILED: Video was rejected by moderation');
      }
      
      // Step 6: Check final status
      console.log('\n📊 Step 6: Final status check');
      const finalMessage = await db.select()
        .from(threadMessages)
        .where(eq(threadMessages.id, 85));
      
      const final = finalMessage[0];
      console.log('Final status:', final.processing_status);
      console.log('Final flagged reason:', final.flagged_reason);
      console.log('Final video URL:', final.video_url);
      console.log('Final bunny video ID:', final.bunny_video_id);
      
    } catch (processorError) {
      console.error('❌ PROCESSOR ERROR:', {
        name: processorError.name,
        message: processorError.message,
        stack: processorError.stack?.split('\n')?.slice(0, 5)
      });
    }
    
  } catch (error) {
    console.error('❌ OVERALL ERROR:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.split('\n')?.slice(0, 10)
    });
  }
}

debugCompleteUploadFlow().catch(console.error);