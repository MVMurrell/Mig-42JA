import { SpeechClient } from '@google-cloud/speech';

async function testGoogleSpeech() {
  console.log('Testing Google Cloud Speech-to-Text API...');
  
  try {
    const speechClient = new SpeechClient();
    console.log('Speech client initialized successfully');
    
    // Test a simple audio recognition request
    const testVideoId = '8e1d4e8a-addb-40c7-92db-d72117d12d32';
    const gcsUri = `gs://jemzy-app-videos/${testVideoId}`;
    
    console.log(`Testing transcription for: ${gcsUri}`);
    
    const request = {
      audio: {
        uri: gcsUri,
      },
      config: {
        encoding: 'MP4', 
        languageCode: 'en-US',
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: false,
        maxAlternatives: 1,
        profanityFilter: false,
        model: 'video',
      },
    };

    console.log('Sending transcription request to Google Cloud...');
    const [response] = await speechClient.recognize(request);
    
    console.log('Response received:', {
      hasResults: !!response.results,
      resultsCount: response.results?.length || 0,
      firstResult: response.results?.[0]?.alternatives?.[0]?.transcript || 'No transcript'
    });
    
  } catch (error) {
    console.error('Google Speech API test failed:');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error details:', error.details);
  }
}

testGoogleSpeech();
