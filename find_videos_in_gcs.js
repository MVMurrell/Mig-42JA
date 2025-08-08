import { Storage } from '@google-cloud/storage';

async function findVideos() {
  try {
    // Use Application Default Credentials (ADC) from environment
    const storage = new Storage({
      projectId: 'steam-house-461401-t7'
    });

    const buckets = [
      'jemzy-video-moderation-steam-house-461401-t7',
      'jemzy_video_processing_temporary_storage'
    ];
    
    for (const bucketName of buckets) {
      console.log('\nChecking bucket:', bucketName);
      try {
        const bucket = storage.bucket(bucketName);
        const [files] = await bucket.getFiles({ maxResults: 20 });
        console.log('Files found:', files.length);
        files.forEach(file => {
          console.log('  -', file.name);
        });
        
        // Look specifically for our test video
        const testVideoId = 'a1b6c5c7-a769-48ea-8b47-0764a0aa6009';
        const foundTestVideo = files.find(file => file.name.includes(testVideoId));
        if (foundTestVideo) {
          console.log('*** FOUND TEST VIDEO:', foundTestVideo.name);
        }
        
      } catch (error) {
        console.log('Cannot access bucket:', error.message);
      }
    }
    
  } catch (error) {
    console.error('Search failed:', error.message);
  }
}

findVideos();