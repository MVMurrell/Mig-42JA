/**
 * DEBUG: Manually process the failing thread video to see exact error
 */

import { uploadFirstProcessor } from './server/uploadFirstProcessor.ts';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { threadMessages } from './shared/schema.ts';
import { eq } from 'drizzle-orm';
import fs from 'fs';


async function debugThreadVideo() {
  console.log('🔍 DEBUG: Manually processing thread video 83...');
  
  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);
  
  // Get the thread message details
  const threadMessage = await db
    .select()
    .from(threadMessages)
    .where(eq(threadMessages.id, 83))
    .limit(1);
    
  if (threadMessage.length === 0) {
    console.log('❌ Thread message 83 not found');
    return;
  }
  
  const message = threadMessage[0];
  console.log('📝 Thread message details:', {
    id: message.id,
    threadId: message.threadId,
    processingStatus: message.processingStatus,
    flaggedReason: message.flaggedReason,
    userId: message.userId
  });
  
  // Check if temp file exists
  const tempFilePath = `uploads/temp-uploads/530c752f-230c-48fc-bdb6-a4933e92f998_reconstructed_thread-message-1751422040961.webm`;
  
  if (!fs.existsSync(tempFilePath)) {
    console.log('❌ Temp file not found:', tempFilePath);
    return;
  }
  
  console.log('✅ Temp file exists:', tempFilePath);
  const stats = fs.statSync(tempFilePath);
  console.log('📊 File size:', stats.size, 'bytes');
  
  // Try to process it manually
  const metadata = {
    title: `Thread Video Message ${message.id}`,
    description: '',
    category: 'thread',
    latitude: 0,
    longitude: 0,
    visibility: 'private',
    groupId: null,
    frontendDuration: parseFloat(message.duration || '0'),
    videoType: 'threadMessage',
    threadId: message.threadId,
    messageId: message.id
  };
  
  console.log('🎯 Processing with metadata:', metadata);
  
  try {
    const result = await uploadFirstProcessor.processVideoFile(
      `530c752f-230c-48fc-bdb6-a4933e92f998`,
      tempFilePath,
      metadata,
      message.userId
    );
    
    console.log('✅ Processing result:', result);
  } catch (error) {
    console.error('❌ Processing failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugThreadVideo().catch(console.error);