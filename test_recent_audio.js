import { audioProcessingService } from './server/audioProcessingService.ts.js';

async function testRecentAudio() {
  console.log('🔍 Testing audio processing for recent video...');
  
  // Test a video that exists in the actual storage bucket
  const videoId = '5c833a26-74ab-4e9a-90d4-4f69d8e7d572';
  const gcsUri = 'gs://jemzy-video-moderation-steam-house-461401-t7/raw-videos/5c833a26-74ab-4e9a-90d4-4f69d8e7d572.webm';
  
  console.log(`Testing video: ${videoId}`);
  console.log(`GCS URI: ${gcsUri}`);
  
  try {
    console.log('Calling audioProcessingService.processAudio...');
    const result = await audioProcessingService.processAudio(videoId, gcsUri);
    
    console.log('\n=== AUDIO PROCESSING RESULT ===');
    console.log('Success:', result.success);
    console.log('Moderation Status:', result.moderationStatus);
    console.log('Transcription:', result.transcription || 'NO TRANSCRIPTION');
    console.log('Flag Reason:', result.flagReason || 'NO FLAG REASON');
    console.log('Keywords:', result.extractedKeywords?.join(', ') || 'NO KEYWORDS');
    console.log('Error:', result.error || 'NO ERROR');
    console.log('Error Category:', result.errorCategory || 'NO ERROR CATEGORY');
    console.log('=== END RESULT ===\n');
    
    if (result.transcription) {
      console.log('Full transcription text:');
      console.log('"' + result.transcription + '"');
    }
    
  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
    console.error('Error stack:', error.stack);
  }
}

testRecentAudio();