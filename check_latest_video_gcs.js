/**
 * CHECK: Latest video GCS file existence
 * 
 * Check if the latest uploaded video actually exists in GCS
 */

import { Storage } from '@google-cloud/storage';

async function checkLatestVideoGCS() {
  try {
    console.log('🔍 CHECKING: Latest video GCS file existence');
    
    const latestVideoId = '42340ad8-8821-4964-84ae-c8f90d6e3042';
    const gcsUri = 'gs://jemzy-video-moderation-steam-house-461401-t7/raw-videos/42340ad8-8821-4964-84ae-c8f90d6e3042.webm';
    
    console.log(`Video ID: ${latestVideoId}`);
    console.log(`Title: "Love you" (uploaded at 01:09:17)`);
    console.log(`Status: approved`);
    console.log(`Bunny ID: 460d1f2b-a09b-49f4-a231-2b922ecda1e4`);
    console.log(`GCS URI: ${gcsUri}`);
    
    // Initialize storage
    const contentModerationCredentials = process.env.CONTENT_MODERATION_WORKER_JUN_26_2025;
    if (!contentModerationCredentials) {
      console.error('❌ Credentials not found');
      return;
    }
    
    const credentials = JSON.parse(contentModerationCredentials);
    const storage = new Storage({
      credentials: credentials,
      projectId: credentials.project_id
    });
    
    // Check if file exists
    const bucket = storage.bucket('jemzy-video-moderation-steam-house-461401-t7');
    const file = bucket.file(`raw-videos/${latestVideoId}.webm`);
    
    const [exists] = await file.exists();
    
    console.log('\\n🎯 RESULT:');
    console.log('==========');
    if (exists) {
      console.log('✅ File EXISTS in GCS - AI analysis should have happened');
      const [metadata] = await file.getMetadata();
      console.log(`   File size: ${metadata.size} bytes`);
      console.log(`   Created: ${metadata.timeCreated}`);
    } else {
      console.log('❌ File MISSING from GCS - SECURITY BREACH CONFIRMED');
      console.log('🚨 This video bypassed GCS upload and AI analysis completely');
      console.log('🚨 Yet it reached Bunny.net CDN and shows as "approved"');
    }
    
    console.log('\\n🔍 ANALYSIS:');
    console.log('=============');
    console.log('The upload clearly went to /api/videos/upload-binary (we saw the frontend logs)');
    console.log('But there are no server logs showing the binary upload route was hit');
    console.log('This suggests either:');
    console.log('1. Server restart occurred during upload');
    console.log('2. Log buffering issue hiding the real logs');
    console.log('3. Request went to a different server/process');
    console.log('4. Route handler failed silently');
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkLatestVideoGCS().catch(console.error);