/**
 * TEST: Content Moderation False Positive Fix
 * 
 * This script tests the improved content moderation system to ensure
 * innocent content like "love your boo boo" is properly approved.
 */

import { contentModerationService } from './server/contentModerationService.ts';
import { fileURLToPath } from "url";
import * as path from "node:path";


async function testContentModerationFix() {
  console.log('🧪 TESTING: Content Moderation False Positive Fix');
  console.log('=================================================');

  const testCases = [
    // Previously problematic cases that should now pass
    { text: "love your boo boo", expected: true, description: "Innocent baby talk" },
    { text: "hello hello hello", expected: true, description: "Repeated greetings" },
    { text: "boo", expected: true, description: "Simple exclamation" },
    { text: "boo boo", expected: true, description: "Baby talk for injury" },
    { text: "I love my baby", expected: true, description: "Innocent family content" },
    { text: "hello world", expected: true, description: "Basic greeting" },
    { text: "cute little baby", expected: true, description: "Innocent description" },
    
    // These should still be flagged appropriately
    { text: "fuck you", expected: false, description: "Clear profanity" },
    { text: "nazi propaganda", expected: false, description: "Hate speech" },
    { text: "kill yourself", expected: false, description: "Violent threat" },
    
    // Edge cases
    { text: "this is a test", expected: true, description: "Neutral test content" },
    { text: "amazing content", expected: true, description: "Positive content" },
    { text: "", expected: true, description: "Empty content" }
  ];

  const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


  let passCount = 0;
  let failCount = 0;

  for (const testCase of testCases) {
    try {
      console.log(`\n🔍 Testing: "${testCase.text}" (${testCase.description})`);
      
      const result = await contentModerationService.moderateText(testCase.text, 'video');
      const passed = result.isApproved === testCase.expected;
      
      if (passed) {
        console.log(`✅ PASS: Expected ${testCase.expected ? 'approved' : 'rejected'}, got ${result.isApproved ? 'approved' : 'rejected'}`);
        passCount++;
      } else {
        console.log(`❌ FAIL: Expected ${testCase.expected ? 'approved' : 'rejected'}, got ${result.isApproved ? 'approved' : 'rejected'}`);
        if (result.reason) {
          console.log(`   Reason: ${result.reason}`);
        }
        failCount++;
      }
    } catch (error) {
      console.error(`🚨 ERROR testing "${testCase.text}":`, error.message);
      failCount++;
    }
  }

  console.log('\n📊 TEST RESULTS:');
  console.log('=================');
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📈 Success Rate: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);

  if (failCount === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Content moderation false positive fix is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Content moderation may need further adjustment.');
  }

  return { passCount, failCount };
}

if (process.argv[1] === __filename) {
  testContentModerationFix().catch(console.error);
}

module.exports = { testContentModerationFix };