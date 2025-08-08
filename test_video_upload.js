// Test script to trigger video upload and capture audio processing errors
import * as fs from "fs";
import FormData from 'form-data';
import fetch  from 'node-fetch';

async function uploadTestVideo() {
  try {
    // Create a minimal test video file (1 second of black video with silent audio)
    // This will help us see exactly what happens during audio processing
    const testVideoContent = Buffer.from([
      // Minimal MP4 header - just enough to be recognized as video
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D,
      0x00, 0x00, 0x02, 0x00, 0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32,
      0x6D, 0x70, 0x34, 0x31, 0x00, 0x00, 0x00, 0x08, 0x66, 0x72, 0x65, 0x65
    ]);
    
    const tempVideoPath = '/tmp/test_audio_processing.mp4';
    fs.writeFileSync(tempVideoPath, testVideoContent);
    
    console.log('Created test video file:', tempVideoPath);
    console.log('File size:', fs.statSync(tempVideoPath).size, 'bytes');
    
    // Now upload this through our system to trigger audio processing
    const form = new FormData();
    form.append('video', fs.createReadStream(tempVideoPath), 'test_audio_processing.mp4');
    form.append('title', 'Audio Processing Test');
    form.append('description', 'Test video to diagnose audio processing failure');
    form.append('category', 'test');
    form.append('latitude', '36.05723709');
    form.append('longitude', '-94.16069116');
    
    const response = await fetch('http://localhost:5000/api/videos', {
      method: 'POST',
      body: form,
      headers: {
        'Cookie': 'appSession=...' // You'd need actual session cookie
      }
    });
    
    const result = await response.json();
    console.log('Upload response:', result);
    
    // Clean up
    fs.unlinkSync(tempVideoPath);
    
  } catch (error) {
    console.error('Test upload failed:', error);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  uploadTestVideo();
}


module.exports = { uploadTestVideo };