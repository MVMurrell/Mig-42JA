/**
 * CAREFUL FIX FOR HARDCODED USER ID CHECKS
 * 
 * This script carefully fixes hardcoded user ID checks in routes.ts
 * without breaking the code structure.
 */

import { promises as fs } from 'fs';
import * as path from "node:path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixRoutesCarefully() {
  console.log('🔧 CAREFULLY FIXING HARDCODED USER ID CHECKS IN ROUTES.TS\n');
  
  const filePath = path.join(__dirname, 'server', 'routes.ts');
  let content = await fs.readFile(filePath, 'utf8');
  
  // Backup the current content
  await fs.writeFile(filePath + '.backup', content, 'utf8');
  console.log('✅ Created backup at routes.ts.backup');
  
  // Count instances before fix
  const beforeCount = (content.match(/userId === "43317410"/g) || []).length;
  console.log(`📊 Found ${beforeCount} instances of hardcoded user ID checks\n`);
  
  // Find all instances and their context
  const lines = content.split('\n');
  const instances = [];
  
  lines.forEach((line, index) => {
    if (line.includes('userId === "43317410"')) {
      // Get context (5 lines before and after)
      const start = Math.max(0, index - 5);
      const end = Math.min(lines.length - 1, index + 10);
      
      instances.push({
        lineNumber: index + 1,
        line: line,
        context: lines.slice(start, end + 1),
        contextStart: start
      });
    }
  });
  
  console.log('🔍 ANALYZING INSTANCES:\n');
  
  instances.forEach((instance, idx) => {
    console.log(`Instance ${idx + 1} at line ${instance.lineNumber}:`);
    console.log('Pattern:', instance.line.trim());
    
    // Check if this is part of a typical hardcoded pattern
    let patternType = 'unknown';
    const contextStr = instance.context.join('\n');
    
    if (contextStr.includes('google-oauth2|117032826996185616207') && 
        contextStr.includes('`google-oauth2|${userId}`')) {
      patternType = 'standard-mapping';
    } else if (contextStr.includes('req.user.email === "jemzyapp@gmail.com"')) {
      patternType = 'email-check';
    }
    
    console.log('Pattern type:', patternType);
    console.log('---\n');
  });
  
  // Apply targeted fixes
  let fixCount = 0;
  
  // Pattern 1: Standard mapping pattern
  const standardPattern = /let\s+(\w+)\s*=\s*(\w+);\s*\n\s*if\s*\(\s*\2\s*===\s*"43317410"\s*\)\s*{\s*\n\s*\1\s*=\s*"google-oauth2\|117032826996185616207";\s*\n[^}]*}\s*else\s*{\s*\n\s*(?:\/\/[^\n]*\n\s*)?\1\s*=\s*`google-oauth2\|\${\2}`;\s*\n\s*}/g;
  
  content = content.replace(standardPattern, (match, varName, originalVar) => {
    fixCount++;
    return `// Use the multi-provider user ID mapping system
      const ${varName} = mapUserIdForDatabase(req.user.claims);
      const providerInfo = getUserProviderInfo(${varName});
      
      console.log('🔐 Multi-provider user mapping:', {
        userId: ${varName},
        provider: providerInfo.provider,
        providerDisplayName: providerInfo.provider ? getProviderDisplayName(providerInfo.provider) : 'Unknown'
      });`;
  });
  
  // Count remaining instances
  const afterCount = (content.match(/userId === "43317410"/g) || []).length;
  
  console.log(`\n✅ Fixed ${fixCount} instances`);
  console.log(`⚠️  ${afterCount} instances still remain`);
  
  if (afterCount > 0) {
    console.log('\n📋 MANUAL FIXES NEEDED:');
    console.log('The remaining instances need manual review as they have non-standard patterns.');
    console.log('Common fix pattern:');
    console.log(`
Replace:
  let targetUserId = userId;
  if (userId === "43317410") {
    targetUserId = "google-oauth2|117032826996185616207";
  } else {
    targetUserId = \`google-oauth2|\${userId}\`;
  }

With:
  // Use the multi-provider user ID mapping system
  const targetUserId = mapUserIdForDatabase(req.user.claims);
  const providerInfo = getUserProviderInfo(targetUserId);
`);
  }
  
  // Write the fixed content back
  await fs.writeFile(filePath, content, 'utf8');
  
  console.log('\n✅ Partial fix completed. Review routes.ts.backup if needed.');
}

fixRoutesCarefully().catch(console.error);