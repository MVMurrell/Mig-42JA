/**
 * DEBUG: Check what the pendingAIProcessor should find
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { videos, threadMessages } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

async function debugProcessorCheck() {
  console.log('🔍 DEBUG: Checking what pendingAIProcessor should find...');
  
  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);
  
  // Check videos stuck in pending_ai_analysis
  const stuckVideos = await db
    .select({
      id: videos.id,
      title: videos.title,
      processingStatus: videos.processingStatus,
      createdAt: videos.createdAt
    })
    .from(videos)
    .where(eq(videos.processingStatus, 'pending_ai_analysis'))
    .limit(10);
    
  console.log(`📹 Found ${stuckVideos.length} videos stuck in pending_ai_analysis:`);
  stuckVideos.forEach(video => {
    console.log(`  - Video ${video.id}: "${video.title}" (${video.processingStatus})`);
  });
  
  // Check thread messages stuck in processing
  const stuckThreadMessages = await db
    .select({
      id: threadMessages.id,
      threadId: threadMessages.threadId,
      processingStatus: threadMessages.processingStatus,
      userId: threadMessages.userId,
      createdAt: threadMessages.createdAt
    })
    .from(threadMessages)
    .where(eq(threadMessages.processingStatus, 'processing'))
    .limit(10);
    
  console.log(`💬 Found ${stuckThreadMessages.length} thread messages stuck in processing:`);
  stuckThreadMessages.forEach(message => {
    console.log(`  - Message ${message.id}: thread ${message.threadId} (${message.processingStatus}) by ${message.userId}`);
  });
  
  if (stuckVideos.length === 0 && stuckThreadMessages.length === 0) {
    console.log('✅ No stuck content found - processor would have nothing to do');
  } else {
    console.log(`🎯 Total stuck items: ${stuckVideos.length + stuckThreadMessages.length}`);
  }
}

debugProcessorCheck().catch(console.error);