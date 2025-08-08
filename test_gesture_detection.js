// Test script to debug why gesture detection isn't working for thread message 55
import { execute_sql_tool } from 'drizzle-orm';

async function testGestureDetection() {
  console.log('🔍 GESTURE DEBUG: Analyzing thread message 55 processing');
  
  // Check message details
  const { sql } = await import('drizzle-orm');
  const { storage } = await import('./server/storage.ts');
  
  try {
    const message = await storage.getThreadMessage(55);
    console.log('📝 Message details:', {
      id: message?.id,
      status: message?.processingStatus,
      flaggedReason: message?.flaggedReason,
      bunnyVideoId: message?.bunnyVideoId,
      videoUrl: message?.videoUrl
    });

    // Check moderation results
    const moderationResults = message?.moderationResults;
    if (moderationResults) {
      console.log('🛡️ Moderation results:', JSON.parse(moderationResults));
    }

    // Test Google Cloud Video Intelligence directly
    console.log('🎥 Testing Video Intelligence API directly...');
    const { VideoIntelligenceServiceClient } = await import('@google-cloud/video-intelligence');
    
    const serviceAccountKey = process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      console.error('❌ No Google Cloud credentials found');
      return;
    }

    const credentials = JSON.parse(serviceAccountKey);
    const client = new VideoIntelligenceServiceClient({
      credentials: credentials,
      projectId: credentials.project_id
    });

    // Test what features are actually available
    console.log('🔍 Available Video Intelligence features:');
    const testGcsUri = `gs://jemzy-video-processing/thread-message-55-*.mp4`;
    
    // Test with minimal request first
    console.log('🧪 Testing basic explicit content detection...');
    
    try {
      const [operation] = await client.annotateVideo({
        inputUri: testGcsUri,
        features: ['EXPLICIT_CONTENT_DETECTION'] as any
      });
      
      console.log('⏳ Waiting for basic analysis...');
      const [result] = await operation.promise();
      
      console.log('📊 Basic analysis results:', {
        hasResults: !!result.annotationResults?.[0],
        explicitFrames: result.annotationResults?.[0]?.explicitAnnotation?.frames?.length || 0
      });
      
    } catch (error) {
      console.error('❌ Basic analysis failed:', error.message);
    }

    // Now test comprehensive analysis
    console.log('🧪 Testing comprehensive gesture detection...');
    
    try {
      const [operation] = await client.annotateVideo({
        inputUri: testGcsUri,
        features: [
          'EXPLICIT_CONTENT_DETECTION',
          'OBJECT_TRACKING',
          'PERSON_DETECTION'
        ] as any,
        videoContext: {
          explicitContentDetectionConfig: {
            model: 'latest'
          }
        }
      });
      
      console.log('⏳ Waiting for comprehensive analysis...');
      const [result] = await operation.promise();
      
      const annotations = result.annotationResults?.[0];
      
      if (annotations) {
        console.log('📊 Comprehensive analysis results:');
        console.log('  - Explicit frames:', annotations.explicitAnnotation?.frames?.length || 0);
        console.log('  - Object annotations:', annotations.objectAnnotations?.length || 0);
        console.log('  - Person detections:', annotations.personDetectionAnnotations?.length || 0);
        
        // Log all detected objects
        if (annotations.objectAnnotations) {
          console.log('🎯 Detected objects:');
          annotations.objectAnnotations.forEach((obj, i) => {
            console.log(`  ${i + 1}. ${obj.entity?.description} (confidence: ${obj.confidence})`);
          });
        }
        
        // Log person attributes
        if (annotations.personDetectionAnnotations) {
          console.log('👤 Person attributes:');
          annotations.personDetectionAnnotations.forEach((person, i) => {
            person.tracks?.forEach((track, j) => {
              track.attributes?.forEach((attr, k) => {
                console.log(`  Person ${i+1} Track ${j+1} Attr ${k+1}: ${attr.name} (confidence: ${attr.confidence})`);
              });
            });
          });
        }
      } else {
        console.log('❌ No comprehensive analysis results returned');
      }
      
    } catch (error) {
      console.error('❌ Comprehensive analysis failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testGestureDetection().catch(console.error);