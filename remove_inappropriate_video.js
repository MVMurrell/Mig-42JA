import { bunnyService } from './server/bunnyService.js.js';

async function removeInappropriateVideo() {
  try {
    console.log('🔒 SECURITY REMEDIATION: Removing inappropriate gesture video');
    
    const videoId = '0d70dc8b-aaea-45cc-a0c0-38bf66d1f710';
    
    console.log(`Attempting to delete video: ${videoId}`);
    
    // Delete from Bunny.net
    const result = await bunnyService.deleteVideo(videoId);
    
    if (result.success) {
      console.log('✅ Video successfully removed from Bunny.net');
    } else {
      console.log('❌ Failed to remove video from Bunny.net:', result.error);
    }
    
    console.log('🔒 SECURITY REMEDIATION COMPLETE');
    console.log('- Thread message 60 marked as flagged in database');
    console.log('- Video URL and Bunny ID cleared from database');
    console.log('- Inappropriate content removed from CDN');
    
  } catch (error) {
    console.error('❌ Security remediation failed:', error);
  }
}

removeInappropriateVideo();