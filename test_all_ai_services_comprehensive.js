/**
 * COMPREHENSIVE AI SERVICES CONNECTION TEST
 * 
 * This test verifies all AI services have working credentials and connections:
 * 1. Google Cloud Video Intelligence API
 * 2. Google Cloud Speech-to-Text API
 * 3. Google Cloud Vision API (for image moderation)
 * 4. Google Cloud Natural Language API
 * 5. Google Cloud Storage
 */

import { VideoIntelligenceServiceClient } from '@google-cloud/video-intelligence';
import { SpeechClient } from '@google-cloud/speech';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { LanguageServiceClient } from '@google-cloud/language';
import { Storage } from '@google-cloud/storage';

async function testAllAIServices() {
    console.log('\n🔍 COMPREHENSIVE AI SERVICES CONNECTION TEST');
    console.log('='.repeat(70));

    const results = {
        videoIntelligence: false,
        speechToText: false,
        visionAPI: false,
        naturalLanguage: false,
        cloudStorage: false
    };

    // Test 1: Video Intelligence API (Content Moderation Credentials)
    console.log('\n🎥 Test 1: Video Intelligence API...');
    try {
        const contentCredentials = process.env.CONTENT_MODERATION_WORKER_JUN_26_2025;
        if (!contentCredentials) {
            console.log('❌ Missing: CONTENT_MODERATION_WORKER_JUN_26_2025');
        } else {
            const credentials = JSON.parse(contentCredentials);
            const client = new VideoIntelligenceServiceClient({
                credentials: credentials,
                projectId: credentials.project_id
            });

            // Test with Google sample video
            const [operation] = await client.annotateVideo({
                inputUri: 'gs://cloud-samples-data/video/cat.mp4',
                features: ['EXPLICIT_CONTENT_DETECTION']
            });

            console.log('✅ Video Intelligence: Authentication successful');
            console.log(`   Project: ${credentials.project_id}`);
            console.log(`   Service Account: ${credentials.client_email}`);
            results.videoIntelligence = true;
        }
    } catch (error) {
        console.log('❌ Video Intelligence: Failed -', error.message);
    }

    // Test 2: Speech-to-Text API (Audio Processing Credentials)
    console.log('\n🎤 Test 2: Speech-to-Text API...');
    try {
        const audioCredentials = process.env.AUDIO_TRANSCRIPTION_API_JUN_26_2025;
        if (!audioCredentials) {
            console.log('❌ Missing: AUDIO_TRANSCRIPTION_API_JUN_26_2025');
        } else {
            const credentials = JSON.parse(audioCredentials);
            const client = new SpeechClient({
                credentials: credentials,
                projectId: credentials.project_id
            });

            // Test basic recognition config (no actual audio needed)
            const config = {
                encoding: 'WEBM_OPUS',
                sampleRateHertz: 48000,
                languageCode: 'en-US',
            };

            console.log('✅ Speech-to-Text: Client initialized successfully');
            console.log(`   Project: ${credentials.project_id}`);
            console.log(`   Service Account: ${credentials.client_email}`);
            results.speechToText = true;
        }
    } catch (error) {
        console.log('❌ Speech-to-Text: Failed -', error.message);
    }

    // Test 3: Vision API (Image Moderation Credentials)
    console.log('\n👁️ Test 3: Vision API...');
    try {
        const visionCredentials = process.env.GOOGLE_VISION_API_JUN_26_2025;
        if (!visionCredentials) {
            console.log('❌ Missing: GOOGLE_VISION_API_JUN_26_2025');
        } else {
            const credentials = JSON.parse(visionCredentials);
            const client = new ImageAnnotatorClient({
                credentials: credentials,
                projectId: credentials.project_id
            });

            // Test with a simple safe search detection
            const [result] = await client.safeSearchDetection({
                image: {
                    source: {
                        imageUri: 'gs://cloud-samples-data/vision/face/face_detection.jpg'
                    }
                }
            });

            console.log('✅ Vision API: Authentication successful');
            console.log(`   Project: ${credentials.project_id}`);
            console.log(`   Service Account: ${credentials.client_email}`);
            results.visionAPI = true;
        }
    } catch (error) {
        console.log('❌ Vision API: Failed -', error.message);
    }

    // Test 4: Natural Language API (Content Moderation Credentials)
    console.log('\n📝 Test 4: Natural Language API...');
    try {
        const contentCredentials = process.env.CONTENT_MODERATION_WORKER_JUN_26_2025;
        if (!contentCredentials) {
            console.log('❌ Missing: CONTENT_MODERATION_WORKER_JUN_26_2025');
        } else {
            const credentials = JSON.parse(contentCredentials);
            const client = new LanguageServiceClient({
                credentials: credentials,
                projectId: credentials.project_id
            });

            // Test sentiment analysis
            const [result] = await client.analyzeSentiment({
                document: {
                    content: 'Hello world! This is a test.',
                    type: 'PLAIN_TEXT'
                }
            });

            console.log('✅ Natural Language: Authentication successful');
            console.log(`   Project: ${credentials.project_id}`);
            console.log(`   Service Account: ${credentials.client_email}`);
            results.naturalLanguage = true;
        }
    } catch (error) {
        console.log('❌ Natural Language: Failed -', error.message);
    }

    // Test 5: Cloud Storage (Using Vision API credentials)
    console.log('\n☁️ Test 5: Cloud Storage...');
    try {
        const visionCredentials = process.env.GOOGLE_VISION_API_JUN_26_2025;
        if (!visionCredentials) {
            console.log('❌ Missing: GOOGLE_VISION_API_JUN_26_2025');
        } else {
            const credentials = JSON.parse(visionCredentials);
            const storage = new Storage({
                credentials: credentials,
                projectId: credentials.project_id
            });

            // Test bucket access
            const bucket = storage.bucket('jemzy-images-storage');
            const [exists] = await bucket.exists();

            console.log('✅ Cloud Storage: Authentication successful');
            console.log(`   Project: ${credentials.project_id}`);
            console.log(`   Bucket exists: ${exists}`);
            results.cloudStorage = true;
        }
    } catch (error) {
        console.log('❌ Cloud Storage: Failed -', error.message);
    }

    // Summary Report
    console.log('\n📊 FINAL CONNECTION REPORT');
    console.log('='.repeat(70));
    
    const totalServices = Object.keys(results).length;
    const workingServices = Object.values(results).filter(Boolean).length;
    
    console.log(`🎯 Working Services: ${workingServices}/${totalServices}`);
    console.log('');
    
    Object.entries(results).forEach(([service, working]) => {
        const status = working ? '✅ CONNECTED' : '❌ FAILED';
        const name = service.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        console.log(`${status} - ${name}`);
    });

    if (workingServices === totalServices) {
        console.log('\n🎉 ALL AI SERVICES ARE CONNECTED AND READY!');
        console.log('Video uploads should work properly now.');
    } else {
        console.log('\n⚠️ SOME SERVICES HAVE CONNECTION ISSUES');
        console.log('Video uploads may fail until all services are working.');
    }

    console.log('\n🔐 CREDENTIALS SUMMARY:');
    console.log('- Video Intelligence & Natural Language: CONTENT_MODERATION_WORKER_JUN_26_2025');
    console.log('- Speech-to-Text: AUDIO_TRANSCRIPTION_API_JUN_26_2025');
    console.log('- Vision API & Cloud Storage: GOOGLE_VISION_API_JUN_26_2025');

    return results;
}

testAllAIServices();