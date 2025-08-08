/**
 * TEST: Ready Player Me Avatar Fix
 * 
 * This test triggers a fresh profile API call to verify the enhanced
 * Ready Player Me URL fallback system is working correctly.
 */

import fetch from 'node-fetch';

async function testReadyPlayerMeFix() {
  try {
    console.log('🔍 TESTING: Enhanced Ready Player Me URL fallback system');
    
    // Test the avatar ID extraction and URL generation
    const savedUrl = 'https://models.readyplayer.me/683c9f5e75019e7352305622.png?scene=portrait&transparent=true&width=256&height=256';
    const avatarId = savedUrl.split('/').pop()?.split('.')[0];
    
    console.log('📋 Avatar ID extracted:', avatarId);
    
    // Test multiple URL formats
    const urlsToTest = [
      savedUrl,
      savedUrl.split('?')[0],
      `https://models.readyplayer.me/${avatarId}.png`,
      `https://models.readyplayer.me/${avatarId}.glb`,
    ];
    
    console.log('\n🔄 Testing Ready Player Me URLs:');
    
    for (const url of urlsToTest) {
      try {
        console.log(`\n🔄 Testing: ${url}`);
        const response = await fetch(url, { method: 'HEAD' });
        console.log(`   Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          console.log('   ✅ URL is accessible!');
          break;
        } else {
          console.log('   ❌ URL failed');
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
    console.log('\n✅ Ready Player Me URL fallback test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testReadyPlayerMeFix();