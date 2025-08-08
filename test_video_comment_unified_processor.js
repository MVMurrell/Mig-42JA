/**
 * TEST: Video Comment Unified Processor
 * 
 * This script tests the newly integrated unified uploadFirstProcessor 
 * for video comment processing to ensure it works correctly.
 */

import { uploadFirstProcessor } from './server/uploadFirstProcessor.js.js';
import { db } from './server/db.js.js';
import { videoComments } from './shared/schema.js.js';
import { eq } from 'drizzle-orm';
import * as path from "node:path";
import { writeFile } from 'fs/promises';

async function testVideoCommentUnifiedProcessor() {
  console.log('🧪 TEST: Video Comment Unified Processor Integration');
  
  try {
    // Create a test video comment record first
    const testComment = await db.insert(videoComments).values({
      userId: 'google-oauth2|117032826996185616207',
      videoId: '1ca16902-95f7-400f-b9a2-dfca0f3818f8', // existing video
      comment: null, // video comment has no text
      commentType: 'video',
      processingStatus: 'processing',
      duration: 2.5
    }).returning();
    
    console.log(`✅ Created test video comment record:`, testComment[0]);
    
    // Create a dummy video file for testing (2 seconds of black video)
    const testVideoPath = join('./uploads/temp-uploads/', 'test_video_comment.webm');
    
    // Create a minimal WebM file for testing (this would normally come from the frontend)
    const dummyVideoData = Buffer.from([
      0x1A, 0x45, 0xDF, 0xA3, // EBML header
      0x9F, 0x42, 0x86, 0x81, 0x01, // EBML version
      0x42, 0xF7, 0x81, 0x01, // EBML read version
      0x42, 0xF2, 0x81, 0x04, // EBML max ID length
      0x42, 0xF3, 0x81, 0x08, // EBML max size length
      0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6D, // Doc type: "webm"
      0x42, 0x87, 0x81, 0x02, // Doc type version
      0x42, 0x85, 0x81, 0x02  // Doc type read version
    ]);
    
    await writeFile(testVideoPath, dummyVideoData);
    console.log(`✅ Created test video file: ${testVideoPath}`);
    
    // Prepare metadata for video comment processing 
    const metadata = {
      videoType: 'video_comment',
      commentId: testComment[0].id,
      videoId: '1ca16902-95f7-400f-b9a2-dfca0f3818f8',
      userId: 'google-oauth2|117032826996185616207',
      title: `Video Comment ${testComment[0].id}`,
      category: 'video_comment',
      duration: 2.5,
      visibility: 'public'
    };
    
    console.log(`🚀 Starting unified processor for video comment ${testComment[0].id}...`);
    
    // Test the unified processor
    const result = await uploadFirstProcessor.processVideo(
      testComment[0].id.toString(), 
      testVideoPath, 
      metadata
    );
    
    console.log(`✅ Unified processor completed with result: ${result}`);
    
    // Check the updated video comment status
    const updatedComment = await db.select()
      .from(videoComments)
      .where(eq(videoComments.id, testComment[0].id))
      .limit(1);
    
    console.log(`📊 Updated video comment status:`, updatedComment[0]);
    
    if (updatedComment[0].processingStatus === 'approved') {
      console.log(`🎉 SUCCESS: Video comment processed successfully through unified pipeline!`);
      console.log(`📺 Video URL: ${updatedComment[0].commentVideoUrl}`);
      console.log(`🆔 Bunny Video ID: ${updatedComment[0].bunnyVideoId}`);
    } else {
      console.log(`❌ RESULT: Video comment status: ${updatedComment[0].processingStatus}`);
      console.log(`💡 Reason: ${updatedComment[0].flaggedReason}`);
    }
    
  } catch (error) {
    console.error('❌ ERROR during video comment processor test:', error);
  }
}

testVideoCommentUnifiedProcessor();