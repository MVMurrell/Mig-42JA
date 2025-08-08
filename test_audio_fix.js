/**
 * TEST: Fixed Audio Processing Service
 * 
 * This script tests the enhanced audio processing service
 * with better error handling and bucket configuration
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { videos } from './shared/schema.ts.js';
import { eq } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;
const client = postgres(DATABASE_URL);
const db = drizzle(client, { schema: { videos } });

async function testAudioProcessingFix() {
  console.log('🧪 TESTING: Enhanced Audio Processing Service');
  console.log('=' .repeat(80));

  const videoId = 'd1ae8062-a8c6-442d-9329-eec96be447df';
  
  try {
    // Get the video details from database
    const video = await db.select().from(videos).where(eq(videos.id, videoId)).limit(1);
    
    if (video.length === 0) {
      console.error('❌ Video not found in database');
      return;
    }
    
    const videoData = video[0];
    console.log(`🎥 Video: ${videoData.title}`);
    console.log(`📁 GCS URI: ${videoData.gcsProcessingUrl}`);
    console.log(`📊 Current Status: ${videoData.processingStatus}`);
    console.log(`🚫 Current Flag: ${videoData.flaggedReason}`);
    console.log('');

    // Import the audio processing service
    const { audioProcessingService } = await import('./server/audioProcessingService.ts');
    
    console.log('🎵 STEP 1: Testing audio processing with enhanced error handling...');
    
    // Test the audio processing with the exact same parameters that failed before
    const result = await audioProcessingService.processAudio(videoId, videoData.gcsProcessingUrl);
    
    console.log('\n=== ENHANCED AUDIO PROCESSING RESULT ===');
    console.log('✅ Success:', result.success);
    console.log('📝 Transcription:', result.transcription || 'NO TRANSCRIPTION');
    console.log('🔍 Moderation Status:', result.moderationStatus);
    console.log('🚫 Flag Reason:', result.flagReason || 'NO FLAG REASON');
    console.log('🏷️ Keywords:', result.extractedKeywords?.join(', ') || 'NO KEYWORDS');
    console.log('❌ Error:', result.error || 'NO ERROR');
    console.log('📂 Error Category:', result.errorCategory || 'NO CATEGORY');
    console.log('=== END RESULT ===\n');
    
    // Analyze the result
    if (result.success) {
      console.log('🎉 SUCCESS: Audio processing completed successfully!');
      console.log('🔧 DIAGNOSIS: The enhanced error handling and bucket configuration fixes resolved the issue');
      
      if (result.transcription) {
        console.log(`📄 Transcription preview: "${result.transcription.substring(0, 100)}..."`);
        console.log(`📊 Transcription length: ${result.transcription.length} characters`);
      }
      
      if (result.extractedKeywords && result.extractedKeywords.length > 0) {
        console.log(`🏷️ Extracted ${result.extractedKeywords.length} keywords for search functionality`);
      }
      
      console.log(`✅ Moderation result: ${result.moderationStatus}`);
      
      // Now update the database with the correct results
      console.log('\n🔄 STEP 2: Updating database with correct audio processing results...');
      
      const updateData = {
        audioModerationStatus: result.moderationStatus === 'passed' ? 'approved' : 'rejected',
        transcriptionText: result.transcription || '',
        audioFlagReason: result.flagReason || null,
        extractedKeywords: result.extractedKeywords ? JSON.stringify(result.extractedKeywords) : null,
        // If audio moderation passed and it was previously rejected only due to audio issues, approve the video
        processingStatus: result.moderationStatus === 'passed' && videoData.flaggedReason === 'AI moderation system error' ? 'approved' : videoData.processingStatus,
        flaggedReason: result.moderationStatus === 'passed' && videoData.flaggedReason === 'AI moderation system error' ? null : videoData.flaggedReason,
        isActive: result.moderationStatus === 'passed' && videoData.flaggedReason === 'AI moderation system error',
        updatedAt: new Date()
      };
      
      await db.update(videos).set(updateData).where(eq(videos.id, videoId));
      
      console.log('✅ Database updated successfully with correct audio processing results');
      console.log('📋 Update summary:');
      console.log(`   - Audio Moderation: ${updateData.audioModerationStatus}`);
      console.log(`   - Transcription: ${updateData.transcriptionText ? 'Generated' : 'None'}`);
      console.log(`   - Keywords: ${updateData.extractedKeywords ? JSON.parse(updateData.extractedKeywords).length + ' extracted' : 'None'}`);
      console.log(`   - Video Status: ${updateData.processingStatus}`);
      console.log(`   - Is Active: ${updateData.isActive}`);
      
    } else {
      console.log('⚠️ DIAGNOSIS: Audio processing still failed, but with better error reporting');
      console.log('📋 DETAILED ERROR ANALYSIS:');
      console.log(`   - Error Category: ${result.errorCategory}`);
      console.log(`   - User-Friendly Message: ${result.error}`);
      console.log(`   - Technical Flag Reason: ${result.flagReason}`);
      
      console.log('\n🔧 RECOMMENDED ACTIONS:');
      if (result.errorCategory === 'storage') {
        console.log('   1. Check if video file exists in Google Cloud Storage bucket');
        console.log('   2. Verify bucket permissions and access credentials');
        console.log('   3. Ensure GCS URI format is correct');
      } else if (result.errorCategory === 'service') {
        console.log('   1. Verify Google Cloud Speech API credentials');
        console.log('   2. Check API quotas and billing status');
        console.log('   3. Test Speech API connectivity');
      } else if (result.errorCategory === 'network') {
        console.log('   1. Check network connectivity to Google Cloud services');
        console.log('   2. Verify firewall settings');
        console.log('   3. Test with a shorter timeout period');
      }
    }
    
  } catch (error) {
    console.error('💥 CRITICAL ERROR: Test script failed');
    console.error('Error details:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await client.end();
  }
}

// Run the test
testAudioProcessingFix().catch(console.error);