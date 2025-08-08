/**
 * TEST: Audio False Positive Fix Verification
 * 
 * This test verifies that the false positive issue with innocent content 
 * like "Oh, hello there. World." has been fixed in the content moderation system.
 */

import { contentModerationService } from './dist/server/contentModerationService.js';

async function testAudioFalsePositiveFix() {
  console.log('🧪 TESTING: Audio moderation false positive fix\n');

  // Test cases that should be APPROVED (previously false positives)
  const innocentTexts = [
    "Oh, hello there. World.",
    "Hello hello hello",
    "Good morning everyone",
    "Hi there, how are you?",
    "Love your boo boo",
    "Hello world, nice to see you",
    "Take care, see you later",
    "Good afternoon, what's up?",
    "Hey there, world"
  ];

  // Test cases that should still be REJECTED (actual violations)
  const inappropriateTexts = [
    "fuck you",
    "kill yourself", 
    "you're a fucking bitch",
    "test inappropriate content"
  ];

  console.log('✅ TESTING INNOCENT CONTENT (should be APPROVED):');
  for (const text of innocentTexts) {
    try {
      const result = await contentModerationService.moderateText(text, 'video');
      const status = result.isApproved ? '✅ APPROVED' : '❌ REJECTED';
      console.log(`${status}: "${text}"`);
      if (!result.isApproved) {
        console.log(`   ⚠️  Reason: ${result.reason}`);
      }
    } catch (error) {
      console.log(`❌ ERROR: "${text}" - ${error.message}`);
    }
  }

  console.log('\n🚫 TESTING INAPPROPRIATE CONTENT (should be REJECTED):');
  for (const text of inappropriateTexts) {
    try {
      const result = await contentModerationService.moderateText(text, 'video');
      const status = result.isApproved ? '⚠️  APPROVED' : '✅ REJECTED';
      console.log(`${status}: "${text}"`);
      if (!result.isApproved) {
        console.log(`   Reason: ${result.reason}`);
      }
    } catch (error) {
      console.log(`❌ ERROR: "${text}" - ${error.message}`);
    }
  }

  console.log('\n🎯 FALSE POSITIVE FIX STATUS:');
  
  // Test the specific case that was incorrectly rejected
  try {
    const problematicCase = "Oh, hello there. World.";
    const result = await contentModerationService.moderateText(problematicCase, 'video');
    
    if (result.isApproved) {
      console.log('✅ SUCCESS: False positive fix is working!');
      console.log(`   "${problematicCase}" is now correctly APPROVED`);
    } else {
      console.log('❌ ISSUE: False positive still exists');
      console.log(`   "${problematicCase}" is still being REJECTED`);
      console.log(`   Reason: ${result.reason}`);
    }
  } catch (error) {
    console.log('❌ ERROR: Cannot test false positive fix:', error.message);
  }

  console.log('\n📊 MODERATION CONFIGURATION:');
  console.log(JSON.stringify(contentModerationService.getConfiguration(), null, 2));
}

// Run the test
testAudioFalsePositiveFix().catch(console.error);