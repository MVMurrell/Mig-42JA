import { neon } from "@neondatabase/serverless";

async function checkUserProfile() {
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    const result = await sql`
      SELECT id, first_name, last_name, email, profile_image_url, ready_player_me_avatar_url, created_at, updated_at
      FROM users 
      WHERE id = 'google-oauth2|117032826996185616207'
    `;
    
    console.log('📊 User Profile Database Data:');
    console.log('='.repeat(50));
    
    if (result.length === 0) {
      console.log('❌ User not found in database');
      return;
    }
    
    const user = result[0];
    console.log('👤 User ID:', user.id);
    console.log('📧 Email:', user.email);
    console.log('🏷️ Name:', user.first_name, user.last_name);
    console.log('🖼️ Profile Image URL:', user.profile_image_url);
    console.log('🤖 Ready Player Me URL:', user.ready_player_me_avatar_url);
    console.log('⏰ Created:', user.created_at);
    console.log('⏰ Updated:', user.updated_at);
    
    // Check if profile image URL contains Google Cloud Storage
    if (user.profile_image_url && user.profile_image_url.includes('storage.googleapis.com')) {
      console.log('\n✅ FOUND: User has uploaded profile picture in Google Cloud Storage');
    } else if (user.profile_image_url && user.profile_image_url.includes('googleusercontent.com')) {
      console.log('\n⚠️ ISSUE: User still has Google profile picture URL in database');
    } else {
      console.log('\n❓ UNKNOWN: Profile image URL format not recognized');
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
  }
}

checkUserProfile();