/**
 * DEBUG: Gesture Detection Failure Analysis
 * 
 * This script analyzes why the enhanced gesture detection is not working
 * and provides detailed information about what the AI system is actually detecting.
 */

import { db } from './server/db.ts.js';
import { videos } from './shared/schema.ts.js';
import { desc } from 'drizzle-orm';
import { VideoIntelligenceServiceClient } from '@google-cloud/video-intelligence';

async function debugGestureDetectionFailure() {
  console.log('🔍 DEBUGGING: Why gesture detection failed for latest video...');
  
  try {
    // Get the latest video
    const [latestVideo] = await db.select()
      .from(videos)
      .orderBy(desc(videos.createdAt))
      .limit(1);
    
    if (!latestVideo) {
      console.log('❌ No videos found in database');
      return;
    }
    
    console.log(`\n📹 Analyzing video: ${latestVideo.id} - "${latestVideo.title}"`);
    console.log(`Status: ${latestVideo.processingStatus}`);
    console.log(`GCS URL: ${latestVideo.gcsProcessingUrl}`);
    console.log(`Has moderation results: ${!!latestVideo.moderationResults}`);
    
    if (!latestVideo.gcsProcessingUrl) {
      console.log('❌ No GCS URL - cannot analyze video content');
      return;
    }
    
    // Test the actual gesture detection system
    console.log('\n🧪 TESTING: Google Cloud Video Intelligence with Gesture Detection');
    console.log('='.repeat(70));
    
    const serviceAccountKey = process.env.CONTENT_MODERATION_WORKER_JUN_26_2025;
    if (!serviceAccountKey) {
      console.log('❌ CONTENT_MODERATION_WORKER_JUN_26_2025 credentials not found');
      return;
    }
    
    const credentials = JSON.parse(serviceAccountKey);
    const client = new VideoIntelligenceServiceClient({
      credentials: credentials,
      projectId: credentials.project_id
    });
    
    console.log(`✅ Google Cloud client initialized for project: ${credentials.project_id}`);
    
    // Configure the exact same request as production
    const request = {
      inputUri: latestVideo.gcsProcessingUrl,
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
          includePoseLandmarks: true,  // CRITICAL for gesture detection
          includeAttributes: true
        }
      }
    };
    
    console.log(`🎥 Starting analysis of: ${latestVideo.gcsProcessingUrl}`);
    console.log(`🎥 Features: ${request.features.join(', ')}`);
    console.log(`🎥 Person detection config: includePoseLandmarks = ${request.videoContext.personDetectionConfig.includePoseLandmarks}`);
    
    const [operation] = await client.annotateVideo(request);
    console.log('⏳ Waiting for analysis to complete...');
    
    const [operationResult] = await operation.promise();
    const results = operationResult.annotationResults?.[0];
    
    if (!results) {
      console.log('❌ No analysis results returned from Google Cloud');
      return;
    }
    
    console.log('\n📊 ANALYSIS RESULTS:');
    console.log('='.repeat(50));
    
    // Check explicit content
    const explicitAnnotation = results.explicitAnnotation;
    console.log(`Explicit content frames: ${explicitAnnotation?.frames?.length || 0}`);
    
    // Check object tracking
    const objectAnnotations = results.objectAnnotations || [];
    console.log(`Object annotations: ${objectAnnotations.length}`);
    objectAnnotations.forEach((obj, i) => {
      console.log(`  ${i + 1}. ${obj.entity?.description} (confidence: ${obj.confidence})`);
    });
    
    // Check person detection - THIS IS CRITICAL
    const personDetections = results.personDetectionAnnotations || [];
    console.log(`\n👥 PERSON DETECTIONS: ${personDetections.length}`);
    
    if (personDetections.length === 0) {
      console.log('❌ CRITICAL ISSUE: No person detections found!');
      console.log('   Without person detection, gesture detection cannot work.');
      console.log('   Possible causes:');
      console.log('   - Video quality too low');
      console.log('   - Person not clearly visible');
      console.log('   - Lighting conditions poor');
      console.log('   - Video too short or person not in frame long enough');
      return;
    }
    
    // Analyze each person detection in detail
    personDetections.forEach((detection, detectionIndex) => {
      console.log(`\n🕴️ Person Detection ${detectionIndex + 1}:`);
      
      const tracks = detection.tracks || [];
      console.log(`  Tracks: ${tracks.length}`);
      
      if (tracks.length === 0) {
        console.log('  ❌ No tracks found - cannot analyze gestures');
        return;
      }
      
      tracks.forEach((track, trackIndex) => {
        console.log(`\n  📍 Track ${trackIndex + 1}:`);
        console.log(`    Confidence: ${track.confidence}`);
        
        const timestampedObjects = track.timestampedObjects || [];
        console.log(`    Timestamped objects: ${timestampedObjects.length}`);
        
        if (timestampedObjects.length === 0) {
          console.log('    ❌ No timestamped objects - cannot get landmarks');
          return;
        }
        
        // Check landmarks in detail
        timestampedObjects.forEach((obj, objIndex) => {
          const landmarks = obj.landmarks || [];
          console.log(`    🔍 Object ${objIndex + 1}: ${landmarks.length} landmarks`);
          
          if (landmarks.length === 0) {
            console.log('      ❌ No pose landmarks found');
            return;
          }
          
          // List all landmark names
          console.log('      📍 Available landmarks:');
          landmarks.forEach((landmark, landmarkIndex) => {
            console.log(`        ${landmarkIndex + 1}. ${landmark.name} (x: ${landmark.point?.x?.toFixed(3)}, y: ${landmark.point?.y?.toFixed(3)})`);
          });
          
          // Test gesture analysis logic
          console.log('\n      🤲 GESTURE ANALYSIS TEST:');
          
          let leftWrist = null;
          let rightWrist = null;
          let leftShoulder = null;
          let rightShoulder = null;
          
          for (const landmark of landmarks) {
            const name = landmark.name?.toLowerCase() || '';
            
            if (name.includes('left_wrist') || name.includes('leftwrist')) {
              leftWrist = landmark;
            } else if (name.includes('right_wrist') || name.includes('rightwrist')) {
              rightWrist = landmark;
            } else if (name.includes('left_shoulder') || name.includes('leftshoulder')) {
              leftShoulder = landmark;
            } else if (name.includes('right_shoulder') || name.includes('rightshoulder')) {
              rightShoulder = landmark;
            }
          }
          
          console.log(`        Left wrist found: ${!!leftWrist}`);
          console.log(`        Right wrist found: ${!!rightWrist}`);
          console.log(`        Left shoulder found: ${!!leftShoulder}`);
          console.log(`        Right shoulder found: ${!!rightShoulder}`);
          
          // Test gesture detection logic
          if (leftWrist && leftShoulder) {
            const leftY = leftWrist.point?.y || 0;
            const shoulderY = leftShoulder.point?.y || 0;
            const elevated = leftY < shoulderY;
            const significant = Math.abs(leftY - shoulderY) > 0.1;
            
            console.log(`        Left hand analysis: y=${leftY.toFixed(3)}, shoulder=${shoulderY.toFixed(3)}, elevated=${elevated}, significant=${significant}`);
            
            if (elevated && significant) {
              console.log('        🚨 LEFT HAND: Would be flagged as inappropriate gesture!');
            } else {
              console.log('        ✅ LEFT HAND: No inappropriate gesture detected');
            }
          }
          
          if (rightWrist && rightShoulder) {
            const rightY = rightWrist.point?.y || 0;
            const shoulderY = rightShoulder.point?.y || 0;
            const elevated = rightY < shoulderY;
            const significant = Math.abs(rightY - shoulderY) > 0.1;
            
            console.log(`        Right hand analysis: y=${rightY.toFixed(3)}, shoulder=${shoulderY.toFixed(3)}, elevated=${elevated}, significant=${significant}`);
            
            if (elevated && significant) {
              console.log('        🚨 RIGHT HAND: Would be flagged as inappropriate gesture!');
            } else {
              console.log('        ✅ RIGHT HAND: No inappropriate gesture detected');
            }
          }
        });
        
        // Check attributes
        const attributes = track.attributes || [];
        console.log(`    🏷️ Attributes: ${attributes.length}`);
        attributes.forEach((attr, attrIndex) => {
          console.log(`      ${attrIndex + 1}. ${attr.name}: ${attr.confidence}`);
        });
      });
    });
    
    console.log('\n🔍 DIAGNOSIS:');
    console.log('='.repeat(40));
    
    if (personDetections.length === 0) {
      console.log('❌ ISSUE: No person detected in video');
      console.log('   SOLUTION: Ensure person is clearly visible and well-lit');
    } else {
      const totalTracks = personDetections.reduce((sum, det) => sum + (det.tracks?.length || 0), 0);
      const totalObjects = personDetections.reduce((sum, det) => 
        sum + (det.tracks || []).reduce((trackSum, track) => 
          trackSum + (track.timestampedObjects?.length || 0), 0), 0);
      const totalLandmarks = personDetections.reduce((sum, det) => 
        sum + (det.tracks || []).reduce((trackSum, track) => 
          trackSum + (track.timestampedObjects || []).reduce((objSum, obj) => 
            objSum + (obj.landmarks?.length || 0), 0), 0), 0);
      
      console.log(`✅ Person detection working: ${personDetections.length} persons`);
      console.log(`✅ Tracking working: ${totalTracks} tracks`);
      console.log(`✅ Timestamped objects: ${totalObjects}`);
      console.log(`${totalLandmarks > 0 ? '✅' : '❌'} Pose landmarks: ${totalLandmarks}`);
      
      if (totalLandmarks === 0) {
        console.log('❌ ISSUE: No pose landmarks detected');
        console.log('   POSSIBLE CAUSES:');
        console.log('   - Person not in clear view');
        console.log('   - Pose landmarks feature not enabled properly');
        console.log('   - Video quality insufficient for landmark detection');
      } else {
        console.log('✅ System should be working - check if gesture was actually inappropriate');
      }
    }
    
  } catch (error) {
    console.error('❌ Debug analysis failed:', error);
  }
}

debugGestureDetectionFailure().catch(console.error);