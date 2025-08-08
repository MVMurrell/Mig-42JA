/**
 * CHECK RECENT VIDEOS: Verify that video processing fixes are working
 */

async function checkRecentVideos() {
  const storage = await import('./server/storage.ts');
  const sql = storage.sql;
  
  console.log('📊 CHECKING: Recent video processing results...');
  
  try {
    const recentVideos = await sql`
      SELECT 
        id, 
        title, 
        processing_status, 
        gcs_processing_url, 
        flagged_reason,
        created_at,
        cdn_url,
        thumbnail_url
      FROM videos 
      WHERE created_at > NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC
      LIMIT 10
    `;
    
    console.log(`📊 Found ${recentVideos.length} videos in the last hour:`);
    
    if (recentVideos.length === 0) {
      console.log('📊 No recent videos found. Processing fixes ready for testing.');
      return;
    }
    
    recentVideos.forEach((video, index) => {
      console.log(`📊 Video ${index + 1}:`);
      console.log(`   ID: ${video.id.slice(0,8)}...`);
      console.log(`   Title: ${video.title}`);
      console.log(`   Status: ${video.processing_status}`);
      console.log(`   GCS URL: ${video.gcs_processing_url ? 'SET' : 'NOT SET'}`);
      console.log(`   CDN URL: ${video.cdn_url ? 'SET' : 'NOT SET'}`);
      console.log(`   Flagged: ${video.flagged_reason || 'None'}`);
      console.log(`   Created: ${video.created_at}`);
      console.log('   ---');
    });
    
    // Check for successful completions
    const successful = recentVideos.filter(v => v.processing_status === 'approved');
    const processing = recentVideos.filter(v => v.processing_status === 'processing');
    const rejected = recentVideos.filter(v => v.processing_status === 'rejected');
    const failed = recentVideos.filter(v => v.processing_status === 'failed');
    
    console.log('\n📊 SUMMARY:');
    console.log(`   ✅ Approved: ${successful.length}`);
    console.log(`   ⏳ Processing: ${processing.length}`);
    console.log(`   ❌ Rejected: ${rejected.length}`);
    console.log(`   💥 Failed: ${failed.length}`);
    
    if (successful.length > 0) {
      console.log('\n🎉 SUCCESS: Videos are completing the full pipeline!');
    } else if (processing.length > 0) {
      console.log('\n⏳ IN PROGRESS: Videos are being processed by AI moderation');
    } else if (failed.length > 0) {
      console.log('\n💥 STILL FAILING: Videos are failing during processing');
    }
    
  } catch (error) {
    console.error('❌ Database query failed:', error);
  }
}

checkRecentVideos().catch(console.error);