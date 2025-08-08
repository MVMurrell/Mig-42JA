import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import ws  from 'ws';

// Configure neon
import { neonConfig } from "@neondatabase/serverless";

neonConfig.webSocketConstructor = ws;


const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

// Import schema
import { users, userStrikes, violations } from './shared/schema.js';

async function testStrikeSystem() {
  console.log('🧪 Testing Strike System Automation...\n');

  // Create a test user
  const testUserId = 'test-user-' + Date.now();
  const testUser = {
    id: testUserId,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    username: 'testuser',
    role: 'user'
  };

  try {
    // 1. Create test user
    console.log('1. Creating test user...');
    await db.insert(users).values(testUser);
    console.log('✅ Test user created:', testUserId);

    // 2. Issue first strike (should be warning)
    console.log('\n2. Testing First Strike (should be warning)...');
    const strike1Response = await fetch('http://localhost:5000/api/moderation/strikes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=test-admin-session' // You'll need to replace with actual admin session
      },
      body: JSON.stringify({
        userId: testUserId,
        violationType: 'inappropriate_content',
        description: 'Test violation 1',
        contentType: 'video',
        contentId: 'test-video-1'
      })
    });

    if (strike1Response.ok) {
      console.log('✅ First strike issued successfully');
      const userRecord1 = await db.select().from(userStrikes).where(eq(userStrikes.userId, testUserId));
      console.log('📊 After Strike 1:', {
        strikes: userRecord1[0]?.currentStrikes,
        status: userRecord1[0]?.accountStatus,
        suspensionEnd: userRecord1[0]?.suspensionEndDate
      });
    } else {
      console.log('❌ First strike failed:', await strike1Response.text());
    }

    // 3. Issue second strike (should be 7-day suspension)
    console.log('\n3. Testing Second Strike (should be 7-day suspension)...');
    const strike2Response = await fetch('http://localhost:5000/api/moderation/strikes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=test-admin-session'
      },
      body: JSON.stringify({
        userId: testUserId,
        violationType: 'spam',
        description: 'Test violation 2',
        contentType: 'video',
        contentId: 'test-video-2'
      })
    });

    if (strike2Response.ok) {
      console.log('✅ Second strike issued successfully');
      const userRecord2 = await db.select().from(userStrikes).where(eq(userStrikes.userId, testUserId));
      console.log('📊 After Strike 2:', {
        strikes: userRecord2[0]?.currentStrikes,
        status: userRecord2[0]?.accountStatus,
        suspensionEnd: userRecord2[0]?.suspensionEndDate,
        suspensionDays: userRecord2[0]?.suspensionEndDate ? 
          Math.ceil((new Date(userRecord2[0].suspensionEndDate) - new Date()) / (1000 * 60 * 60 * 24)) : 0
      });
    } else {
      console.log('❌ Second strike failed:', await strike2Response.text());
    }

    // 4. Issue third strike (should be 30-day suspension)
    console.log('\n4. Testing Third Strike (should be 30-day suspension)...');
    const strike3Response = await fetch('http://localhost:5000/api/moderation/strikes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=test-admin-session'
      },
      body: JSON.stringify({
        userId: testUserId,
        violationType: 'harassment',
        description: 'Test violation 3',
        contentType: 'video',
        contentId: 'test-video-3'
      })
    });

    if (strike3Response.ok) {
      console.log('✅ Third strike issued successfully');
      const userRecord3 = await db.select().from(userStrikes).where(eq(userStrikes.userId, testUserId));
      console.log('📊 After Strike 3:', {
        strikes: userRecord3[0]?.currentStrikes,
        status: userRecord3[0]?.accountStatus,
        suspensionEnd: userRecord3[0]?.suspensionEndDate,
        suspensionDays: userRecord3[0]?.suspensionEndDate ? 
          Math.ceil((new Date(userRecord3[0].suspensionEndDate) - new Date()) / (1000 * 60 * 60 * 24)) : 0
      });
    } else {
      console.log('❌ Third strike failed:', await strike3Response.text());
    }

    // 5. Check if suspension enforcement works
    console.log('\n5. Testing Suspension Enforcement...');
    const userTestResponse = await fetch(`http://localhost:5000/api/auth/user`, {
      method: 'GET',
      headers: {
        'Cookie': `test-user-session=${testUserId}` // Simulate suspended user session
      }
    });

    console.log('📊 User access test result:', userTestResponse.status);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Cleanup test user
    console.log('\n6. Cleaning up test user...');
    try {
      await db.delete(violations).where(eq(violations.userId, testUserId));
      await db.delete(userStrikes).where(eq(userStrikes.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
      console.log('✅ Test user cleaned up');
    } catch (cleanupError) {
      console.error('❌ Cleanup failed:', cleanupError);
    }
  }

  await pool.end();
}

testStrikeSystem().catch(console.error);