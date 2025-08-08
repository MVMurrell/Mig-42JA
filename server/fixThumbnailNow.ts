// Quick script to fix the "Best app bois" thumbnail
import { thumbnailFixer } from './thumbnailFixer.js';

async function fixNow() {
  try {
    console.log('Fixing thumbnail for Best app bois video...');
    const success = await thumbnailFixer.fixSingleVideo('a033bd14-a4bd-4b0c-b08e-bc439d784546');
    console.log(`Result: ${success ? 'SUCCESS' : 'FAILED'}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

fixNow();