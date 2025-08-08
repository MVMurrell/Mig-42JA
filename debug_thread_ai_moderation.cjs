/**
 * DEBUG: Thread AI Moderation Failure
 * 
 * This script tests the AI moderation specifically on the thread message file
 * to identify what's causing the failure in the AI analysis step.
 */// Import required modules
    import { VideoIntelligenceServiceClient } from '@google-cloud/video-intelligence';
    import { SpeechClient } from '@google-cloud/speech';

async function debugThreadAIModeration() {
  console.log('🔍 DEBUG: Testing AI moderation on thread message file...');
  
  const gcsUri = 'gs://jemzy-video-moderation-steam-house-461401-t7/thread-messages/530c752f-230c-48fc-bdb6-a4933e92f998.webm';
  
  try {
    
    
    // Initialize credentials
    const credentials = JSON.parse(process.env.CONTENT_MODERATION_WORKER_JUN_26_2025);
    
    console.log('🎬 Testing Video Intelligence API...');
    
    // Initialize Video Intelligence client
    const videoClient = new VideoIntelligenceServiceClient({
      projectId: credentials.project_id,
      credentials: credentials
    });
    
    const videoRequest = {
      inputUri: gcsUri,
      features: ['EXPLICIT_CONTENT_DETECTION'],
      videoContext: {
        explicitContentDetectionConfig: {
          model: 'builtin/latest'
        }
      }
    };
    
    console.log('📋 Video analysis request:', JSON.stringify(videoRequest, null, 2));
    
    // Start video analysis
    const [videoOperation] = await videoClient.annotateVideo(videoRequest);
    console.log('✅ Video analysis operation started:', videoOperation.name);
    
    // Wait for the operation to complete
    console.log('⏳ Waiting for video analysis to complete...');
    const [videoResult] = await videoOperation.promise();
    
    console.log('📊 Video analysis result:');
    console.log(JSON.stringify(videoResult.annotationResults[0]?.explicitAnnotation, null, 2));
    
    console.log('🎙️ Testing Speech-to-Text API...');
    
    // Initialize Speech client
    const speechClient = new SpeechClient({
      projectId: credentials.project_id,
      credentials: credentials
    });
    
    const audioRequest = {
      audio: {
        uri: gcsUri
      },
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: 'en-US',
        model: 'latest_long',
        useEnhanced: true,
        enableAutomaticPunctuation: true
      }
    };
    
    console.log('📋 Audio analysis request:', JSON.stringify(audioRequest, null, 2));
    
    // Start audio transcription
    const [audioOperation] = await speechClient.longRunningRecognize(audioRequest);
    console.log('✅ Audio analysis operation started:', audioOperation.name);
    
    // Wait for the operation to complete
    console.log('⏳ Waiting for audio transcription to complete...');
    const [audioResult] = await audioOperation.promise();
    
    console.log('📊 Audio transcription result:');
    console.log(JSON.stringify(audioResult.results, null, 2));
    
    console.log('✅ Both AI services worked successfully!');
    console.log('🎯 This means the issue is likely in how the uploadFirstProcessor is calling these services');
    
  } catch (error) {
    console.error('❌ AI moderation failed:', error.message);
    console.error('Stack:', error.stack);
    
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.details) {
      console.error('Error details:', error.details);
    }
  }
}

debugThreadAIModeration().catch(console.error);