/**
 * FIX REMAINING REDECLARATION ERRORS
 * 
 * This script fixes the remaining redeclaration errors in routes.ts
 */

import { promises as fs } from 'fs';
import * as path from "node:path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixRemainingRedeclarations() {
  console.log('🔧 FIXING REMAINING REDECLARATION ERRORS\n');
  
  const filePath = path.join(__dirname, 'server', 'routes.ts');
  let content = await fs.readFile(filePath, 'utf8');
  const lines = content.split('\n');
  
  // Pattern to match: lines that have "let targetUserId = userId;" followed by
  // "const targetUserId = mapUserIdForDatabase(req.user.claims);"
  
  let fixCount = 0;
  let newLines = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // Check if this line matches the problematic pattern
    if (line.includes('let targetUserId = userId;') || 
        line.includes('let targetUserId = rawUserId;')) {
      // Look ahead to see if there's a const declaration
      let foundConstDeclaration = false;
      let j = i + 1;
      
      while (j < lines.length && j < i + 5) {
        if (lines[j].includes('const targetUserId = mapUserIdForDatabase(req.user.claims);')) {
          foundConstDeclaration = true;
          break;
        }
        j++;
      }
      
      if (foundConstDeclaration) {
        console.log(`Found redeclaration pattern at line ${i + 1}`);
        // Skip the let declaration and any comments between
        while (i < j) {
          if (!lines[i].includes('let targetUserId')) {
            newLines.push(lines[i]); // Keep comments
          }
          i++;
        }
        fixCount++;
        continue;
      }
    }
    
    // Check for similar pattern with formattedUserId
    if (line.includes('let formattedUserId =')) {
      // Look ahead for const declaration
      let foundConstDeclaration = false;
      let j = i + 1;
      
      while (j < lines.length && j < i + 5) {
        if (lines[j].includes('const formattedUserId = mapUserIdForDatabase(req.user.claims);')) {
          foundConstDeclaration = true;
          break;
        }
        j++;
      }
      
      if (foundConstDeclaration) {
        console.log(`Found formattedUserId redeclaration at line ${i + 1}`);
        // Skip the let declaration
        while (i < j) {
          if (!lines[i].includes('let formattedUserId')) {
            newLines.push(lines[i]);
          }
          i++;
        }
        fixCount++;
        continue;
      }
    }
    
    newLines.push(line);
    i++;
  }
  
  // Write the fixed content
  const fixedContent = newLines.join('\n');
  await fs.writeFile(filePath, fixedContent, 'utf8');
  
  console.log(`\n✅ Fixed ${fixCount} redeclaration patterns`);
}

fixRemainingRedeclarations().catch(console.error);