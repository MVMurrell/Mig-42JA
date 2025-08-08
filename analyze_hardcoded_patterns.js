/**
 * ANALYZE HARDCODED USER ID PATTERNS
 * 
 * This script analyzes the hardcoded user ID patterns to understand
 * what needs to be fixed without breaking the code.
 */

import { promises as fs } from 'fs';
import * as path from "node:path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function analyzeHardcodedPatterns() {
  console.log('🔍 ANALYZING HARDCODED USER ID PATTERNS\n');
  
  const filePath = path.join(__dirname, 'server', 'routes.ts');
  const content = await fs.readFile(filePath, 'utf8');
  const lines = content.split('\n');
  
  // Find all instances of hardcoded checks
  const hardcodedInstances = [];
  
  lines.forEach((line, index) => {
    if (line.includes('userId === "43317410"')) {
      // Get surrounding context
      const start = Math.max(0, index - 10);
      const end = Math.min(lines.length - 1, index + 10);
      const context = lines.slice(start, end + 1);
      
      // Analyze the pattern
      let patternInfo = {
        lineNumber: index + 1,
        line: line.trim(),
        endpoint: 'unknown',
        variableName: 'unknown',
        contextLines: context
      };
      
      // Try to find the endpoint
      for (let i = start; i < index; i++) {
        const contextLine = lines[i];
        if (contextLine.includes('app.post(') || contextLine.includes('app.get(') || 
            contextLine.includes('app.put(') || contextLine.includes('app.delete(') ||
            contextLine.includes('app.patch(')) {
          const match = contextLine.match(/app\.\w+\(['"]([^'"]+)['"]/);
          if (match) {
            patternInfo.endpoint = match[1];
            break;
          }
        }
      }
      
      // Find the variable being assigned
      const contextStr = context.join('\n');
      const varMatch = contextStr.match(/let\s+(\w+)\s*=\s*\w+;\s*\n\s*if\s*\(\w+\s*===\s*"43317410"/);
      if (varMatch) {
        patternInfo.variableName = varMatch[1];
      }
      
      hardcodedInstances.push(patternInfo);
    }
  });
  
  console.log(`📊 Found ${hardcodedInstances.length} hardcoded user ID checks\n`);
  
  // Group by endpoint
  const byEndpoint = {};
  hardcodedInstances.forEach(instance => {
    if (!byEndpoint[instance.endpoint]) {
      byEndpoint[instance.endpoint] = [];
    }
    byEndpoint[instance.endpoint].push(instance);
  });
  
  console.log('🔧 AFFECTED ENDPOINTS:\n');
  Object.entries(byEndpoint).forEach(([endpoint, instances]) => {
    console.log(`${endpoint}: ${instances.length} instance(s)`);
    instances.forEach(inst => {
      console.log(`  - Line ${inst.lineNumber}: ${inst.variableName}`);
    });
  });
  
  console.log('\n📝 RECOMMENDED FIX PATTERN:\n');
  console.log('Replace this pattern:');
  console.log(`
let targetUserId = userId;
if (userId === "43317410") {
  targetUserId = "google-oauth2|117032826996185616207";
} else {
  targetUserId = \`google-oauth2|\${userId}\`;
}
`);
  
  console.log('With this:');
  console.log(`
// Use the multi-provider user ID mapping system
const targetUserId = mapUserIdForDatabase(req.user.claims);
const providerInfo = getUserProviderInfo(targetUserId);

console.log('🔐 Multi-provider user mapping:', {
  userId: targetUserId,
  provider: providerInfo.provider,
  providerDisplayName: providerInfo.provider ? getProviderDisplayName(providerInfo.provider) : 'Unknown'
});
`);
  
  console.log('\n⚠️  CRITICAL ENDPOINTS TO FIX FIRST:');
  console.log('1. /api/auth/user - Main authentication');
  console.log('2. /api/upload/profile-picture - Profile picture upload');
  console.log('3. /api/users/me/profile - Profile data');
  console.log('4. /api/users/profile - Profile updates');
  console.log('5. /api/videos/upload/chunk/* - Video uploads');
  
  // Save analysis to file
  const analysis = {
    totalInstances: hardcodedInstances.length,
    byEndpoint,
    instances: hardcodedInstances.map(inst => ({
      line: inst.lineNumber,
      endpoint: inst.endpoint,
      variable: inst.variableName
    }))
  };
  
  await fs.writeFile('hardcoded_analysis.json', JSON.stringify(analysis, null, 2));
  console.log('\n✅ Full analysis saved to hardcoded_analysis.json');
}

analyzeHardcodedPatterns().catch(console.error);