/**
 * DEBUG: Direct Thread Message Processing
 * 
 * This script directly processes the thread message using uploadFirstProcessor
 * to identify the exact failure point in the AI moderation pipeline.
 */

async function debugDirectThreadProcessing() {
  console.log('🔧 DEBUG: Direct thread message processing test...');
  
  try {
    // Import the uploadFirstProcessor
    const { UploadFirstProcessor } = await import('./server/uploadFirstProcessor.js');
    
    // Initialize processor
    const processor = new UploadFirstProcessor();
    
    console.log('📋 Thread message details:');
    console.log('  - ID: 83');
    console.log('  - Upload ID: 530c752f-230c-48fc-bdb6-a4933e92f998');
    console.log('  - Video type: thread-message');
    
    // Process the thread message with known parameters
    const metadata = {
      videoType: 'thread-message',
      messageId: 83,
      threadId: '186d325f-3079-4115-a236-f7b3c48ecf21',
      userId: 'google-oauth2|117032826996185616207'
    };
    
    console.log('🎯 Starting direct processing...');
    
    // Process the video using the actual temp file
    const tempFilePath = 'uploads/temp-uploads/530c752f-230c-48fc-bdb6-a4933e92f998_reconstructed_thread-message-1751422040961.webm';
    
    await processor.processVideo(
      '530c752f-230c-48fc-bdb6-a4933e92f998',
      tempFilePath,
      metadata
    );
    
    console.log('✅ Processing completed successfully!');
    
  } catch (error) {
    console.error('❌ Direct processing failed:', error.message);
    console.error('Stack:', error.stack);
    
    // Look for specific error patterns
    if (error.message.includes('Video Intelligence')) {
      console.error('🎬 VIDEO MODERATION ERROR: Issue with Google Video Intelligence API');
    }
    if (error.message.includes('Speech')) {
      console.error('🎙️ AUDIO MODERATION ERROR: Issue with Google Speech-to-Text API');
    }
    if (error.message.includes('bucket')) {
      console.error('☁️ GCS ERROR: Issue with Google Cloud Storage bucket access');
    }
  }
}

debugDirectThreadProcessing().catch(console.error);