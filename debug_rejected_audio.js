/**
 * DEBUG: Analyze what the AI audio system detected in the rejected video
 * 
 * This will help us understand why "hello hello hello" was flagged as inappropriate
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import { Storage } from '@google-cloud/storage';
import { SpeechClient } from '@google-cloud/speech';

async function debugRejectedAudio() {
  console.log('🔍 ANALYZING: Rejected audio for video 9e1131d0-688a-4a0a-aaed-d79e0bd2d493');
  console.log('==================================================================');
  
  try {
    const sql = neon(process.env.DATABASE_URL);
    const db = drizzle(sql);
    
    // Get the video details
    const videoQuery = `
      SELECT id, title, processing_status, flagged_reason, audio_flag_reason, gcs_processing_url
      FROM videos 
      WHERE id = '9e1131d0-688a-4a0a-aaed-d79e0bd2d493'
    `;
    
    const result = await sql(videoQuery);
    const video = result[0];
    
    if (!video) {
      console.log('❌ Video not found');
      return;
    }
    
    console.log('📊 VIDEO DETAILS:');
    console.log(`   Title: ${video.title}`);
    console.log(`   Status: ${video.processing_status}`);
    console.log(`   Flag Reason: ${video.flagged_reason}`);
    console.log(`   Audio Flag: ${video.audio_flag_reason}`);
    console.log(`   GCS URL: ${video.gcs_processing_url || 'Not available'}`);
    
    // Check if video exists in GCS
    if (video.gcs_processing_url) {
      console.log('\n🔍 STEP 1: Checking GCS file existence...');
      
      const storage = new Storage({
        projectId: 'steam-house-461401-t7'
      });
      
      try {
        const bucket = storage.bucket('jemzy-video-moderation-steam-house-461401-t7');
        const file = bucket.file(video.gcs_processing_url.replace('gs://jemzy-video-moderation-steam-house-461401-t7/', ''));
        const [exists] = await file.exists();
        
        if (exists) {
          console.log('✅ Video file exists in GCS');
          
          // Try to re-analyze the audio to see what was detected
          console.log('\n🔍 STEP 2: Re-analyzing audio with Speech-to-Text...');
          
          const speechClient = new SpeechClient({
            projectId: 'steam-house-461401-t7'
          });
          
          const request = {
            audio: {
              uri: video.gcs_url,
            },
            config: {
              encoding: 'WEBM_OPUS',
              sampleRateHertz: 48000,
              languageCode: 'en-US',
              enableProfanityFilter: false, // We want to see exactly what was detected
              enableWordTimeOffsets: true,
              enableWordConfidence: true,
              model: 'latest_long'
            },
          };
          
          console.log('📡 Sending request to Google Speech-to-Text API...');
          const [response] = await speechClient.recognize(request);
          
          if (response.results && response.results.length > 0) {
            console.log('\n📝 TRANSCRIPTION RESULTS:');
            
            response.results.forEach((result, index) => {
              const alternative = result.alternatives[0];
              console.log(`\n   Result ${index + 1}:`);
              console.log(`   Transcript: "${alternative.transcript}"`);
              console.log(`   Confidence: ${alternative.confidence}`);
              
              if (alternative.words) {
                console.log('   Word-by-word breakdown:');
                alternative.words.forEach((word, wordIndex) => {
                  console.log(`     ${wordIndex + 1}. "${word.word}" (confidence: ${word.confidence})`);
                });
              }
            });
            
            // Check what triggered the inappropriate content flag
            const fullTranscript = response.results
              .map(result => result.alternatives[0].transcript)
              .join(' ')
              .toLowerCase();
              
            console.log(`\n🔍 FULL TRANSCRIPT: "${fullTranscript}"`);
            
            // Common false positive triggers
            const possibleTriggers = [
              'hell', 'hello', 'boo', 'boob', 'sexual', 'inappropriate',
              'damn', 'shit', 'fuck', 'ass', 'sex', 'porn', 'nude'
            ];
            
            const foundTriggers = possibleTriggers.filter(trigger => 
              fullTranscript.includes(trigger)
            );
            
            if (foundTriggers.length > 0) {
              console.log('\n⚠️ POSSIBLE TRIGGER WORDS DETECTED:');
              foundTriggers.forEach(trigger => {
                console.log(`   - "${trigger}"`);
              });
            } else {
              console.log('\n✅ No obvious trigger words found in transcript');
            }
            
          } else {
            console.log('❌ No transcription results returned');
          }
          
        } else {
          console.log('❌ Video file not found in GCS');
        }
        
      } catch (gcsError) {
        console.error('❌ GCS Error:', gcsError.message);
      }
      
    } else {
      console.log('❌ No GCS URL available - video may not have uploaded to cloud storage');
    }
    
    console.log('\n🎯 ANALYSIS COMPLETE');
    console.log('====================');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugRejectedAudio();