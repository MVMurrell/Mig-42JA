/**
 * DEBUG: Specific test for the rejected video audio processing
 * 
 * This script will diagnose the exact issue causing the "AI moderation system error"
 * for video d1ae8062-a8c6-442d-9329-eec96be447df
 */

import { audioProcessingService } from './server/audioProcessingService.ts';

async function debugRejectedVideoAudio() {
  console.log('🐛 DEBUGGING: Rejected video audio processing');
  console.log('=' .repeat(80));

  const videoId = 'd1ae8062-a8c6-442d-9329-eec96be447df';
  const gcsUri = 'gs://jemzy-app-audio-to-text-transcriptions/raw-videos/d1ae8062-a8c6-442d-9329-eec96be447df.webm';
  
  console.log(`🎥 Video ID: ${videoId}`);
  console.log(`📁 GCS URI: ${gcsUri}`);
  console.log('');

  try {
    console.log('🎵 STEP 1: Testing audio processing with detailed logging...');
    
    // Call the exact same method that failed
    const result = await audioProcessingService.processAudio(videoId, gcsUri);
    
    console.log('\n=== AUDIO PROCESSING RESULT ===');
    console.log('Success:', result.success);
    console.log('Transcription:', result.transcription || 'NO TRANSCRIPTION');
    console.log('Moderation Status:', result.moderationStatus);
    console.log('Flag Reason:', result.flagReason || 'NO FLAG REASON');
    console.log('Keywords:', result.extractedKeywords?.join(', ') || 'NO KEYWORDS');
    console.log('Error:', result.error || 'NO ERROR');
    console.log('Error Category:', result.errorCategory || 'NO CATEGORY');
    console.log('=== END RESULT ===\n');
    
    if (!result.success) {
      console.log('❌ DIAGNOSIS: The audio processing failed');
      console.log('📋 DETAILED ERROR ANALYSIS:');
      console.log(`   - Error Category: ${result.errorCategory}`);
      console.log(`   - Error Message: ${result.error}`);
      console.log(`   - Flag Reason: ${result.flagReason}`);
      
      if (result.errorCategory === 'service') {
        console.log('🔧 RECOMMENDED FIX: Google Cloud Speech-to-Text service issue');
        console.log('   - Check API credentials');
        console.log('   - Verify service account permissions');
        console.log('   - Test Speech API connectivity');
      } else if (result.errorCategory === 'storage') {
        console.log('🔧 RECOMMENDED FIX: Google Cloud Storage access issue');
        console.log('   - Check bucket permissions');
        console.log('   - Verify file exists in GCS');
        console.log('   - Test storage connectivity');
      } else if (result.errorCategory === 'dependency') {
        console.log('🔧 RECOMMENDED FIX: FFmpeg dependency issue');
        console.log('   - Install or configure FFmpeg');
        console.log('   - Check system dependencies');
      }
    } else {
      console.log('✅ DIAGNOSIS: Audio processing succeeded this time');
      console.log('📋 The issue may have been temporary or intermittent');
    }
    
  } catch (error) {
    console.error('💥 CRITICAL ERROR: Audio processing threw an exception');
    console.error('Error details:', error);
    console.error('Stack trace:', error.stack);
    
    console.log('\n🔧 DIAGNOSIS: Exception thrown during processing');
    console.log('This indicates a code-level error, not a moderation decision');
    
    if (error.message.includes('credentials')) {
      console.log('🔑 LIKELY CAUSE: Authentication/credentials issue');
    } else if (error.message.includes('Speech')) {
      console.log('🎤 LIKELY CAUSE: Google Cloud Speech API issue');
    } else if (error.message.includes('Storage')) {
      console.log('💾 LIKELY CAUSE: Google Cloud Storage issue');
    } else {
      console.log('❓ LIKELY CAUSE: Unknown system error');
    }
  }
}

// Run the test
debugRejectedVideoAudio().catch(console.error);