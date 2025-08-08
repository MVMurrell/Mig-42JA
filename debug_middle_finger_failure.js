import { Storage } from '@google-cloud/storage';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as path from "node:path";

async function debugMiddleFingerDetection() {
  try {
    console.log('🔍 INVESTIGATING: Middle finger detection failure');
    
    // Initialize Google Cloud services
    const serviceAccountKey = process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      throw new Error('GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY not found');
    }
    
    const credentials = JSON.parse(serviceAccountKey);
    const gcsStorage = new Storage({
      credentials: credentials,
      projectId: credentials.project_id
    });
    
    const visionClient = new ImageAnnotatorClient({
      credentials: credentials,
      projectId: credentials.project_id
    });

    // Target the specific video that should have been flagged
    const bunnyVideoId = '1ceb1bba-e60b-45d4-9dc4-4fb264c369d0';
    const gcsUri = `gs://jemzy-video-moderation-steam-house-461401-t7/raw-videos/${bunnyVideoId}.webm`;
    
    console.log(`🎥 ANALYZING: Video ${bunnyVideoId} that should have been flagged`);
    console.log(`📍 GCS URI: ${gcsUri}`);

    // Check if video exists in GCS
    const match = gcsUri.match(/gs:\/\/([^\/]+)\/(.+)/);
    if (!match) {
      throw new Error('Invalid GCS URI format');
    }
    
    const [, bucketName, filePath] = match;
    const bucket = gcsStorage.bucket(bucketName);
    const file = bucket.file(filePath);
    
    console.log(`🔍 CHECKING: File existence in GCS bucket ${bucketName}`);
    const [exists] = await file.exists();
    if (!exists) {
      console.log(`❌ CRITICAL: Video file not found in GCS: ${gcsUri}`);
      return;
    }
    
    console.log(`✅ CONFIRMED: Video file exists in GCS`);
    
    // Download video for frame extraction
    const tempVideoPath = `/tmp/middle-finger-debug-${bunnyVideoId}.mp4`;
    console.log(`⬇️ DOWNLOADING: Video to ${tempVideoPath}`);
    await file.download({ destination: tempVideoPath });
    
    // Extract multiple frames for analysis
    const frameBuffers = [];
    const maxFrames = 10; // Extract more frames for thorough analysis
    
    console.log(`🎬 EXTRACTING: ${maxFrames} frames for detailed analysis`);
    
    for (let i = 0; i < maxFrames; i++) {
      const frameTime = i * 0.5; // Every 0.5 seconds for more coverage
      const framePath = `/tmp/debug-frame-${i}.jpg`;
      
      console.log(`📸 FRAME ${i + 1}: Extracting at ${frameTime}s`);
      
      const success = await extractFrame(tempVideoPath, framePath, frameTime);
      if (success) {
        try {
          const frameBuffer = await fs.readFile(framePath);
          frameBuffers.push({ buffer: frameBuffer, frameIndex: i, timeStamp: frameTime });
          await fs.unlink(framePath);
          console.log(`✅ FRAME ${i + 1}: Successfully extracted (${frameBuffer.length} bytes)`);
        } catch (error) {
          console.log(`❌ FRAME ${i + 1}: Failed to read frame file`);
        }
      } else {
        console.log(`❌ FRAME ${i + 1}: Extraction failed`);
      }
    }
    
    console.log(`🔍 ANALYZING: ${frameBuffers.length} extracted frames with Google Vision API`);
    
    // Analyze each frame with detailed logging
    for (const frameData of frameBuffers) {
      const { buffer, frameIndex, timeStamp } = frameData;
      
      console.log(`\n👁️ VISION API: Analyzing frame ${frameIndex + 1} (timestamp: ${timeStamp}s)`);
      
      try {
        const [result] = await visionClient.annotateImage({
          image: { content: buffer },
          features: [
            { type: 'OBJECT_LOCALIZATION', maxResults: 50 },
            { type: 'SAFE_SEARCH_DETECTION' },
            { type: 'LABEL_DETECTION', maxResults: 50 },
            { type: 'FACE_DETECTION', maxResults: 20 }
          ]
        });
        
        // Log safe search results
        const safeSearch = result.safeSearchAnnotation;
        if (safeSearch) {
          console.log(`🔍 FRAME ${frameIndex + 1} SAFE SEARCH:`);
          console.log(`   Adult: ${safeSearch.adult}`);
          console.log(`   Violence: ${safeSearch.violence}`);
          console.log(`   Racy: ${safeSearch.racy}`);
          console.log(`   Spoof: ${safeSearch.spoof}`);
          console.log(`   Medical: ${safeSearch.medical}`);
        }
        
        // Log all object detections
        const objects = result.localizedObjectAnnotations || [];
        console.log(`🔍 FRAME ${frameIndex + 1} OBJECTS (${objects.length} detected):`);
        objects.forEach((object, idx) => {
          console.log(`   ${idx + 1}. ${object.name} (confidence: ${(object.score * 100).toFixed(1)}%)`);
        });
        
        // Log all labels
        const labels = result.labelAnnotations || [];
        console.log(`🔍 FRAME ${frameIndex + 1} LABELS (${labels.length} detected):`);
        labels.forEach((label, idx) => {
          console.log(`   ${idx + 1}. ${label.description} (confidence: ${(label.score * 100).toFixed(1)}%)`);
        });
        
        // Log face detections
        const faces = result.faceAnnotations || [];
        console.log(`🔍 FRAME ${frameIndex + 1} FACES (${faces.length} detected):`);
        faces.forEach((face, idx) => {
          console.log(`   ${idx + 1}. Joy: ${face.joyLikelihood}, Anger: ${face.angerLikelihood}, Surprise: ${face.surpriseLikelihood}`);
        });
        
        // Check for hand/finger related detections
        const handRelated = [];
        
        objects.forEach(obj => {
          const name = obj.name?.toLowerCase() || '';
          if (name.includes('hand') || name.includes('finger') || name.includes('gesture')) {
            handRelated.push({ type: 'object', name: obj.name, score: obj.score });
          }
        });
        
        labels.forEach(label => {
          const desc = label.description?.toLowerCase() || '';
          if (desc.includes('hand') || desc.includes('finger') || desc.includes('gesture') || 
              desc.includes('pointing') || desc.includes('sign') || desc.includes('rude')) {
            handRelated.push({ type: 'label', name: label.description, score: label.score });
          }
        });
        
        if (handRelated.length > 0) {
          console.log(`🚨 FRAME ${frameIndex + 1} HAND/GESTURE RELATED DETECTIONS:`);
          handRelated.forEach((item, idx) => {
            console.log(`   ${idx + 1}. [${item.type.toUpperCase()}] ${item.name} (confidence: ${(item.score * 100).toFixed(1)}%)`);
          });
        } else {
          console.log(`❌ FRAME ${frameIndex + 1}: NO hand/gesture related detections found`);
        }
        
      } catch (frameError) {
        console.log(`❌ FRAME ${frameIndex + 1}: Vision API analysis failed - ${frameError.message}`);
      }
    }
    
    // Clean up
    await fs.unlink(tempVideoPath);
    
    console.log('\n📊 ANALYSIS SUMMARY:');
    console.log(`   - Video ID: ${bunnyVideoId}`);
    console.log(`   - Frames analyzed: ${frameBuffers.length}`);
    console.log(`   - Current detection thresholds:`);
    console.log(`     • Hand gesture confidence: > 0.3`);
    console.log(`     • Hand area threshold: > 0.01`);
    console.log(`     • Label confidence: > 0.4`);
    
    console.log('\n🔧 POTENTIAL ISSUES:');
    console.log('   1. Detection thresholds may be too high');
    console.log('   2. Middle finger gesture not recognized as "inappropriate"');
    console.log('   3. Frame extraction timing might miss the gesture');
    console.log('   4. Google Vision API might not detect middle finger as offensive');
    
  } catch (error) {
    console.error('❌ DEBUG FAILED:', error);
  }
}

function extractFrame(videoPath, outputPath, timeStamp) {
  return new Promise((resolve) => {
    const ffmpeg = spawn('ffmpeg', [
      '-y', // Overwrite output files
      '-i', videoPath,
      '-ss', timeStamp.toString(),
      '-vframes', '1',
      '-q:v', '2', // High quality
      '-f', 'image2',
      outputPath
    ], { stdio: 'pipe' });

    ffmpeg.on('close', (code) => {
      resolve(code === 0);
    });

    ffmpeg.on('error', () => {
      resolve(false);
    });
  });
}

// Run the debug analysis
debugMiddleFingerDetection()
  .then(() => {
    console.log('\n✅ DEBUG ANALYSIS COMPLETED');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ DEBUG ANALYSIS FAILED:', error);
    process.exit(1);
  });