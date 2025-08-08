/**
 * PROCESS YOUR VIDEO: Direct processing for your "hello" video
 */

import { uploadFirstProcessor } from './server/uploadFirstProcessor.js.js';

async function processYourVideo() {
  const videoId = 'a4b42e31-9018-44c1-bc46-c2e1cb6b4b96';
  const tempPath = './uploads/temp-uploads/a4b42e31-9018-44c1-bc46-c2e1cb6b4b96_XNXX_video_second_take_360p.mp4';
  
  console.log('🎯 Processing your "hello" video with enhanced protection');
  
  try {
    const metadata = {
      title: 'Testing',
      description: 'hello',
      category: 'chat',
      latitude: 36.05723092,
      longitude: -94.16062965,
      visibility: 'everyone',
      groupId: null,
      frontendDuration: 25.0
    };
    
    console.log('🚀 Starting processing...');
    
    const success = await uploadFirstProcessor.processVideo(
      videoId,
      tempPath,
      metadata,
      false // MP4 doesn't need preprocessing
    );
    
    if (success) {
      console.log('✅ SUCCESS: Your video is now processed!');
      console.log('📱 Check your profile - the "Testing" video should appear');
    } else {
      console.log('❌ Processing failed');
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

processYourVideo().catch(console.error);