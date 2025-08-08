import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function createTestGroups() {
  console.log('Creating test private groups and memberships...');

  // Get your user ID from the database
  const currentUser = await sql`SELECT id FROM users WHERE id LIKE 'google-oauth2%' LIMIT 1`;
  if (currentUser.length === 0) {
    console.log('❌ No authenticated user found');
    return;
  }

  const yourUserId = currentUser[0].id;
  console.log(`Found your user ID: ${yourUserId}`);

  // Create test private groups owned by the dummy users
  const testGroups = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Tech Enthusiasts',
      description: 'A private group for discussing the latest in technology',
      ownerId: 'user-mike-789',
      coverImageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=300&h=200&fit=crop'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: 'Creative Minds',
      description: 'Artists and designers sharing inspiration',
      ownerId: 'user-sarah-456',
      coverImageUrl: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=300&h=200&fit=crop'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      name: 'Adventure Seekers',
      description: 'For those who love outdoor adventures and photography',
      ownerId: 'user-alex-123',
      coverImageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=200&fit=crop'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440004',
      name: 'Music Lovers',
      description: 'Musicians and music enthusiasts unite',
      ownerId: 'user-david-345',
      coverImageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=200&fit=crop'
    }
  ];

  try {
    // Create the groups
    for (const group of testGroups) {
      await sql`
        INSERT INTO groups (id, name, description, cover_image_url, is_public, created_by, created_at)
        VALUES (${group.id}, ${group.name}, ${group.description}, ${group.coverImageUrl}, false, ${group.ownerId}, NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          cover_image_url = EXCLUDED.cover_image_url,
          is_public = EXCLUDED.is_public
      `;
      console.log(`✓ Created group: ${group.name}`);

      // Add the owner as a member
      await sql`
        INSERT INTO group_memberships (group_id, user_id, role, joined_at)
        VALUES (${group.id}, ${group.ownerId}, 'owner', NOW())
      `;

      // Add you as a member to test leaving
      await sql`
        INSERT INTO group_memberships (group_id, user_id, role, joined_at)
        VALUES (${group.id}, ${yourUserId}, 'member', NOW())
      `;
      console.log(`✓ Added you to: ${group.name}`);
    }

    // Add some dummy users to groups as well for more realistic testing
    const additionalMemberships = [
      { groupId: '550e8400-e29b-41d4-a716-446655440001', userId: 'user-emma-012' },
      { groupId: '550e8400-e29b-41d4-a716-446655440001', userId: 'user-lisa-678' },
      { groupId: '550e8400-e29b-41d4-a716-446655440002', userId: 'user-alex-123' },
      { groupId: '550e8400-e29b-41d4-a716-446655440002', userId: 'user-david-345' },
      { groupId: '550e8400-e29b-41d4-a716-446655440003', userId: 'user-sarah-456' },
      { groupId: '550e8400-e29b-41d4-a716-446655440003', userId: 'user-mike-789' },
      { groupId: '550e8400-e29b-41d4-a716-446655440004', userId: 'user-emma-012' },
      { groupId: '550e8400-e29b-41d4-a716-446655440004', userId: 'user-lisa-678' }
    ];

    for (const membership of additionalMemberships) {
      await sql`
        INSERT INTO group_memberships (group_id, user_id, role, joined_at)
        VALUES (${membership.groupId}, ${membership.userId}, 'member', NOW())
      `;
    }

    console.log('\n✅ Test groups and memberships created successfully!');
    console.log('\nYou are now a member of these private groups:');
    testGroups.forEach(group => {
      console.log(`- ${group.name}: ${group.description}`);
    });
    console.log('\nYou can now:');
    console.log('1. Search for users like "alex", "sarah", "mike" etc. to add to your existing groups');
    console.log('2. Navigate to these new groups to test the leave group functionality');
    console.log('3. Try adding the dummy users to your existing private groups');

  } catch (error) {
    console.error('❌ Error creating test groups:', error);
  }
}

createTestGroups();