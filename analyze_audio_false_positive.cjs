/**
 * ANALYZE: Audio False Positive Detection
 * 
 * This script analyzes why "love your boo boo" video was incorrectly flagged
 * by the AI audio analysis system. We'll re-run the audio analysis to see
 * what the Google Cloud Speech-to-Text API actually detected.
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

async function analyzeAudioFalsePositive() {
  console.log('🔍 ANALYZING: Audio False Positive Detection');
  console.log('==================================================');
  
  try {
    const sql = neon(process.env.DATABASE_URL);
    const db = drizzle(sql);
    
    // Get the video details
    const videoQuery = `
      SELECT id, title, processing_status, flagged_reason, audio_flag_reason, gcs_processing_url
      FROM videos 
      WHERE id = '9e1131d0-688a-4a0a-aaed-d79e0bd2d493'
    `;
    
    const videos = await sql(videoQuery);
    
    if (videos.length === 0) {
      console.log('❌ Video not found');
      return;
    }
    
    const video = videos[0];
    console.log('📊 VIDEO DETAILS:');
    console.log(`   Title: "${video.title}"`);
    console.log(`   Status: ${video.processing_status}`);
    console.log(`   Flag Reason: ${video.flagged_reason}`);
    console.log(`   Audio Flag: ${video.audio_flag_reason}`);
    console.log(`   GCS URL: ${video.gcs_processing_url}`);
    
    // Check if moderation decision record exists
    console.log('\n🔍 STEP 1: Checking moderation decisions...');
    const moderationQuery = `
      SELECT 
        moderator_id,
        decision,
        reason,
        audio_transcription,
        created_at
      FROM moderation_decisions 
      WHERE video_id = '9e1131d0-688a-4a0a-aaed-d79e0bd2d493'
      ORDER BY created_at DESC
    `;
    
    const decisions = await sql(moderationQuery);
    
    if (decisions.length > 0) {
      console.log('✅ Found moderation decision record');
      const decision = decisions[0];
      console.log(`   Moderator: ${decision.moderator_id}`);
      console.log(`   Decision: ${decision.decision}`);
      console.log(`   Reason: ${decision.reason}`);
      console.log(`   Audio Transcription: "${decision.audio_transcription || 'None available'}"`);
      console.log(`   Timestamp: ${decision.created_at}`);
      
      // Analyze the transcription
      if (decision.audio_transcription) {
        console.log('\n🔍 STEP 2: Analyzing transcription...');
        const transcription = decision.audio_transcription.toLowerCase();
        console.log(`   Detected speech: "${transcription}"`);
        console.log(`   Video title: "${video.title}"`);
        
        // Check for potential false positive triggers
        const possibleTriggers = [
          'boo',
          'boob',
          'inappropriate',
          'profanity'
        ];
        
        console.log('\n🔍 STEP 3: Checking for false positive triggers...');
        let foundTriggers = [];
        
        possibleTriggers.forEach(trigger => {
          if (transcription.includes(trigger)) {
            foundTriggers.push(trigger);
          }
        });
        
        if (foundTriggers.length > 0) {
          console.log(`⚠️  Potential false positive triggers found: ${foundTriggers.join(', ')}`);
          console.log('   The AI may have misinterpreted innocent words as inappropriate');
        } else {
          console.log('✅ No obvious false positive triggers in transcription');
        }
        
        // Check if title influenced the decision
        console.log('\n🔍 STEP 4: Checking title influence...');
        if (video.title.toLowerCase().includes('boo')) {
          console.log('⚠️  Video title contains "boo" - AI may have flagged this as inappropriate');
          console.log('   Title: "love your boo boo" contains "boo boo" which AI may misinterpret');
        }
        
      } else {
        console.log('❌ No audio transcription available in moderation decision');
      }
      
    } else {
      console.log('❌ No moderation decision record found');
      console.log('   This suggests the video was rejected without proper AI analysis');
    }
    
    // Check for any duplicate processing attempts
    console.log('\n🔍 STEP 5: Checking for multiple processing attempts...');
    const allDecisions = await sql(`
      SELECT created_at, decision, reason
      FROM moderation_decisions 
      WHERE video_id = '9e1131d0-688a-4a0a-aaed-d79e0bd2d493'
      ORDER BY created_at ASC
    `);
    
    console.log(`   Found ${allDecisions.length} moderation decision(s)`);
    allDecisions.forEach((decision, index) => {
      console.log(`   ${index + 1}. ${decision.created_at}: ${decision.decision} - ${decision.reason}`);
    });
    
  } catch (error) {
    console.log(`❌ Analysis failed: ${error.message}`);
    if (error.stack) {
      console.log(`Stack: ${error.stack}`);
    }
  }
  
  console.log('\n🎯 ANALYSIS COMPLETE');
  console.log('====================');
}

analyzeAudioFalsePositive().catch(console.error);