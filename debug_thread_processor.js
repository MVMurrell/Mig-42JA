/**
 * DEBUG: Test thread message processor directly
 * 
 * This will help us see the exact error happening in the async processing
 */

import { uploadFirstProcessor } from './server/uploadFirstProcessor.js.js';

async function debugThreadProcessor() {
  console.log('🐛 DEBUG: Testing thread message processor directly');
  
  const videoId = 'd6996acd-adc0-4e44-a314-f0fa46eadb61';
  const filePath = './uploads/temp-uploads/d6996acd-adc0-4e44-a314-f0fa46eadb61_reconstructed_thread-message-1751420051496.webm';
  
  const metadata = {
    videoType: 'thread_message',
    messageId: '76',
    threadId: '186d325f-3079-4115-a236-f7b3c48ecf21',
    userId: 'google-oauth2|117032826996185616207',
    frontendDuration: 10
  };
  
  console.log('🐛 DEBUG: Calling processor with:');
  console.log('  Video ID:', videoId);
  console.log('  File path:', filePath);
  console.log('  Metadata:', JSON.stringify(metadata, null, 2));
  
  try {
    const result = await uploadFirstProcessor.processVideo(videoId, filePath, metadata);
    console.log('🐛 DEBUG: Processor result:', result);
  } catch (error) {
    console.error('🐛 DEBUG: Processor error:', error);
    console.error('🐛 DEBUG: Error stack:', error?.stack);
  }
}

debugThreadProcessor().catch(console.error);