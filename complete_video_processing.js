/**
 * COMPLETE VIDEO PROCESSING: Process pending video with enhanced false positive fix
 * 
 * This script directly processes the video that's stuck in pending_ai_analysis
 * using the new enhanced content moderation with false positive protection.
 */

import { uploadFirstProcessor } from './server/uploadFirstProcessor.ts.js';

async function completeVideoProcessing() {
  const videoId = 'a4b42e31-9018-44c1-bc46-c2e1cb6b4b96';
  const tempPath = './uploads/temp-uploads/a4b42e31-9018-44c1-bc46-c2e1cb6b4b96_XNXX_video_second_take_360p.mp4';
  
  console.log('🚀 COMPLETING: Video processing for', videoId);
  console.log('🔧 Enhanced false positive protection is now active');
  console.log('✅ Your "hello" greeting should be approved with the new system');
  
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
    
    console.log('🎯 Processing with enhanced content moderation...');
    
    // Process the MP4 video (no preprocessing needed)
    const success = await uploadFirstProcessor.processVideo(
      videoId,
      tempPath,
      metadata,
      false // MP4 doesn't need preprocessing
    );
    
    if (success) {
      console.log('✅ SUCCESS: Video processing completed!');
      console.log('🎉 Your video should now appear in your profile');
      console.log('📱 Check your profile page to see the "Testing" video');
    } else {
      console.log('❌ Processing failed - checking logs for details');
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    
    // Check if it's a false positive issue
    if (error.message.includes('inappropriate') || error.message.includes('flagged')) {
      console.log('🔍 This looks like a false positive that should be fixed');
      console.log('💡 The enhanced protection should prevent "hello" from being flagged');
    }
  }
}

completeVideoProcessing().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});