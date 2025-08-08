/**
 * DEBUG: Gesture Detection Failure Analysis
 * 
 * This script analyzes why the enhanced gesture detection is not working
 * and provides detailed information about what the AI system is actually detecting.
 */

import { Storage } from '@google-cloud/storage';
import { VideoIntelligenceServiceClient } from '@google-cloud/video-intelligence';

async function debugGestureDetectionFailure() {
  console.log('🔍 DEBUG: Starting gesture detection failure analysis...');
  
  try {
    // Test the latest video that should have been flagged
    const videoId = '444c00f8-28c2-4d91-bd04-a410d2c68255';
    const bunnyVideoId = '4d307134-d9f4-45d6-95b6-80bacfc755a3';
    const gcsUri = `gs://jemzy-video-moderation-steam-house-461401-t7/raw-videos/${videoId}.webm`;
    
    console.log(`🎯 DEBUG: Analyzing video ${videoId} (Bunny: ${bunnyVideoId})`);
    console.log(`🎯 DEBUG: Expected GCS location: ${gcsUri}`);
    
    // Initialize Google Cloud credentials
    const credentials = JSON.parse(process.env.CONTENT_MODERATION_WORKER_JUN_26_2025);
    
    // Test 1: Check if file exists in GCS
    console.log('\n📁 TEST 1: Checking GCS file existence...');
    const storage = new Storage({
      credentials: credentials,
      projectId: credentials.project_id
    });
    
    const bucketName = 'jemzy-video-moderation-steam-house-461401-t7';
    const fileName = `raw-videos/${videoId}.webm`;
    
    try {
      const [exists] = await storage.bucket(bucketName).file(fileName).exists();
      console.log(`📁 GCS File exists: ${exists}`);
      
      if (exists) {
        const [metadata] = await storage.bucket(bucketName).file(fileName).getMetadata();
        console.log(`📁 File size: ${metadata.size} bytes`);
        console.log(`📁 Content type: ${metadata.contentType}`);
        console.log(`📁 Created: ${metadata.timeCreated}`);
      }
    } catch (gcsError) {
      console.error(`❌ GCS Error: ${gcsError.message}`);
    }
    
    // Test 2: Attempt Video Intelligence Analysis
    console.log('\n🎥 TEST 2: Running Video Intelligence analysis...');
    const videoIntelligence = new VideoIntelligenceServiceClient({
      credentials: credentials,
      projectId: credentials.project_id
    });
    
    try {
      console.log('🎥 Starting person detection analysis...');
      
      const request = {
        inputUri: gcsUri,
        features: ['PERSON_DETECTION'],
        videoContext: {
          personDetectionConfig: {
            includeBoundingBoxes: true,
            includePoseLandmarks: true,
            includeAttributes: true
          }
        }
      };
      
      const [operation] = await videoIntelligence.annotateVideo(request);
      console.log('🎥 Video Intelligence operation started...');
      
      const [result] = await operation.promise();
      console.log('🎥 Video Intelligence analysis completed');
      
      // Analyze results for gesture detection
      if (result.annotationResults && result.annotationResults[0]) {
        const annotations = result.annotationResults[0];
        
        console.log('\n📊 ANALYSIS RESULTS:');
        
        // Check person detection
        if (annotations.personDetectionAnnotations) {
          console.log(`👤 Persons detected: ${annotations.personDetectionAnnotations.length}`);
          
          annotations.personDetectionAnnotations.forEach((person, index) => {
            console.log(`\n👤 Person ${index + 1}:`);
            console.log(`   Tracks: ${person.tracks?.length || 0}`);
            
            if (person.tracks) {
              person.tracks.forEach((track, trackIndex) => {
                console.log(`   Track ${trackIndex + 1}: ${track.timestampedObjects?.length || 0} timestamped objects`);
                
                // Check for pose landmarks in each timestamped object
                if (track.timestampedObjects) {
                  track.timestampedObjects.forEach((obj, objIndex) => {
                    if (obj.landmarks && obj.landmarks.length > 0) {
                      console.log(`     Object ${objIndex + 1}: ${obj.landmarks.length} landmarks detected`);
                      
                      // Look for hand/wrist landmarks
                      const handLandmarks = obj.landmarks.filter(landmark => 
                        landmark.name && (
                          landmark.name.toLowerCase().includes('wrist') ||
                          landmark.name.toLowerCase().includes('hand') ||
                          landmark.name.toLowerCase().includes('finger')
                        )
                      );
                      
                      if (handLandmarks.length > 0) {
                        console.log(`     🤲 Hand-related landmarks found: ${handLandmarks.length}`);
                        handLandmarks.forEach(landmark => {
                          console.log(`       - ${landmark.name}: confidence ${landmark.confidence}`);
                        });
                      } else {
                        console.log(`     ❌ No hand-related landmarks found in this object`);
                      }
                    } else {
                      console.log(`     ❌ No landmarks found in object ${objIndex + 1}`);
                    }
                  });
                }
              });
            }
          });
        } else {
          console.log('❌ No person detection annotations found');
        }
        
        // Check other annotation types
        console.log('\n📋 OTHER ANNOTATIONS:');
        console.log(`Explicit content: ${annotations.explicitAnnotation ? 'Present' : 'None'}`);
        console.log(`Speech transcription: ${annotations.speechTranscriptions?.length || 0} segments`);
        console.log(`Face detection: ${annotations.faceDetectionAnnotations?.length || 0} faces`);
        
      } else {
        console.log('❌ No annotation results found');
      }
      
    } catch (videoError) {
      console.error(`❌ Video Intelligence Error: ${videoError.message}`);
      console.error(`Error details:`, videoError);
    }
    
    // Test 3: Check what the uploadFirstProcessor actually detected
    console.log('\n🔧 TEST 3: Checking processing logs...');
    console.log('(This would require access to the actual processing logs from when the video was analyzed)');
    
    console.log('\n📋 SUMMARY:');
    console.log('1. The gesture detection relies on Video Intelligence API person detection');
    console.log('2. It looks for pose landmarks, specifically wrist positions relative to shoulders');
    console.log('3. If no landmarks are detected, gestures cannot be identified');
    console.log('4. The system may need additional Vision API calls for static frame analysis');
    
  } catch (error) {
    console.error('❌ Debug analysis failed:', error);
  }
}

// Run the analysis
debugGestureDetectionFailure().catch(console.error);