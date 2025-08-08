import { neon } from '@neondatabase/serverless';

async function createGroupVideoFromOtherUser() {
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    console.log('🎬 Creating group video from another user for Pirates Cove...');
    
    // First, get the Pirates Cove group ID
    const groups = await sql`
      SELECT id, name FROM groups 
      WHERE name ILIKE '%pirates%' OR name ILIKE '%cove%'
      LIMIT 1
    `;
    
    if (groups.length === 0) {
      console.log('❌ Pirates Cove group not found');
      return;
    }
    
    const piratesCoveGroup = groups[0];
    console.log('✅ Found Pirates Cove group:', piratesCoveGroup.name, piratesCoveGroup.id);
    
    // Get a different user (not the current main user)
    const users = await sql`
      SELECT id, first_name, last_name, profile_image_url 
      FROM users 
      WHERE id != 'google-oauth2|117032826996185616207'
      LIMIT 1
    `;
    
    let otherUser;
    if (users.length === 0) {
      // Create a dummy user if none exists
      console.log('📝 Creating dummy user...');
      const [newUser] = await sql`
        INSERT INTO users (id, first_name, last_name, email, profile_image_url)
        VALUES (
          'auth0|dummy-user-' || generate_random_uuid()::text,
          'Sarah',
          'Johnson',
          'sarah.johnson@example.com',
          'https://images.unsplash.com/photo-1494790108755-2616b612b601?w=150&h=150&fit=crop&crop=face'
        )
        RETURNING id, first_name, last_name, profile_image_url
      `;
      otherUser = newUser;
      console.log('✅ Created dummy user:', otherUser.first_name, otherUser.last_name);
    } else {
      otherUser = users[0];
      console.log('✅ Found existing user:', otherUser.first_name, otherUser.last_name);
    }
    
    // Ensure the other user is a member of Pirates Cove
    console.log('👥 Adding user to Pirates Cove group...');
    try {
      await sql`
        INSERT INTO group_memberships (group_id, user_id, role, joined_at)
        VALUES (${piratesCoveGroup.id}, ${otherUser.id}, 'member', NOW())
      `;
    } catch (error) {
      if (error.code !== '23505') { // Ignore duplicate key errors
        throw error;
      }
    }
    
    // Create a dummy video for this user
    console.log('🎬 Creating video from other user...');
    const [video] = await sql`
      INSERT INTO videos (
        title,
        description,
        video_url,
        thumbnail_url,
        bunny_video_id,
        user_id,
        latitude,
        longitude,
        category,
        processing_status,
        created_at,
        duration,
        group_id,
        visibility
      )
      VALUES (
        'Treasure Hunt Adventure',
        'Found some amazing treasures during our group adventure!',
        '/api/videos/bunny-proxy/treasure-hunt-video',
        'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&h=400&fit=crop',
        'treasure-hunt-video',
        ${otherUser.id},
        36.05715,
        -94.16055,
        'Adventure',
        'approved',
        NOW() - INTERVAL '2 hours',
        45.5,
        ${piratesCoveGroup.id},
        ${piratesCoveGroup.id}
      )
      RETURNING *
    `;
    
    console.log('✅ Created group video:', video.title);
    console.log('📍 Video ID:', video.id);
    console.log('👤 Created by:', otherUser.first_name, otherUser.last_name);
    console.log('🏴‍☠️ Posted to group:', piratesCoveGroup.name);
    
    // Add some dummy engagement
    await sql`
      UPDATE videos 
      SET 
        views = 15,
        likes = 3,
        updated_at = NOW()
      WHERE id = ${video.id}
    `;
    
    console.log('🎉 Successfully created group video from another user!');
    console.log('📱 You can now see this video in the Pirates Cove group page');
    
  } catch (error) {
    console.error('❌ Error creating group video:', error);
  }
}

createGroupVideoFromOtherUser().catch(console.error);