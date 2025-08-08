import fs from 'fs';
import * as path from "node:path";

async function debugVideoCommentFailure() {
  try {
    console.log('🔍 DEBUGGING: Starting video comment failure analysis...');
    
    // Import the video comment moderator
    const { videoCommentModerator } = await import('./server/videoCommentModerator.ts');
    
    // Test with a simple valid video file (we'll create a tiny test video)
    const testVideoPath = '/tmp/test_video_comment.webm';
    
    // Create a minimal WebM header for testing
    const minimalWebMHeader = Buffer.from([
      0x1A, 0x45, 0xDF, 0xA3, // EBML Header
      0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1F, // Header size
      0x42, 0x86, 0x81, 0x01, // EBML Version = 1
      0x42, 0xF7, 0x81, 0x01, // EBML Read Version = 1
      0x42, 0xF2, 0x81, 0x04, // EBML Max ID Length = 4
      0x42, 0xF3, 0x81, 0x08, // EBML Max Size Length = 8
      0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6D, // Doc Type = "webm"
      0x42, 0x87, 0x81, 0x02, // Doc Type Version = 2
      0x42, 0x85, 0x81, 0x02  // Doc Type Read Version = 2
    ]);
    
    fs.writeFileSync(testVideoPath, minimalWebMHeader);
    console.log('🎥 Test video file created');
    
    // Test the processing pipeline
    console.log('🔍 TESTING: Video comment moderation...');
    
    const result = await videoCommentModerator.processVideoComment(testVideoPath, {
      commentId: 999,
      userId: 'test-user-123',
      enableGCSUpload: false,  // Skip GCS upload for testing
      enableVideoAnalysis: true,
      enableAudioAnalysis: false  // Skip audio to isolate video issues
    });
    
    console.log('📊 RESULT:', JSON.stringify(result, null, 2));
    
    // Clean up
    if (fs.existsSync(testVideoPath)) {
      fs.unlinkSync(testVideoPath);
      console.log('🧹 Test file cleaned up');
    }
    
  } catch (error) {
    console.error('❌ DEBUG FAILED:', error);
    console.error('Stack trace:', error.stack);
  }
}

debugVideoCommentFailure();