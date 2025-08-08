import { audioProcessingService } from './server/audioProcessingService.js.js';
import { v4 as uuidv4 } from 'uuid';

async function debugAudioProcessing() {
  const testVideoId = uuidv4();
  const testVideoPath = '/tmp/test_audio_debug.mp4';
  
  console.log('=== AUDIO PROCESSING DEBUG TEST ===');
  console.log(`Video ID: ${testVideoId}`);
  console.log(`Video Path: ${testVideoPath}`);
  console.log('Starting audio processing...\n');
  
  try {
    const result = await audioProcessingService.processAudio(testVideoId, testVideoPath);
    console.log('\n=== AUDIO PROCESSING SUCCESS ===');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.log('\n=== AUDIO PROCESSING FAILED ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugAudioProcessing().catch(console.error);