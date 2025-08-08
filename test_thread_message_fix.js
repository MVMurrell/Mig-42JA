/**
 * TEST: Thread Message Upload Fix
 * 
 * This tests the fixed uploadFirstProcessor to handle thread messages correctly
 */

import { uploadFirstProcessor } from './server/uploadFirstProcessor.js.js';
import * as path from "node:path";

async function testThreadMessageFix() {
  console.log('🧪 TEST: Thread Message Upload Fix');
  
  // Create a test video file path (using existing temp file)
  const testVideoPath = './uploads/temp-uploads/3c5768e8-1478-44a6-9474-446c80cfee34_reconstructed_thread-message-1751422673008.webm';
  
  // Create test metadata for thread message
  const metadata = {
    videoType: 'thread_message',
    messageId: '87', // Test message ID
    threadId: '186d325f-3079-4115-a236-f7b3c48ecf21',
    userId: 'google-oauth2|117032826996185616207',
    duration: 4.1
  };
  
  try {
    console.log('🚀 Testing uploadFirstProcessor with thread message metadata...');
    
    const result = await uploadFirstProcessor.processVideo('test-thread-87', testVideoPath, metadata);
    
    console.log('✅ TEST RESULT:', result ? 'SUCCESS' : 'FAILED');
    console.log('📊 Processing result:', uploadFirstProcessor.lastProcessingResult);
    
  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    console.error('📋 Error details:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack?.split('\n')?.slice(0, 5)
    });
  }
}

testThreadMessageFix();