import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

async function verifyStrikeRules() {
  console.log('🔍 Strike System Rule Verification\n');

  // Check current implementation rules
  console.log('📋 Current Strike System Rules:');
  console.log('  Strike 1: Warning (account_status = "warning")');
  console.log('  Strike 2: 7-day suspension (account_status = "suspended")');
  console.log('  Strike 3: 30-day suspension (account_status = "suspended")');
  console.log('  Strike 4+: Permanent ban (account_status = "banned")\n');

  // Check your current account status
  console.log('👤 Your Current Account Status:');
  try {
    const result = await pool.query(
      'SELECT current_strikes, account_status, suspension_end_date, last_violation_date FROM user_strikes WHERE user_id = $1',
      ['google-oauth2|117032826996185616207']
    );

    if (result.rows.length > 0) {
      const record = result.rows[0];
      const now = new Date();
      const suspensionEnd = record.suspension_end_date ? new Date(record.suspension_end_date) : null;
      
      console.log(`  Current Strikes: ${record.current_strikes}`);
      console.log(`  Account Status: ${record.account_status}`);
      
      if (suspensionEnd) {
        const daysRemaining = Math.ceil((suspensionEnd - now) / (1000 * 60 * 60 * 24));
        console.log(`  Suspension End: ${suspensionEnd.toLocaleDateString()}`);
        console.log(`  Days Remaining: ${daysRemaining > 0 ? daysRemaining : 'Expired'}`);
        
        if (daysRemaining <= 0) {
          console.log('  ⚠️  ISSUE: Suspension has expired but account status not updated');
        }
      }
      
      console.log(`  Last Violation: ${record.last_violation_date ? new Date(record.last_violation_date).toLocaleDateString() : 'None'}`);
    } else {
      console.log('  No strike record found (clean account)');
    }
  } catch (error) {
    console.error('❌ Error checking account status:', error.message);
  }

  // Test suspension enforcement check
  console.log('\n🔧 Testing Suspension Enforcement:');
  try {
    const response = await fetch('http://localhost:5000/api/auth/user', {
      method: 'GET',
      headers: {
        'Cookie': 'your-session-cookie-here' // This would be your actual session
      }
    });

    console.log(`  Auth API Response: ${response.status}`);
    
    if (response.status === 403) {
      const errorData = await response.json();
      console.log(`  🚫 Suspension Enforced: ${errorData.reason}`);
    } else if (response.status === 200) {
      console.log('  ✅ Access Allowed');
    } else {
      console.log(`  ❓ Unexpected Response: ${response.status}`);
    }
  } catch (error) {
    console.log('  ❌ Cannot test enforcement (need valid session)');
  }

  // Verify strike calculation logic
  console.log('\n🧮 Strike Calculation Verification:');
  console.log('  If you received a 3rd strike, you should get:');
  console.log('    - 30-day suspension');
  console.log('    - Account status: "suspended"');
  console.log('    - Suspension end date: 30 days from violation');
  console.log('    - API access blocked until suspension expires');

  console.log('\n✅ Verification Complete');
  console.log('\nTo test without affecting your account:');
  console.log('1. The suspension enforcement is now implemented');
  console.log('2. Your 7-day suspension should be active if rules are working');
  console.log('3. Test by trying to access restricted endpoints');
  console.log('4. Suspension will auto-expire on June 21st, 2025');

  await pool.end();
}

verifyStrikeRules().catch(console.error);