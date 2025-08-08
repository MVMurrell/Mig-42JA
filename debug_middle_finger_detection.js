import { Storage } from '@google-cloud/storage';
import { VideoIntelligenceServiceClient } from '@google-cloud/video-intelligence';
import { ImageAnnotatorClient } from '@google-cloud/vision';

async function debugMiddleFingerVideo() {
  try {
    console.log('🔍 DEBUGGING: Middle finger video detection failure');
    
    const serviceAccountKey = process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      console.error('❌ No Google Cloud credentials found');
      return;
    }
    
    const credentials = JSON.parse(serviceAccountKey);
    const videoId = '0d70dc8b-aaea-45cc-a0c0-38bf66d1f710';
    
    // Initialize clients
    const gcsStorage = new Storage({
      credentials: credentials,
      projectId: credentials.project_id
    });
    
    const videoClient = new VideoIntelligenceServiceClient({
      credentials: credentials,
      projectId: credentials.project_id
    });
    
    const visionClient = new ImageAnnotatorClient({
      credentials: credentials,
      projectId: credentials.project_id
    });
    
    console.log(`🔍 Analyzing video: ${videoId}`);
    
    // Check if video exists in GCS
    const gcsUri = `gs://jemzy-video-moderation-steam-house-461401-t7/raw-videos/thread-message-60.webm`;
    console.log(`🔍 Checking GCS URI: ${gcsUri}`);
    
    const bucket = gcsStorage.bucket('jemzy-video-moderation-steam-house-461401-t7');
    const file = bucket.file('raw-videos/thread-message-60.webm');
    
    const [exists] = await file.exists();
    console.log(`🔍 Video exists in GCS: ${exists}`);
    
    if (!exists) {
      console.log('❌ Video not found in GCS - this explains why moderation might have failed');
      return;
    }
    
    // Run Video Intelligence API analysis
    console.log('🔍 Running Video Intelligence API analysis...');
    const [operation] = await videoClient.annotateVideo({
      inputUri: gcsUri,
      features: [
        'OBJECT_TRACKING',
        'PERSON_DETECTION', 
        'EXPLICIT_CONTENT_DETECTION'
      ]
    });
    
    console.log('🔍 Waiting for Video Intelligence results...');
    const [videoResults] = await operation.promise();
    const annotations = videoResults.annotationResults[0];
    
    // Check explicit content
    console.log('🔍 Explicit content results:');
    const explicitAnnotation = annotations.explicitAnnotation;
    if (explicitAnnotation?.frames) {
      console.log(`Found ${explicitAnnotation.frames.length} explicit content frames`);
      explicitAnnotation.frames.forEach((frame, i) => {
        console.log(`Frame ${i}: ${frame.pornographyLikelihood}`);
      });
    }
    
    // Check object tracking
    console.log('🔍 Object tracking results:');
    const objectAnnotations = annotations.objectAnnotations || [];
    console.log(`Found ${objectAnnotations.length} tracked objects`);
    
    objectAnnotations.forEach((obj, i) => {
      const description = obj.entity?.description || '';
      const confidence = obj.confidence || 0;
      console.log(`Object ${i}: ${description} (confidence: ${confidence})`);
    });
    
    // Check person detection
    console.log('🔍 Person detection results:');
    const personDetections = annotations.personDetectionAnnotations || [];
    console.log(`Found ${personDetections.length} person detection results`);
    
    personDetections.forEach((detection, i) => {
      const tracks = detection.tracks || [];
      tracks.forEach((track, j) => {
        const attributes = track.attributes || [];
        console.log(`Person ${i}, Track ${j}: ${attributes.length} attributes`);
        attributes.forEach(attr => {
          console.log(`  - ${attr.name}: ${attr.value} (confidence: ${attr.confidence})`);
        });
      });
    });
    
    console.log('✅ Video Intelligence analysis complete');
    
  } catch (error) {
    console.error('❌ Debug analysis failed:', error);
  }
}

debugMiddleFingerVideo();