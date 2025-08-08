// PWA Shortcut Actions Handler
// This handles the shortcut actions defined in manifest.json

export function handlePWAShortcuts() {
  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get('action');

  switch (action) {
    case 'record':
      // Trigger video recording modal
      console.log('PWA: Record video shortcut activated');
      // You can dispatch a custom event here to open video upload modal
      window.dispatchEvent(new CustomEvent('pwa-shortcut-record'));
      break;
      
    case 'treasure':
      // Navigate to nearest treasure or highlight treasures on map
      console.log('PWA: Find treasure shortcut activated');
      window.dispatchEvent(new CustomEvent('pwa-shortcut-treasure'));
      break;
      
    default:
      // No action, normal app startup
      break;
  }
}

// Shortcut event listeners
export function setupPWAShortcutListeners() {
  try {
    // Record video shortcut
    window.addEventListener('pwa-shortcut-record', () => {
      try {
        // Open video upload modal
        const recordButton = document.querySelector('[data-testid="video-upload-button"]');
        if (recordButton) {
          (recordButton as HTMLElement).click();
        }
      } catch (error) {
        console.error('PWA: Error handling record shortcut:', error);
      }
    });

    // Find treasure shortcut
    window.addEventListener('pwa-shortcut-treasure', () => {
      try {
        // Focus on nearest treasure chest or mystery box
        const treasureMarkers = document.querySelectorAll('[data-marker-type="treasure"]');
        if (treasureMarkers.length > 0) {
          // Highlight the first treasure
          const firstTreasure = treasureMarkers[0] as HTMLElement;
          firstTreasure.style.animation = 'pulse 2s infinite';
          setTimeout(() => {
            firstTreasure.style.animation = '';
          }, 4000);
        }
      } catch (error) {
        console.error('PWA: Error handling treasure shortcut:', error);
      }
    });
  } catch (error) {
    console.error('PWA: Error setting up shortcut listeners:', error);
  }
}

// Handle URL-based navigation from shortcuts
export function handleShortcutNavigation() {
  try {
    // Check if app was opened via shortcut
    if (window.location.search.includes('action=')) {
      handlePWAShortcuts();
      
      // Clean up URL after handling shortcut
      const url = new URL(window.location.href);
      url.searchParams.delete('action');
      window.history.replaceState({}, document.title, url.toString());
    }
  } catch (error) {
    console.error('PWA: Error handling shortcut navigation:', error);
  }
}