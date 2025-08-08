/**
 * CRITICAL INVESTIGATION: Why Gesture Detection Failed
 * 
 * This script analyzes the specific video with inappropriate hand gestures
 * to understand why the AI moderation system approved it.
 */

import { Storage } from '@google-cloud/storage';
import { VideoIntelligenceServiceClient } from '@google-cloud/video-intelligence';

async function investigateFailedGestureDetection() {
  console.log('🔍 INVESTIGATING: Failed gesture detection for video cfa439bf-8ae0-4974-8c9c-d89f7082c374');
  
  const videoId = 'cfa439bf-8ae0-4974-8c9c-d89f7082c374';
  const gcsUri = `gs://jemzy-video-moderation-steam-house-461401-t7/raw-videos/${videoId}.webm`;
  
  try {
    // Initialize Google Cloud services with proper credentials
    const credentials = JSON.parse(process.env.CONTENT_MODERATION_WORKER_JUN_26_2025);
    
    const storage = new Storage({
      credentials,
      projectId: credentials.project_id || 'steam-house-461401-t7'
    });
    
    const videoClient = new VideoIntelligenceServiceClient({
      credentials,
      projectId: credentials.project_id || 'steam-house-461401-t7'
    });
    
    console.log('📁 Step 1: Verify video exists in GCS...');
    
    // Check if video file exists
    const bucket = storage.bucket('jemzy-video-moderation-steam-house-461401-t7');
    const file = bucket.file(`raw-videos/${videoId}.webm`);
    
    const [exists] = await file.exists();
    if (!exists) {
      console.error('❌ Video file not found in GCS - this explains the failure');
      return;
    }
    
    console.log('✅ Video file exists in GCS');
    
    // Get file metadata
    const [metadata] = await file.getMetadata();
    console.log(`📊 File size: ${(metadata.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📅 Created: ${metadata.timeCreated}`);
    
    console.log('\n🤖 Step 2: Re-run Video Intelligence API analysis...');
    
    // Re-run the exact gesture detection that should have caught this
    const request = {
      inputUri: gcsUri,
      features: [
        'PERSON_DETECTION',
        'EXPLICIT_CONTENT_DETECTION'
      ],
      videoContext: {
        personDetectionConfig: {
          includeBoundingBoxes: true,
          includePoseLandmarks: true,
          includeAttributes: true
        },
        explicitContentDetectionConfig: {
          model: 'latest'
        }
      }
    };
    
    console.log('🔄 Starting Video Intelligence analysis...');
    const [operation] = await videoClient.annotateVideo(request);
    console.log('⏳ Waiting for analysis to complete...');
    
    const [result] = await operation.promise();
    
    console.log('\n📋 ANALYSIS RESULTS:');
    console.log('==================');
    
    // Check explicit content detection
    if (result.annotationResults[0].explicitAnnotation) {
      const explicit = result.annotationResults[0].explicitAnnotation;
      console.log('🔞 Explicit Content Detection:');
      console.log(`   Likelihood: ${explicit.frames[0]?.pornographyLikelihood || 'UNKNOWN'}`);
      
      if (explicit.frames && explicit.frames.length > 0) {
        explicit.frames.slice(0, 5).forEach((frame, index) => {
          console.log(`   Frame ${index}: ${frame.pornographyLikelihood}`);
        });
      }
    }
    
    // Check person detection and pose landmarks
    if (result.annotationResults[0].personDetectionAnnotations) {
      const persons = result.annotationResults[0].personDetectionAnnotations;
      console.log(`\n👤 Person Detection: ${persons.length} person tracks found`);
      
      persons.forEach((person, personIndex) => {
        console.log(`\n   Person ${personIndex + 1}:`);
        
        if (person.tracks && person.tracks.length > 0) {
          const track = person.tracks[0];
          console.log(`     Track segments: ${track.segment ? 1 : 0}`);
          
          if (track.timestampedObjects) {
            console.log(`     Timestamped objects: ${track.timestampedObjects.length}`);
            
            // Check for pose landmarks in first few frames
            track.timestampedObjects.slice(0, 3).forEach((obj, objIndex) => {
              if (obj.landmarks && obj.landmarks.length > 0) {
                console.log(`     Frame ${objIndex}: ${obj.landmarks.length} landmarks detected`);
                
                // Check for hand landmarks specifically
                const handLandmarks = obj.landmarks.filter(landmark => 
                  landmark.name && (
                    landmark.name.includes('WRIST') || 
                    landmark.name.includes('THUMB') || 
                    landmark.name.includes('INDEX') ||
                    landmark.name.includes('MIDDLE') ||
                    landmark.name.includes('RING') ||
                    landmark.name.includes('PINKY')
                  )
                );
                
                if (handLandmarks.length > 0) {
                  console.log(`       Hand landmarks: ${handLandmarks.length} found`);
                  console.log(`       Sample landmarks: ${handLandmarks.slice(0, 3).map(l => l.name).join(', ')}`);
                } else {
                  console.log('       ⚠️ No hand landmarks detected in this frame');
                }
              } else {
                console.log(`     Frame ${objIndex}: No landmarks detected`);
              }
            });
          }
        }
      });
    } else {
      console.log('❌ No person detection results found');
    }
    
    console.log('\n🔍 ANALYSIS CONCLUSION:');
    console.log('======================');
    
    // Determine why gesture detection failed
    const hasPersons = result.annotationResults[0].personDetectionAnnotations && 
                      result.annotationResults[0].personDetectionAnnotations.length > 0;
    
    if (!hasPersons) {
      console.log('❌ ISSUE 1: Video Intelligence API did not detect any persons in the video');
      console.log('   This explains why gesture detection failed completely');
    } else {
      console.log('✅ Persons were detected in the video');
      
      let hasHandLandmarks = false;
      const persons = result.annotationResults[0].personDetectionAnnotations;
      
      for (const person of persons) {
        if (person.tracks) {
          for (const track of person.tracks) {
            if (track.timestampedObjects) {
              for (const obj of track.timestampedObjects) {
                if (obj.landmarks && obj.landmarks.some(l => l.name && l.name.includes('WRIST'))) {
                  hasHandLandmarks = true;
                  break;
                }
              }
            }
          }
        }
      }
      
      if (!hasHandLandmarks) {
        console.log('❌ ISSUE 2: No hand landmarks detected despite person detection');
        console.log('   The API may not be detecting hand poses in this video');
      } else {
        console.log('⚠️ ISSUE 3: Hand landmarks detected but gesture analysis failed');
        console.log('   This suggests the gesture detection logic needs improvement');
      }
    }
    
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('===================');
    console.log('1. The Video Intelligence API may have limitations with hand gesture detection');
    console.log('2. Consider supplementing with Google Vision API for frame-by-frame analysis');
    console.log('3. Implement multi-frame gesture validation');
    console.log('4. Add fallback detection methods for critical gestures');
    
  } catch (error) {
    console.error('❌ Investigation failed:', error);
    
    if (error.message.includes('permission') || error.message.includes('auth')) {
      console.log('\n🔧 This appears to be a credentials issue');
      console.log('   The gesture detection may have failed due to API access problems');
    } else if (error.message.includes('quota') || error.message.includes('limit')) {
      console.log('\n🔧 This appears to be a quota/limit issue');
      console.log('   The gesture detection may have failed due to API limits');
    } else {
      console.log('\n🔧 This appears to be a technical failure in the Video Intelligence API');
    }
  }
}

// Run the investigation
investigateFailedGestureDetection().catch(console.error);