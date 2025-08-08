/**
 * FIX: Profile Picture Database Update
 * 
 * The camera upload worked and image is in GCS, but database wasn't updated.
 * This fixes the database to show the uploaded image instead of Google profile.
 */

import { neon } from '@neondatabase/serverless';

async function fixProfilePictureDatabase() {
  console.log('🔧 FIXING: Profile picture database update...');
  
  const sql = neon(process.env.DATABASE_URL);
  const userId = 'google-oauth2|117032826996185616207';
  
  // Use the actual GCS URL from the console logs
  const uploadedImageUrl = 'https://storage.googleapis.com/jemzy-images-storage/profiles/google-oauth2%7C117032826996185616207/cc71d3be-13b6-4bb7-b381-d53bec716f14.jpg';
  
  try {
    console.log('📥 Current user data before fix:');
    const usersBefore = await sql`
      SELECT id, first_name, last_name, profile_image_url
      FROM users 
      WHERE id = ${userId}
    `;
    const userBefore = usersBefore[0];
    console.log('Profile URL before:', userBefore?.profile_image_url);
    console.log('Name:', userBefore?.first_name, userBefore?.last_name);
    
    console.log('🔄 Updating database with uploaded image URL...');
    console.log('New URL:', uploadedImageUrl);
    
    await sql`
      UPDATE users 
      SET profile_image_url = ${uploadedImageUrl}, updated_at = NOW()
      WHERE id = ${userId}
    `;
    console.log('✅ Database update completed');
    
    console.log('📤 User data after fix:');
    const usersAfter = await sql`
      SELECT id, first_name, last_name, profile_image_url
      FROM users 
      WHERE id = ${userId}
    `;
    const userAfter = usersAfter[0];
    console.log('Profile URL after:', userAfter?.profile_image_url);
    
    if (userAfter?.profile_image_url?.includes('storage.googleapis.com')) {
      console.log('✅ SUCCESS: Database now shows uploaded GCS image!');
      console.log('🎉 Your custom profile picture should now display correctly');
    } else {
      console.log('❌ FAILED: Database still shows old URL');
      console.log('Expected: GCS URL starting with storage.googleapis.com');
      console.log('Actual:', userAfter?.profile_image_url);
    }
    
  } catch (error) {
    console.error('❌ ERROR during database fix:', error);
  }
  
  process.exit(0);
}

fixProfilePictureDatabase();