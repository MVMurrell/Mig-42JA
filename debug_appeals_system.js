/**
 * DEBUG: Appeals System Investigation
 * 
 * This script investigates the video appeals system to see if appeals
 * are being properly stored and displayed in the content moderation dashboard.
 */

import { neon } from '@neondatabase/serverless';

async function debugAppealsSystem() {
  const sql = neon(process.env.DATABASE_URL);
  
  console.log('🔍 INVESTIGATING APPEALS SYSTEM');
  console.log('================================');
  
  try {
    // First, let's check the actual table structure
    console.log('\n🗃️ CHECKING TABLE STRUCTURES:');
    
    const moderationColumns = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'moderation_decisions' 
      ORDER BY ordinal_position
    `;
    
    console.log('Moderation Decisions table columns:');
    moderationColumns.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    const appealsColumns = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'video_appeals' 
      ORDER BY ordinal_position
    `;
    
    console.log('\nVideo Appeals table columns:');
    appealsColumns.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // 1. Check recent moderation decisions with correct column names
    console.log('\n📊 RECENT MODERATION DECISIONS:');
    const recentDecisions = await sql`
      SELECT * FROM moderation_decisions 
      ORDER BY created_at DESC 
      LIMIT 20
    `;
    console.log(`Found ${recentDecisions.length} recent moderation decisions`);
    
    if (recentDecisions.length > 0) {
      console.log('\nLatest 10 moderation decisions:');
      recentDecisions.slice(0, 10).forEach((decision, i) => {
        console.log(`${i+1}. Video: ${decision.content_id}`);
        console.log(`   User: ${decision.user_id}`);
        console.log(`   Decision: ${decision.moderation_decision}`);
        console.log(`   Reason: ${decision.flagged_reason || 'N/A'}`);
        console.log(`   Created: ${decision.created_at}`);
        console.log(`   Type: ${decision.content_type}`);
        console.log('---');
      });
    }
    
    // 2. Check video appeals
    console.log('\n🎬 VIDEO APPEALS:');
    const appeals = await sql`
      SELECT video_id, user_id, appeal_status, appeal_message, created_at
      FROM video_appeals 
      ORDER BY created_at DESC
    `;
    console.log(`Found ${appeals.length} total video appeals`);
    
    if (appeals.length > 0) {
      console.log('\nAll video appeals:');
      appeals.forEach((appeal, i) => {
        console.log(`${i+1}. Video ID: ${appeal.video_id}`);
        console.log(`   User: ${appeal.user_id}`);
        console.log(`   Status: ${appeal.appeal_status}`);
        console.log(`   Message: ${appeal.appeal_message?.substring(0, 100)}...`);
        console.log(`   Created: ${appeal.created_at}`);
        console.log('---');
      });
    }
    
    // 3. Check recent rejected videos (last 24 hours)
    console.log('\n🚫 RECENT REJECTED VIDEOS:');
    const rejectedVideos = await sql`
      SELECT id, title, user_id, processing_status, created_at, flagged_reason, audio_flag_reason 
      FROM videos 
      WHERE processing_status = 'rejected' 
        AND created_at > NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC 
      LIMIT 15
    `;
    
    console.log(`Found ${rejectedVideos.length} rejected videos in last 24 hours`);
    rejectedVideos.forEach((video, i) => {
      console.log(`${i+1}. "${video.title}" (${video.id})`);
      console.log(`   User: ${video.user_id}`);
      console.log(`   Created: ${video.created_at}`);
      console.log(`   Flag Reason: ${video.flagged_reason || 'N/A'}`);
      console.log(`   Audio Flag: ${video.audio_flag_reason || 'N/A'}`);
      console.log('---');
    });
    
    // 4. Check if any appeals exist for recent rejected videos
    console.log('\n🔄 CHECKING APPEALS FOR RECENT REJECTED VIDEOS:');
    for (const video of rejectedVideos.slice(0, 5)) {
      const videoAppeals = appeals.filter(appeal => appeal.video_id === video.id);
      if (videoAppeals.length > 0) {
        console.log(`✅ Video "${video.title}" has ${videoAppeals.length} appeal(s)`);
        videoAppeals.forEach(appeal => {
          console.log(`   Appeal Status: ${appeal.appeal_status}, Created: ${appeal.created_at}`);
        });
      } else {
        console.log(`❌ Video "${video.title}" has NO appeals`);
      }
    }
    
    // 5. Check database structure for appeals
    console.log('\n🗃️ APPEALS TABLE STRUCTURE:');
    const tableInfo = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'video_appeals' 
      ORDER BY ordinal_position
    `;
    
    console.log('Video Appeals table columns:');
    tableInfo.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // 6. Check for any new user IDs that might be from your iPhone account
    console.log('\n📱 RECENT NEW USERS:');
    const recentUsers = await sql`
      SELECT id, username, email, first_name, last_name, created_at
      FROM users 
      WHERE created_at > NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
    `;
    
    console.log(`Found ${recentUsers.length} new users in last 24 hours`);
    recentUsers.forEach((user, i) => {
      console.log(`${i+1}. ${user.username || user.email} (${user.id})`);
      console.log(`   Name: ${user.first_name || ''} ${user.last_name || ''}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('❌ Error during appeals investigation:', error);
    console.error('Stack trace:', error.stack);
  }
}

debugAppealsSystem().catch(console.error);