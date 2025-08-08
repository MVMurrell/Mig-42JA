/**
 * TEST: Google Cloud Authentication Status
 * 
 * Tests all Google Cloud services to verify authentication
 */

import { Storage } from '@google-cloud/storage';
import speech  from '@google-cloud/speech';
import vision  from '@google-cloud/vision';
import { VideoIntelligenceServiceClient } from '@google-cloud/video-intelligence';

async function testGoogleAuth() {
  console.log('\n🔍 TESTING: Google Cloud Authentication');
  
  console.log('\nEnvironment variables:');
  console.log('GOOGLE_APPLICATION_CREDENTIALS exists:', !!process.env.GOOGLE_APPLICATION_CREDENTIALS);
  console.log('GOOGLE_CLOUD_PROJECT_ID:', process.env.GOOGLE_CLOUD_PROJECT_ID);
  
  // Test each service individually
  console.log('\n🧪 Testing Google Cloud Storage...');
  try {
    const storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    });
    const [buckets] = await storage.getBuckets();
    console.log('✅ GCS: Authentication successful, found', buckets.length, 'buckets');
  } catch (error) {
    console.log('❌ GCS: Authentication failed:', error.message);
  }
  
  console.log('\n🧪 Testing Speech API...');
  try {
    const speechClient = new speech.SpeechClient({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    });
    // Try a simple operation
    const request = {
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: 'en-US',
      },
      audio: {
        content: Buffer.from('test').toString('base64'),
      },
    };
    await speechClient.recognize(request);
    console.log('✅ Speech API: Authentication successful');
  } catch (error) {
    console.log('❌ Speech API: Authentication failed:', error.message);
  }
  
  console.log('\n🧪 Testing Vision API...');
  try {
    const visionClient = new vision.ImageAnnotatorClient({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    });
    // Try a simple operation with minimal data
    const request = {
      image: { content: Buffer.from('test').toString('base64') },
      features: [{ type: 'SAFE_SEARCH_DETECTION' }],
    };
    await visionClient.annotateImage(request);
    console.log('✅ Vision API: Authentication successful');
  } catch (error) {
    console.log('❌ Vision API: Authentication failed:', error.message);
  }
  
  console.log('\n🧪 Testing Video Intelligence API...');
  try {
    const videoClient = new VideoIntelligenceServiceClient({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    });
    // This will fail with invalid input but should authenticate first
    const request = {
      inputUri: 'gs://test/test.mp4',
      features: ['EXPLICIT_CONTENT_DETECTION'],
    };
    await videoClient.annotateVideo(request);
    console.log('✅ Video Intelligence API: Authentication successful');
  } catch (error) {
    if (error.message.includes('UNAUTHENTICATED')) {
      console.log('❌ Video Intelligence API: Authentication failed:', error.message);
    } else {
      console.log('✅ Video Intelligence API: Authentication successful (other error expected)');
    }
  }
  
  process.exit(0);
}

testGoogleAuth();