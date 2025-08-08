/**
 * TRIGGER: Manually trigger the pending AI processor
 * 
 * This script manually triggers the processor to test if it can handle the stuck thread message
 */

async function triggerPendingProcessor() {
  console.log('🔧 TRIGGER: Manually triggering pending AI processor...');
  
  try {
    // Import required modules dynamically since we're dealing with ES modules
    const { PendingAIProcessor } = await import('./server/pendingAIProcessor.js');
    
    // Create processor instance
    const processor = new PendingAIProcessor();
    
    console.log('🎯 TRIGGER: Starting manual monitoring cycle...');
    
    // Run one monitoring cycle
    await processor.monitorAndProcessStuckContent();
    
    console.log('✅ TRIGGER: Manual monitoring cycle completed');
    
  } catch (error) {
    console.error('❌ TRIGGER: Failed to trigger processor:', error.message);
    console.error('Stack:', error.stack);
  }
}

triggerPendingProcessor().catch(console.error);