import { uploadFirstProcessor } from './server/uploadFirstProcessor.ts';

async function triggerProcessing() {
  try {
    console.log('Triggering processing for stuck video...');
    await uploadFirstProcessor.processVideo('221b7538-d126-4803-8121-5c645aafbf50', '/tmp/uploads/221b7538-d126-4803-8121-5c645aafbf50.webm', {
      title: 'Event 233',
      description: '',
      category: 'events',
      latitude: '36.057',
      longitude: '-94.160',
      visibility: 'public',
      groupId: null,
      frontendDuration: 5
    });
    console.log('✅ Video processing triggered successfully');
  } catch (error) {
    console.error('❌ Processing failed:', error);
  }
}

triggerProcessing();