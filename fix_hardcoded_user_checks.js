/**
 * FIX HARDCODED USER ID CHECKS
 * 
 * This script fixes all hardcoded user ID checks in routes.ts
 * to use the proper multi-provider authentication system
 */

import { promises as fs } from 'fs';
import * as path from "node:path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixHardcodedUserChecks() {
  console.log('🔧 FIXING HARDCODED USER ID CHECKS IN ROUTES.TS\n');
  
  const filePath = path.join(__dirname, 'server', 'routes.ts');
  let content = await fs.readFile(filePath, 'utf8');
  let fixCount = 0;
  
  // Pattern to find hardcoded user ID checks
  const patterns = [
    {
      // Pattern 1: Simple hardcoded check
      find: /if \(userId === "43317410"\) \{\s*targetUserId = "google-oauth2\|117032826996185616207";\s*\} else \{\s*targetUserId = `google-oauth2\|\$\{userId\}`;\s*\}/g,
      replace: `// Use the multi-provider user ID mapping system
      const targetUserId = mapUserIdForDatabase(req.user.claims);
      const providerInfo = getUserProviderInfo(targetUserId);`
    },
    {
      // Pattern 2: Inline conditional
      find: /userId === "43317410" \? "google-oauth2\|117032826996185616207" : `google-oauth2\|\$\{userId\}`/g,
      replace: `mapUserIdForDatabase(req.user.claims)`
    },
    {
      // Pattern 3: Simple assignment
      find: /let targetUserId = userId;\s*if \(userId === "43317410"\)/g,
      replace: `// Use the multi-provider user ID mapping system
      const targetUserId = mapUserIdForDatabase(req.user.claims);
      const providerInfo = getUserProviderInfo(targetUserId);
      
      if (false) // This check is no longer needed`
    }
  ];
  
  // Apply all patterns
  patterns.forEach(pattern => {
    const matches = content.match(pattern.find);
    if (matches) {
      content = content.replace(pattern.find, pattern.replace);
      fixCount += matches.length;
    }
  });
  
  // Count remaining hardcoded checks
  const remainingChecks = (content.match(/userId === "43317410"/g) || []).length;
  
  console.log(`✅ Fixed ${fixCount} hardcoded user ID patterns`);
  console.log(`⚠️  ${remainingChecks} instances of 'userId === "43317410"' still remain`);
  
  if (remainingChecks > 0) {
    console.log('\n🔍 REMAINING INSTANCES TO FIX MANUALLY:');
    
    // Find line numbers of remaining instances
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('userId === "43317410"')) {
        console.log(`   Line ${index + 1}: ${line.trim()}`);
      }
    });
  }
  
  // Write the fixed content back
  await fs.writeFile(filePath, content, 'utf8');
  
  console.log('\n📋 RECOMMENDATIONS:');
  console.log('1. Review the remaining instances and fix them manually');
  console.log('2. Ensure all endpoints use mapUserIdForDatabase() from userIdMapper');
  console.log('3. Test all create/edit functionality after deployment');
  console.log('4. Remove the old auth0Service.ts file to prevent confusion');
  
  console.log('\n✅ Partial fix completed. Manual review needed for remaining instances.');
}

fixHardcodedUserChecks().catch(console.error);