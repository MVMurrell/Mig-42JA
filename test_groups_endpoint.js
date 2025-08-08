/**
 * TEST: Groups Endpoint Authentication Debug
 * 
 * This tests the groups endpoint to see if authentication is working properly
 * for the Android user experiencing issues.
 */

import { Storage } from './server/storage.ts.js';
import { createConnection } from './server/database.ts.js';

async function testGroupsEndpoint() {
  try {
    console.log('🔍 TESTING: Groups endpoint authentication debug');
    
    // Test database connection
    const db = await createConnection();
    console.log('✅ Database connection established');
    
    // Test storage layer
    const storage = new Storage(db);
    
    // Test getGroupsByLocation method directly
    console.log('🔍 Testing getGroupsByLocation with test coordinates...');
    const groups = await storage.getGroupsByLocation(36.057, -94.160, 10, 'google-oauth2|117032826996185616207');
    
    console.log(`✅ Found ${groups.length} groups in storage layer`);
    if (groups.length > 0) {
      console.log('Sample group:', groups[0]);
    }
    
    // Test authentication middleware by checking user session
    console.log('\n🔍 Testing authentication middleware...');
    
    // Test if any sessions exist
    const sessionCheck = await db.query('SELECT COUNT(*) as count FROM sessions');
    console.log('Session count in database:', sessionCheck.rows[0]?.count || 0);
    
    // Test if user exists in proper format
    const userCheck = await db.query('SELECT id, email FROM users WHERE id = $1', ['google-oauth2|117032826996185616207']);
    console.log('User exists in database:', userCheck.rows.length > 0);
    if (userCheck.rows.length > 0) {
      console.log('User data:', userCheck.rows[0]);
    }
    
    // Test group memberships
    const membershipCheck = await db.query('SELECT COUNT(*) as count FROM group_memberships WHERE user_id = $1', ['google-oauth2|117032826996185616207']);
    console.log('User group memberships:', membershipCheck.rows[0]?.count || 0);
    
    console.log('\n✅ Groups endpoint debug test completed');
    
  } catch (error) {
    console.error('❌ Error in groups endpoint test:', error);
  }
}

testGroupsEndpoint();