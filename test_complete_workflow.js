import { audioProcessingService } from './server/audioProcessingService.js.js';

async function testCompleteWorkflow() {
  console.log('🔄 Testing complete video upload and moderation workflow...');
  
  // Test a video that should pass moderation
  console.log('\n=== Test 1: Video that should PASS moderation ===');
  const passVideoId = '04299762-b0de-4566-a114-25f1ae275d1c';
  const passGcsUri = `gs://jemzy-video-moderation-steam-house-461401-t7/raw-videos/${passVideoId}.webm`;
  
  console.log(`Testing video: ${passVideoId}`);
  console.log(`GCS URI: ${passGcsUri}`);
  
  try {
    const result1 = await audioProcessingService.processAudio(passVideoId, passGcsUri);
    
    console.log('\n=== AUDIO PROCESSING RESULT (SHOULD PASS) ===');
    console.log('Success:', result1.success);
    console.log('Moderation Status:', result1.moderationStatus);
    console.log('Transcription:', result1.transcription || 'NO TRANSCRIPTION');
    console.log('Flag Reason:', result1.flagReason || 'NO FLAG REASON');
    console.log('Keywords:', result1.extractedKeywords?.join(', ') || 'NO KEYWORDS');
    console.log('Error:', result1.error || 'NO ERROR');
    console.log('=== END RESULT ===\n');
    
  } catch (error) {
    console.error('❌ Test 1 failed:', error.message);
  }
  
  // Test the video that failed moderation
  console.log('\n=== Test 2: Video that should FAIL moderation ===');
  const failVideoId = '5c833a26-74ab-4e9a-90d4-4f69d8e7d572';
  const failGcsUri = `gs://jemzy-video-moderation-steam-house-461401-t7/raw-videos/${failVideoId}.webm`;
  
  console.log(`Testing video: ${failVideoId}`);
  console.log(`GCS URI: ${failGcsUri}`);
  
  try {
    const result2 = await audioProcessingService.processAudio(failVideoId, failGcsUri);
    
    console.log('\n=== AUDIO PROCESSING RESULT (SHOULD FAIL) ===');
    console.log('Success:', result2.success);
    console.log('Moderation Status:', result2.moderationStatus);
    console.log('Transcription:', result2.transcription || 'NO TRANSCRIPTION');
    console.log('Flag Reason:', result2.flagReason || 'NO FLAG REASON');
    console.log('Keywords:', result2.extractedKeywords?.join(', ') || 'NO KEYWORDS');
    console.log('Error:', result2.error || 'NO ERROR');
    console.log('=== END RESULT ===\n');
    
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
  }
  
  console.log('🏁 Complete workflow testing finished!');
}

testCompleteWorkflow().catch(console.error);