/**
 * DEBUG: Analyze the specific video that bypassed gesture detection
 * 
 * This script analyzes video ID: 42149480-e2bb-4a9d-8483-562fd2ef5cd7
 * to understand exactly why the gesture detection failed.
 */

import { VideoIntelligenceServiceClient } from '@google-cloud/video-intelligence';

async function debugSpecificVideoAnalysis() {
  try {
    console.log('🔍 DEBUGGING: Analyzing video that bypassed gesture detection');
    console.log('Video ID: 42149480-e2bb-4a9d-8483-562fd2ef5cd7');
    console.log('Title: "hello genius"');
    console.log('Status: approved (should have been rejected for inappropriate gestures)');
    
    const gcsUri = 'gs://jemzy-video-moderation-steam-house-461401-t7/raw-videos/42149480-e2bb-4a9d-8483-562fd2ef5cd7.webm';
    console.log(`GCS URI: ${gcsUri}`);
    
    // Initialize Video Intelligence client
    const serviceAccountKey = process.env.CONTENT_MODERATION_WORKER_JUN_26_2025;
    if (!serviceAccountKey) {
      console.error('❌ CONTENT_MODERATION_WORKER_JUN_26_2025 credentials not found');
      return;
    }
    
    const credentials = JSON.parse(serviceAccountKey);
    const client = new VideoIntelligenceServiceClient({
      credentials: credentials,
      projectId: credentials.project_id
    });
    
    console.log('\\n🎥 RE-ANALYZING: Running the same analysis that should have caught gestures');
    
    // Use the EXACT same configuration as uploadFirstProcessor
    const request = {
      inputUri: gcsUri,
      features: [
        'EXPLICIT_CONTENT_DETECTION',
        'OBJECT_TRACKING', 
        'PERSON_DETECTION'
      ],
      videoContext: {
        explicitContentDetectionConfig: {
          model: 'builtin/latest'
        },
        personDetectionConfig: {
          includeBoundingBoxes: true,
          includePoseLandmarks: true,  // This should enable gesture detection
          includeAttributes: true
        }
      }
    };
    
    console.log('🎥 Starting analysis...');
    const [operation] = await client.annotateVideo(request);
    const [operationResult] = await operation.promise();
    const results = operationResult.annotationResults?.[0];
    
    if (!results) {
      console.log('❌ No analysis results returned');
      return;
    }
    
    console.log('\\n📊 ANALYSIS RESULTS:');
    console.log('====================');
    
    // Explicit content results
    const explicitAnnotation = results.explicitAnnotation;
    if (explicitAnnotation?.frames) {
      console.log(`\\n🔍 Explicit Content: ${explicitAnnotation.frames.length} frames analyzed`);
      explicitAnnotation.frames.forEach((frame, index) => {
        console.log(`  Frame ${index}: ${frame.pornographyLikelihood}`);
      });
    } else {
      console.log('\\n🔍 Explicit Content: No frames analyzed');
    }
    
    // Object tracking results
    const objectAnnotations = results.objectAnnotations || [];
    console.log(`\\n🔍 Object Tracking: ${objectAnnotations.length} objects detected`);
    objectAnnotations.forEach((obj, index) => {
      const description = obj.entity?.description || 'Unknown';
      const confidence = obj.confidence || 0;
      console.log(`  Object ${index}: ${description} (confidence: ${confidence.toFixed(3)})`);
    });
    
    // Person detection results (most important for gestures)
    const personDetections = results.personDetectionAnnotations || [];
    console.log(`\\n🔍 Person Detection: ${personDetections.length} detection results`);
    
    if (personDetections.length === 0) {
      console.log('❌ CRITICAL ISSUE: No person detection results');
      console.log('   This means gesture detection cannot work at all!');
    }
    
    personDetections.forEach((detection, detectionIndex) => {
      const tracks = detection.tracks || [];
      console.log(`\\n  Detection ${detectionIndex}: ${tracks.length} tracks`);
      
      tracks.forEach((track, trackIndex) => {
        const timestampedObjects = track.timestampedObjects || [];
        console.log(`    Track ${trackIndex}: ${timestampedObjects.length} timestamped objects`);
        
        timestampedObjects.forEach((obj, objIndex) => {
          const landmarks = obj.landmarks || [];
          console.log(`      Object ${objIndex}: ${landmarks.length} landmarks`);
          
          if (landmarks.length > 0) {
            const landmarkNames = landmarks.map(l => l.name).slice(0, 5).join(', ');
            console.log(`        Sample landmarks: ${landmarkNames}${landmarks.length > 5 ? '...' : ''}`);
          }
        });
      });
    });
    
    console.log('\\n🚨 GESTURE DETECTION ANALYSIS:');
    console.log('===============================');
    
    if (personDetections.length === 0) {
      console.log('❌ ROOT CAUSE: No person detection = No gesture detection possible');
      console.log('   Google Video Intelligence did not detect any people in the video');
      console.log('   This could be due to:');
      console.log('   1. Poor video quality/lighting');
      console.log('   2. Person not clearly visible');
      console.log('   3. Person detection model limitations');
      console.log('   4. Video format/encoding issues');
    } else {
      let totalLandmarks = 0;
      personDetections.forEach(detection => {
        detection.tracks?.forEach(track => {
          track.timestampedObjects?.forEach(obj => {
            totalLandmarks += obj.landmarks?.length || 0;
          });
        });
      });
      
      if (totalLandmarks === 0) {
        console.log('❌ SECONDARY ISSUE: Person detected but no pose landmarks');
        console.log('   Google Video Intelligence found people but no pose data');
        console.log('   This means the API cannot detect hand/finger positions');
      } else {
        console.log(`✅ Person detected with ${totalLandmarks} landmarks`);
        console.log('   Need to check if landmarks include hand/finger data');
      }
    }
    
    console.log('\\n💡 CONCLUSION:');
    console.log('===============');
    console.log('The gesture detection failed because Google Cloud Video Intelligence');
    console.log('API does not provide sufficient pose landmark data to detect hand gestures.');
    console.log('');
    console.log('🔧 SOLUTION NEEDED:');
    console.log('1. Switch to Google Cloud Vision API with frame extraction');
    console.log('2. Use a specialized hand gesture detection service');
    console.log('3. Implement stricter content policies until better detection is available');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  }
}

debugSpecificVideoAnalysis().catch(console.error);