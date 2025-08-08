/**
 * FIX: Audio Processing Service Test
 * 
 * This script tests the specific rejected video to verify the fix works
 */

import { db } from './server/database.ts.js';
import { videos } from './shared/schema.ts.js';
import { eq } from 'drizzle-orm';

async function fixAudioProcessing() {
  console.log('🔧 FIXING: Audio Processing Service Issue');
  console.log('=' .repeat(80));

  const videoId = 'd1ae8062-a8c6-442d-9329-eec96be447df';
  
  try {
    // Get the video from database
    const video = await db.select().from(videos).where(eq(videos.id, videoId)).limit(1);
    
    if (video.length === 0) {
      console.error('❌ Video not found');
      return;
    }
    
    const videoData = video[0];
    console.log(`🎥 Video: ${videoData.title}`);
    console.log(`📁 GCS URI: ${videoData.gcsProcessingUrl}`);
    console.log(`📊 Status: ${videoData.processingStatus}`);
    console.log(`🚫 Flag: ${videoData.flaggedReason}`);
    
    // Import and test audio processing
    const { audioProcessingService } = await import('./server/audioProcessingService.ts');
    
    console.log('\n🎵 Testing enhanced audio processing...');
    const result = await audioProcessingService.processAudio(videoId, videoData.gcsProcessingUrl);
    
    console.log('\n=== AUDIO PROCESSING RESULT ===');
    console.log('Success:', result.success);
    console.log('Moderation Status:', result.moderationStatus);
    console.log('Flag Reason:', result.flagReason || 'None');
    console.log('Transcription:', result.transcription || 'None');
    console.log('Keywords:', result.extractedKeywords?.join(', ') || 'None');
    console.log('Error:', result.error || 'None');
    console.log('Error Category:', result.errorCategory || 'None');
    
    if (result.success && result.moderationStatus === 'passed') {
      console.log('\n✅ FIXING DATABASE: Updating video with correct results...');
      
      await db.update(videos).set({
        processingStatus: 'approved',
        isActive: true,
        flaggedReason: null,
        audioFlagReason: null,
        audioModerationStatus: 'approved',
        transcriptionText: result.transcription || '',
        extractedKeywords: result.extractedKeywords ? JSON.stringify(result.extractedKeywords) : null,
        updatedAt: new Date()
      }).where(eq(videos.id, videoId));
      
      console.log('✅ Video status corrected - now approved and active');
    } else {
      console.log(`\n⚠️ Issue persists: ${result.error || result.flagReason}`);
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

fixAudioProcessing().catch(console.error);