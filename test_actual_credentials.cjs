/**
 * TEST: Actual Service Credentials
 * 
 * Tests the specific credentials that our services are configured to use
 */

import { Storage } from '@google-cloud/storage';
import speech from '@google-cloud/speech';
import vision from '@google-cloud/vision';
 import { LanguageServiceClient }  from '@google-cloud/language';ß

async function testActualCredentials() {
  console.log('\n🔍 TESTING: Actual Service Credentials');
  
  // Test the audio processing credentials
  console.log('\n🧪 Testing Audio Processing Credentials...');
  try {
    const audioCredentials = process.env.AUDIO_TRANSCRIPTION_API_JUN_26_2025;
    if (!audioCredentials) {
      console.log('❌ AUDIO_TRANSCRIPTION_API_JUN_26_2025 not found');
      return;
    }
    
    const credentials = JSON.parse(audioCredentials);
    const speechClient = new speech.SpeechClient({
      credentials: credentials,
      projectId: credentials.project_id
    });
    
    // Simple test - this will fail with invalid input but should authenticate
    try {
      await speechClient.recognize({
        config: { encoding: 'WEBM_OPUS', sampleRateHertz: 48000, languageCode: 'en-US' },
        audio: { content: Buffer.from('test').toString('base64') }
      });
    } catch (error) {
      if (error.message.includes('UNAUTHENTICATED')) {
        console.log('❌ Audio: Authentication failed');
      } else {
        console.log('✅ Audio: Authentication successful (expected format error)');
      }
    }
  } catch (error) {
    console.log('❌ Audio: Setup failed:', error.message);
  }
  
  // Test the vision credentials
  console.log('\n🧪 Testing Vision Credentials...');
  try {
    const visionCredentials = process.env.GOOGLE_VISION_API_JUN_26_2025;
    if (!visionCredentials) {
      console.log('❌ GOOGLE_VISION_API_JUN_26_2025 not found');
      return;
    }
    
    const credentials = JSON.parse(visionCredentials);
    const visionClient = new vision.ImageAnnotatorClient({
      credentials: credentials,
      projectId: credentials.project_id
    });
    
    // Simple test - this will fail with invalid input but should authenticate
    try {
      await visionClient.annotateImage({
        image: { content: Buffer.from('test').toString('base64') },
        features: [{ type: 'SAFE_SEARCH_DETECTION' }]
      });
    } catch (error) {
      if (error.message.includes('UNAUTHENTICATED')) {
        console.log('❌ Vision: Authentication failed');
      } else {
        console.log('✅ Vision: Authentication successful (expected format error)');
      }
    }
  } catch (error) {
    console.log('❌ Vision: Setup failed:', error.message);
  }
  
  // Test content moderation credentials
  console.log('\n🧪 Testing Content Moderation Credentials...');
  try {
    const contentCredentials = process.env.CONTENT_MODERATION_WORKER_JUN_26_2025;
    if (!contentCredentials) {
      console.log('❌ CONTENT_MODERATION_WORKER_JUN_26_2025 not found');
      return;
    }
    
    const credentials = JSON.parse(contentCredentials);
   
    const languageClient = new LanguageServiceClient({
      credentials: credentials,
      projectId: credentials.project_id
    });
    
    // Simple test with valid text
    try {
      await languageClient.analyzeSentiment({
        document: { content: 'Hello world', type: 'PLAIN_TEXT' }
      });
      console.log('✅ Content Moderation: Authentication successful');
    } catch (error) {
      if (error.message.includes('UNAUTHENTICATED')) {
        console.log('❌ Content Moderation: Authentication failed');
      } else {
        console.log('✅ Content Moderation: Authentication successful');
      }
    }
  } catch (error) {
    console.log('❌ Content Moderation: Setup failed:', error.message);
  }
  
  process.exit(0);
}

testActualCredentials();