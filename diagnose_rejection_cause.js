/**
 * DIAGNOSE: Exact Rejection Cause Analysis
 * 
 * This will determine exactly why the latest video was rejected
 */

// Import the database connection
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { videos } from './shared/schema.ts.js';
import { eq } from 'drizzle-orm';

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function diagnoseRejectionCause() {
  console.log('🔍 DIAGNOSING: Exact rejection cause for latest video');
  console.log('=' .repeat(80));

  const videoId = 'edfe4365-1731-4777-a4f9-4c1349ccdd07';
  
  try {
    console.log('📋 STEP 1: Getting video details from database...');
    const video = await db.select().from(videos).where(eq(videos.id, videoId)).limit(1);
    
    if (video.length === 0) {
      console.error('❌ Video not found in database');
      return;
    }
    
    const videoData = video[0];
    console.log(`✅ Found video: "${videoData.title}"`);
    console.log(`📂 GCS URI: ${videoData.gcsProcessingUrl}`);
    console.log(`🚫 Flag reason: ${videoData.flaggedReason}`);
    console.log(`🎵 Audio flag: ${videoData.audioFlagReason}`);
    console.log(`📊 Status: ${videoData.processingStatus}`);
    
    console.log('\n📋 STEP 2: Testing audio processing service directly...');
    
    // Import and test the audio processing service
    const { audioProcessingService } = await import('./server/audioProcessingService.ts');
    
    console.log('🎵 Running audio processing test...');
    const result = await audioProcessingService.processAudio(videoId, videoData.gcsProcessingUrl);
    
    console.log('\n=== AUDIO PROCESSING DIAGNOSIS ===');
    console.log(`✅ Success: ${result.success}`);
    console.log(`🔍 Moderation Status: ${result.moderationStatus}`);
    console.log(`📝 Transcription: "${result.transcription || 'NONE'}"`);
    console.log(`🚫 Flag Reason: ${result.flagReason || 'NONE'}`);
    console.log(`🏷️ Keywords: [${result.extractedKeywords?.join(', ') || 'NONE'}]`);
    console.log(`❌ Error: ${result.error || 'NONE'}`);
    console.log(`📂 Error Category: ${result.errorCategory || 'NONE'}`);
    
    // Analyze the result
    if (result.success) {
      if (result.moderationStatus === 'passed') {
        console.log('\n🎉 DIAGNOSIS: Audio processing is NOW WORKING!');
        console.log('✅ The fix has resolved the issue');
        console.log('🔧 Correcting the video status in database...');
        
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
        
        console.log('✅ FIXED: Your video "The birds are the words" is now approved and visible!');
        
      } else {
        console.log('\n⚠️ DIAGNOSIS: Audio processing worked, but content was flagged');
        console.log(`🚫 Reason: ${result.flagReason}`);
        console.log('📋 This is a legitimate content moderation decision, not a technical error');
      }
    } else {
      console.log('\n❌ DIAGNOSIS: Audio processing is still failing');
      console.log('🔧 ROOT CAUSE ANALYSIS:');
      
      if (result.errorCategory === 'storage') {
        console.log('   📁 STORAGE ISSUE: Cannot access video file');
        console.log('   🔍 Possible causes:');
        console.log('     - Video file missing from Google Cloud Storage');
        console.log('     - Incorrect bucket permissions');
        console.log('     - Malformed GCS URI');
        
      } else if (result.errorCategory === 'service') {
        console.log('   🔧 SERVICE ISSUE: Google Cloud Speech API problem');
        console.log('   🔍 Possible causes:');
        console.log('     - Invalid API credentials');
        console.log('     - API quota exceeded');
        console.log('     - Service temporarily unavailable');
        
      } else if (result.errorCategory === 'network') {
        console.log('   🌐 NETWORK ISSUE: Connectivity problem');
        console.log('   🔍 Possible causes:');
        console.log('     - Network timeout');
        console.log('     - Firewall blocking Google APIs');
        console.log('     - DNS resolution issues');
        
      } else {
        console.log('   ❓ TECHNICAL ISSUE: Requires investigation');
        console.log('   🔍 Check system logs for more details');
      }
      
      console.log(`\n🔧 TECHNICAL ERROR MESSAGE: ${result.error}`);
      console.log('\n💡 RECOMMENDATION: This video rejection is due to a technical system failure, not content issues');
    }
    
  } catch (error) {
    console.error('💥 SCRIPT ERROR:', error.message);
    console.error('📋 Stack trace:', error.stack);
  }
}

// Run the diagnosis
diagnoseRejectionCause().catch(console.error);