import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function createDummyUsers() {
  console.log('Creating dummy user profiles...');

  const dummyUsers = [
    {
      id: 'user-alex-123',
      firstName: 'Alex',
      lastName: 'Johnson',
      username: 'alex_johnson',
      email: 'alex.johnson@example.com',
      profileImageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      bio: 'Adventure seeker and photographer'
    },
    {
      id: 'user-sarah-456',
      firstName: 'Sarah',
      lastName: 'Chen',
      username: 'sarah_chen',
      email: 'sarah.chen@example.com',
      profileImageUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      bio: 'Designer and creative thinker'
    },
    {
      id: 'user-mike-789',
      firstName: 'Mike',
      lastName: 'Rodriguez',
      username: 'mike_rodriguez',
      email: 'mike.rodriguez@example.com',
      profileImageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      bio: 'Tech enthusiast and gamer'
    },
    {
      id: 'user-emma-012',
      firstName: 'Emma',
      lastName: 'Wilson',
      username: 'emma_wilson',
      email: 'emma.wilson@example.com',
      profileImageUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      bio: 'Artist and coffee lover'
    },
    {
      id: 'user-david-345',
      firstName: 'David',
      lastName: 'Kim',
      username: 'david_kim',
      email: 'david.kim@example.com',
      profileImageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
      bio: 'Musician and nature enthusiast'
    },
    {
      id: 'user-lisa-678',
      firstName: 'Lisa',
      lastName: 'Anderson',
      username: 'lisa_anderson',
      email: 'lisa.anderson@example.com',
      profileImageUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face',
      bio: 'Fitness coach and traveler'
    }
  ];

  try {
    // Insert dummy users
    for (const user of dummyUsers) {
      await sql`
        INSERT INTO users (id, first_name, last_name, username, email, profile_image_url, bio, created_at)
        VALUES (${user.id}, ${user.firstName}, ${user.lastName}, ${user.username}, ${user.email}, ${user.profileImageUrl}, ${user.bio}, NOW())
        ON CONFLICT (id) DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          username = EXCLUDED.username,
          email = EXCLUDED.email,
          profile_image_url = EXCLUDED.profile_image_url,
          bio = EXCLUDED.bio
      `;
      console.log(`✓ Created user: ${user.firstName} ${user.lastName} (@${user.username})`);
    }

    console.log('\n✅ All dummy users created successfully!');
    console.log('You can now search for these users in the Add Members modal:');
    dummyUsers.forEach(user => {
      console.log(`- ${user.firstName} ${user.lastName} (@${user.username})`);
    });

  } catch (error) {
    console.error('❌ Error creating dummy users:', error);
  }
}

createDummyUsers();