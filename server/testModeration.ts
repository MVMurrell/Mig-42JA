import { audioProcessingService } from './audioProcessingService.js';
import { db } from './db.js';
import { videos } from '@shared/schema.ts';
import { eq } from 'drizzle-orm';

async function testModerationOnExistingVideo() {
  const videoId = 'd13f8776-26e5-4564-b4ea-0c2e7c781c4e';
  const bunnyVideoId = 'e1e79247-82fc-44c4-9449-45042ffeea60';
  
  console.log(`🧪 TESTING: Running audio analysis on video ${videoId} with Bunny ID ${bunnyVideoId}`);
  
  try {
    // Process the audio using the real audio processing service
    const result = await audioProcessingService.processAudio(videoId, bunnyVideoId);
    
    console.log(`🧪 RESULT: Audio processing completed`);
    console.log(`- Success: ${result.success}`);
    console.log(`- Moderation Status: ${result.moderationStatus}`);
    console.log(`- Flag Reason: ${result.flagReason || 'None'}`);
    console.log(`- Transcription: ${result.transcription?.substring(0, 100)}...`);
    console.log(`- Keywords: ${result.extractedKeywords?.join(', ') || 'None'}`);
    
    // Update the database with the real moderation results
    const approved = result.moderationStatus === 'passed';
    const updateData = {
      audioModerationStatus: approved ? 'approved' : 'rejected',
      transcriptionText: result.transcription || '',
      extractedKeywords: result.extractedKeywords ? JSON.stringify(result.extractedKeywords) : null,
      isActive: approved, // Hide video if it contains profanity
      processingStatus: approved ? 'approved' : 'rejected_by_ai',
      flaggedReason: result.flagReason || null,
      audioFlagReason: result.flagReason || null
    };
    
    await db.update(videos).set(updateData).where(eq(videos.id, videoId));
    
    if (approved) {
      console.log(`✅ VIDEO APPROVED: Content is clean, video remains visible`);
    } else {
      console.log(`❌ VIDEO REJECTED: Contains inappropriate content, video hidden from users`);
      console.log(`🚨 FLAG REASON: ${result.flagReason}`);
    }
    
  } catch (error) {
    console.error(`❌ TEST FAILED:`, error);
  }
}

// Run the test
testModerationOnExistingVideo().catch(console.error);