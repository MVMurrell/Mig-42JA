import { audioProcessingService } from './server/audioProcessingService.ts.js';

async function debugAudioFailure() {
  console.log('🔍 AUDIO DEBUG: Starting comprehensive audio processing test...');
  
  // Test with a recent video that was approved but should have been flagged
  const testVideoId = '8e1d4e8a-addb-40c7-92db-d72117d12d32';
  const gcsUri = `gs://jemzy-app-videos/${testVideoId}`;
  
  console.log(`🔍 AUDIO DEBUG: Testing audio processing for video: ${testVideoId}`);
  console.log(`🔍 AUDIO DEBUG: GCS URI: ${gcsUri}`);
  
  try {
    const result = await audioProcessingService.processVideo(testVideoId, gcsUri);
    console.log('🔍 AUDIO DEBUG: Raw processing result:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ AUDIO DEBUG: Processing succeeded');
      console.log(`   - Transcription: "${result.transcription || 'NONE'}"`);
      console.log(`   - Moderation: ${result.moderationStatus}`);
      console.log(`   - Flag reason: ${result.flagReason || 'NONE'}`);
      console.log(`   - Keywords: ${result.extractedKeywords?.join(', ') || 'NONE'}`);
    } else {
      console.log('❌ AUDIO DEBUG: Processing failed');
      console.log(`   - Error: ${result.error || 'No error message'}`);
      console.log(`   - Category: ${result.errorCategory || 'Unknown'}`);
      console.log(`   - Moderation: ${result.moderationStatus}`);
    }
    
  } catch (error) {
    console.error('💥 AUDIO DEBUG: System error during processing:', error);
    console.error('   - Error message:', error.message);
    console.error('   - Stack trace:', error.stack);
  }
}

debugAudioFailure().catch(console.error);