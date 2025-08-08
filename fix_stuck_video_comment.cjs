/**
 * FIX: Process stuck video comment
 * 
 * This script manually processes the video comment that got stuck in processing status
 */

import fs from 'fs';
import * as path from "node:path";
import { Storage } from '@google-cloud/storage';

async function fixStuckVideoComment() {
  console.log('🔧 FIX: Processing stuck thread video comment 83...');
  
  // First, let's check what temp files exist
  const tempDir = 'uploads/temp-uploads';
  const files = fs.readdirSync(tempDir).filter(f => f.includes('530c752f-230c-48fc-bdb6-a4933e92f998'));
  
  console.log('📁 Found temp files:', files);
  
  if (files.length === 0) {
    console.log('❌ No temp files found for upload ID 530c752f-230c-48fc-bdb6-a4933e92f998');
    return;
  }
  
  const tempFile = files[0];
  const tempFilePath = path.join(tempDir, tempFile);
  const stats = fs.statSync(tempFilePath);
  
  console.log('📊 Temp file details:');
  console.log('  - Path:', tempFilePath);
  console.log('  - Size:', stats.size, 'bytes');
  console.log('  - Created:', stats.birthtime);
  
  // The issue is likely that thread message 83 is being processed immediately and failing
  // Let's create a simple test to upload this file to GCS and see what happens
  
  try {
    console.log('🎯 Attempting to manually process the file...');
    
    // Import the required modules dynamically
    
    
    // Initialize Google Cloud Storage
    const credentials = JSON.parse(process.env.CONTENT_MODERATION_WORKER_JUN_26_2025);
    const storage = new Storage({
      projectId: credentials.project_id,
      credentials: credentials
    });
    
    const bucket = storage.bucket('jemzy-video-moderation-steam-house-461401-t7');
    const fileName = `thread-messages/530c752f-230c-48fc-bdb6-a4933e92f998.webm`;
    const file = bucket.file(fileName);
    
    console.log('☁️ Uploading to GCS:', fileName);
    
    await file.save(fs.readFileSync(tempFilePath), {
      metadata: {
        contentType: 'video/webm'
      }
    });
    
    console.log('✅ Successfully uploaded to GCS');
    
    // Get the GCS URI
    const gcsUri = `gs://jemzy-video-moderation-steam-house-461401-t7/${fileName}`;
    console.log('📍 GCS URI:', gcsUri);
    
    console.log('🎯 The file upload worked, so the issue is likely in the AI moderation step');
    
  } catch (error) {
    console.error('❌ Manual processing failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

fixStuckVideoComment().catch(console.error);