/**
 * TRIGGER UPLOAD ERROR: Direct database test
 * 
 * This directly tests the database update part of uploadFirstProcessor
 * to capture the real error that's being sanitized.
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { videos, moderationDecisions } from './shared/schema.js.js';
import { eq } from 'drizzle-orm';

async function triggerUploadError() {
  console.log('🔍 TESTING: Database Update Error');
  console.log('=================================');
  
  try {
    const sql = neon(process.env.DATABASE_URL);
    const db = drizzle(sql);
    
    // Try to create a test video record that would trigger the error
    console.log('\n📋 Step 1: Creating test video record');
    
    const testVideoId = 'test-error-debug-video';
    
    // Insert a test video first
    await db.insert(videos).values({
      id: testVideoId,
      userId: 'test-user',
      title: 'Debug Error Test',
      description: 'Testing database error',
      category: 'test',
      latitude: 36.0571,
      longitude: -94.1606,
      visibility: 'public',
      processingStatus: 'processing',
      gcsUri: 'gs://test-bucket/test-video.mp4',
      duration: 5
    }).onConflictDoNothing();
    
    console.log('✅ Test video record created');
    
    // Now try to update it with approved status
    console.log('\n📋 Step 2: Attempting database update that fails');
    
    try {
      // This should be the same update that's failing in uploadFirstProcessor
      await db.update(videos)
        .set({
          processingStatus: 'approved',
          bunnyVideoId: 'test-bunny-id',
          videoUrl: 'https://test-video-url.mp4',
          thumbnailUrl: 'https://test-thumbnail-url.jpg',
          duration: 5
        })
        .where(eq(videos.id, testVideoId));
      
      console.log('✅ Database update successful - no error found');
      
    } catch (updateError) {
      console.error('🎯 CAPTURED THE REAL ERROR:');
      console.error('Type:', updateError.constructor.name);
      console.error('Message:', updateError.message);
      console.error('Stack:', updateError.stack);
      
      if (updateError.message.includes('analysis_completed_at')) {
        console.log('🔍 ISSUE: References non-existent analysisCompletedAt column');
      }
      if (updateError.message.includes('security_check_trigger')) {
        console.log('🔍 ISSUE: Database security trigger is blocking update');
      }
    }
    
    // Clean up test data
    await db.delete(videos).where(eq(videos.id, testVideoId));
    console.log('🧹 Test data cleaned up');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

triggerUploadError();