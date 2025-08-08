import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
neonConfig.webSocketConstructor = ws;

async function cleanupInvalidVideos() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('🔍 CLEANUP: Starting invalid video cleanup...');
    
    // Find videos that are marked as approved but lack proper Bunny.net storage
    const invalidVideosQuery = `
      SELECT 
        id, 
        title, 
        video_url, 
        bunny_video_id, 
        processing_status,
        user_id,
        created_at
      FROM videos 
      WHERE 
        is_active = true 
        AND processing_status = 'approved'
        AND (
          video_url IS NULL 
          OR video_url = '' 
          OR (bunny_video_id IS NULL AND (video_url NOT LIKE '/api/videos/bunny-proxy/%'))
        )
      ORDER BY created_at DESC;
    `;
    
    const result = await pool.query(invalidVideosQuery);
    const invalidVideos = result.rows;
    
    console.log(`🔍 CLEANUP: Found ${invalidVideos.length} invalid videos:`);
    
    if (invalidVideos.length === 0) {
      console.log('✅ CLEANUP: No invalid videos found. All videos have proper Bunny.net storage.');
      return;
    }
    
    // Log details of invalid videos
    invalidVideos.forEach((video, index) => {
      console.log(`${index + 1}. Video ID: ${video.id}`);
      console.log(`   Title: ${video.title}`);
      console.log(`   VideoUrl: "${video.video_url}"`);
      console.log(`   BunnyVideoId: ${video.bunny_video_id}`);
      console.log(`   Status: ${video.processing_status}`);
      console.log(`   User: ${video.user_id}`);
      console.log(`   Created: ${video.created_at}`);
      console.log('');
    });
    
    // Delete invalid videos
    console.log('🗑️ CLEANUP: Deleting invalid videos...');
    
    const videoIds = invalidVideos.map(v => v.id);
    const deleteQuery = `
      UPDATE videos 
      SET 
        is_active = false,
        flagged_reason = 'Invalid storage configuration - lacks Bunny.net setup',
        processing_status = 'failed',
        updated_at = NOW()
      WHERE id = ANY($1::uuid[])
    `;
    
    const deleteResult = await pool.query(deleteQuery, [videoIds]);
    
    console.log(`✅ CLEANUP: Successfully marked ${deleteResult.rowCount} videos as inactive`);
    console.log('🔍 CLEANUP: These videos have been marked as failed due to invalid storage configuration');
    console.log('🔍 CLEANUP: They will no longer appear in user feeds or maps');
    
    // Also clean up any associated data
    console.log('🧹 CLEANUP: Cleaning up associated data...');
    
    // Remove from video watches
    await pool.query('DELETE FROM video_watches WHERE video_id = ANY($1::uuid[])', [videoIds]);
    console.log('✅ CLEANUP: Removed watch records');
    
    // Remove from video likes
    await pool.query('DELETE FROM video_likes WHERE video_id = ANY($1::uuid[])', [videoIds]);
    console.log('✅ CLEANUP: Removed like records');
    
    // Remove from comments
    await pool.query('DELETE FROM comments WHERE video_id = ANY($1::uuid[])', [videoIds]);
    console.log('✅ CLEANUP: Removed comment records');
    
    console.log('✅ CLEANUP: Video cleanup completed successfully');
    
  } catch (error) {
    console.error('❌ CLEANUP ERROR:', error);
  } finally {
    await pool.end();
  }
}

// Run the cleanup
cleanupInvalidVideos();