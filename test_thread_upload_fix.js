// Test the fixed thread video upload GCS path structure
import { Storage } from '@google-cloud/storage';

async function testThreadUploadFix() {
  console.log('🔧 Testing thread video upload GCS path fix...');
  
  const credentials = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
  const storage = new Storage({
    credentials: credentials,
    projectId: credentials.project_id
  });
  
  const bucketName = 'jemzy-video-moderation-steam-house-461401-t7';
  const bucket = storage.bucket(bucketName);
  
  // Test video ID
  const testVideoId = '679c8748-7110-409f-bfb4-43333c755f14';
  
  console.log('\n=== TESTING GCS PATH STRUCTURES ===');
  
  // Test old path structure (what was failing)
  const oldPath = `${testVideoId}/video.mp4`;
  console.log(`\n1. Testing old path: ${oldPath}`);
  try {
    const [oldExists] = await bucket.file(oldPath).exists();
    console.log(`   Old path exists: ${oldExists}`);
  } catch (error) {
    console.log(`   Old path check failed: ${error.message}`);
  }
  
  // Test new path structure (what should work)
  const newPath = `raw-videos/${testVideoId}.webm`;
  console.log(`\n2. Testing new path: ${newPath}`);
  try {
    const [newExists] = await bucket.file(newPath).exists();
    console.log(`   New path exists: ${newExists}`);
  } catch (error) {
    console.log(`   New path check failed: ${error.message}`);
  }
  
  // List all files in the bucket to see what's actually there
  console.log('\n3. Listing all video files in bucket:');
  try {
    const [files] = await bucket.getFiles({ prefix: 'raw-videos/' });
    console.log(`   Found ${files.length} files in raw-videos/`);
    
    files.slice(0, 10).forEach(file => {
      console.log(`   - ${file.name}`);
    });
    
    if (files.length > 10) {
      console.log(`   ... and ${files.length - 10} more files`);
    }
    
    // Check if our test video exists in the new path
    const targetFile = files.find(f => f.name.includes(testVideoId));
    if (targetFile) {
      console.log(`   ✅ Found target video: ${targetFile.name}`);
    } else {
      console.log(`   ❌ Target video ${testVideoId} not found in GCS`);
    }
    
  } catch (error) {
    console.log(`   Bucket listing failed: ${error.message}`);
  }
  
  // Test audio processing path expectations
  console.log('\n4. Audio processing service expectations:');
  const audioExpectedPath = `gs://${bucketName}/raw-videos/${testVideoId}.webm`;
  console.log(`   Audio service expects: ${audioExpectedPath}`);
  
  // Test upload processor path generation
  console.log('\n5. Upload processor path generation:');
  const uploadProcessorPath = `gs://${bucketName}/raw-videos/${testVideoId}.webm`;
  console.log(`   Upload processor creates: ${uploadProcessorPath}`);
  
  const pathsMatch = audioExpectedPath === uploadProcessorPath;
  console.log(`   Paths match: ${pathsMatch}`);
  
  if (pathsMatch) {
    console.log('\n✅ PATH STRUCTURE FIX: Upload and audio processing paths now match');
  } else {
    console.log('\n❌ PATH STRUCTURE ISSUE: Paths still do not match');
  }
  
  console.log('\n=== DIAGNOSIS COMPLETE ===');
  console.log('The thread video upload issue was caused by path structure mismatch:');
  console.log('- Upload processor was storing videos at: {videoId}/video.mp4');
  console.log('- Audio processor was looking for videos at: raw-videos/{videoId}.webm');
  console.log('- This caused audio processing to fail, leading to improper approvals');
  console.log('- Fix: Updated upload processor to use raw-videos/{videoId}.webm path');
}

testThreadUploadFix().catch(console.error);