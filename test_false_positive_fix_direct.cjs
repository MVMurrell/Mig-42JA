/**
 * DIRECT TEST: False Positive Fix for Audio Moderation
 * 
 * This script directly tests the enhanced content moderation service
 * with the specific video content that was incorrectly rejected.
 */

// Test the moderation service directly through the API endpoint
import { request as fetch } from "http";

async function testFalsePositiveFix() {
  console.log('🧪 TESTING: Enhanced audio moderation false positive fix\n');

  // Test cases that should be approved (previously false positives)
  const testCases = [
    "Hello. Hi. How are you doing?",
    "Oh, hello there. World.",
    "Good morning everyone!",
    "Hi there, how's it going?",
    "Hello hello hello",
    "Nice to meet you"
  ];

  console.log('Testing innocent greeting phrases that were previously incorrectly rejected:\n');

  for (const testText of testCases) {
    console.log(`📝 Testing: "${testText}"`);
    
    try {
      const result = await contentModerationService.moderateText(testText, 'video');
      
      if (result.isApproved) {
        console.log(`✅ APPROVED: ${result.reason || 'Passed moderation'}`);
      } else {
        console.log(`❌ REJECTED: ${result.reason || 'Failed moderation'}`);
        console.log(`   Toxicity Score: ${result.toxicityScore || 'N/A'}`);
      }
    } catch (error) {
      console.log(`⚠️  ERROR: ${error.message}`);
    }
    
    console.log(''); // Empty line for readability
  }

  console.log('🔍 SUMMARY: The innocent content detection should now prevent false positives');
  console.log('✅ If all test cases above show APPROVED, the fix is working correctly');
}

testFalsePositiveFix().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});