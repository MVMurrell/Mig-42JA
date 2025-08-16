// PWA Service Worker Registration and Management

interface PWAUpdateEvent {
  type: 'updateAvailable' | 'updateInstalled' | 'offline' | 'online';
  details?: any;
}

type PWAEventListener = (event: PWAUpdateEvent) => void;

class PWAManager {
  private registration: ServiceWorkerRegistration | null = null;
  private listeners: PWAEventListener[] = [];
  private isOnline = navigator.onLine;

  constructor() {
    // Use setTimeout to avoid blocking and handle initialization asynchronously
    setTimeout(() => {
      this.init().catch(error => {
        console.error('PWA: Failed to initialize:', error);
      });
    }, 100);
  }

  private async init() {
    try {
      // Register service worker
      await this.registerServiceWorker();
      
      // Setup online/offline listeners
      this.setupNetworkListeners();
      
      // Check for updates periodically
      this.setupUpdateChecker();
    } catch (error) {
      console.error('PWA: Initialization error:', error);
    }
  }

  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        console.log('PWA: Registering service worker...');
        
        this.registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        console.log('PWA: Service worker registered successfully');

        // Listen for service worker updates (simplified)
        if (this.registration.waiting) {
          // Update available immediately
          console.log('PWA: Update available');
        }

        // Listen for service worker messages
        navigator.serviceWorker.addEventListener('message', (event) => {
          try {
            console.log('PWA: Message from service worker:', event.data);
          } catch (error) {
            console.error('PWA: Error handling service worker message:', error);
          }
        });

      } catch (error) {
        console.error('PWA: Service worker registration failed:', error);
      }
    } else {
      console.log('PWA: Service workers not supported');
    }
  }

  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners({ type: 'online' });
      console.log('PWA: Back online');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners({ type: 'offline' });
      console.log('PWA: Gone offline');
    });
  }

  private setupUpdateChecker() {
    // Check for updates every 30 minutes
    setInterval(() => {
      this.checkForUpdates();
    }, 30 * 60 * 1000);

    // Also check when page becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkForUpdates();
      }
    });
  }

  public async checkForUpdates() {
    if (this.registration) {
      try {
        await this.registration.update();
        console.log('PWA: Checked for updates');
      } catch (error) {
        console.error('PWA: Update check failed:', error);
      }
    }
  }

  public async activateUpdate() {
    if (this.registration?.waiting) {
      // Tell the waiting service worker to skip waiting
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Reload the page to activate the new service worker
      window.location.reload();
    }
  }

  public addEventListener(listener: PWAEventListener) {
    this.listeners.push(listener);
  }

  public removeEventListener(listener: PWAEventListener) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  private notifyListeners(event: PWAUpdateEvent) {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('PWA: Error in event listener:', error);
      }
    });
  }

  public getNetworkStatus() {
    return {
      isOnline: this.isOnline,
      connection: (navigator as any).connection
    };
  }

  // Background sync for offline actions
  public async requestBackgroundSync(tag: string) {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        // await this.registration?.sync.register(tag);
        // client/src/lib/pwa.ts
        (await navigator.serviceWorker.ready as any).sync?.register("jemzy-sync");
        console.log('PWA: Background sync registered:', tag);
        return true;
      } catch (error) {
        console.error('PWA: Background sync registration failed:', error);
        return false;
      }
    }
    return false;
  }

  // Add to home screen prompt management
  public async promptInstall() {
    // This will be handled by the PWAInstaller component
    // which listens for the beforeinstallprompt event
    console.log('PWA: Install prompt requested');
  }

  // Cache management
  public async clearCache() {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(name => name.startsWith('jemzy-'))
          .map(name => caches.delete(name))
      );
      console.log('PWA: Cache cleared');
    }
  }

  // Offline data management
  public async queueOfflineAction(action: any) {
    const offlineQueue = JSON.parse(localStorage.getItem('offline-queue') || '[]');
    offlineQueue.push({
      ...action,
      timestamp: Date.now(),
      id: Math.random().toString(36).substr(2, 9)
    });
    localStorage.setItem('offline-queue', JSON.stringify(offlineQueue));
    
    // Try to sync if back online
    if (this.isOnline) {
      await this.processOfflineQueue();
    }
  }

  public async processOfflineQueue() {
    const offlineQueue = JSON.parse(localStorage.getItem('offline-queue') || '[]');
    if (offlineQueue.length === 0) return;

    console.log('PWA: Processing offline queue:', offlineQueue.length, 'items');
    
    const processed = [];
    
    for (const action of offlineQueue) {
      try {
        // Process each queued action
        await this.processQueuedAction(action);
        processed.push(action.id);
      } catch (error) {
        console.error('PWA: Failed to process queued action:', error);
      }
    }

    // Remove processed items
    const remainingQueue = offlineQueue.filter((action: any) => !processed.includes(action.id));
    localStorage.setItem('offline-queue', JSON.stringify(remainingQueue));
  }

  private async processQueuedAction(action: any) {
    // Implement specific action processing based on action type
    switch (action.type) {
      case 'video-upload':
        // Process video upload
        break;
      case 'treasure-collection':
        // Process treasure collection
        break;
      case 'video-like':
        // Process video like
        break;
      default:
        console.log('PWA: Unknown queued action type:', action.type);
    }
  }
}

// Export singleton instance
export const pwaManager = new PWAManager();

// Export PWA utilities
export const PWA = {
  // Check if app is installed
  isInstalled: () => {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  },

  // Check if running on mobile
  isMobile: () => {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },

  // Check if iOS
  isIOS: () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  },

  // Check if Android
  isAndroid: () => {
    return /Android/i.test(navigator.userAgent);
  },

  // Get display mode
  getDisplayMode: () => {
    if (window.matchMedia('(display-mode: standalone)').matches) return 'standalone';
    if (window.matchMedia('(display-mode: minimal-ui)').matches) return 'minimal-ui';
    if (window.matchMedia('(display-mode: fullscreen)').matches) return 'fullscreen';
    return 'browser';
  },

  // Share API
  canShare: () => {
    return 'share' in navigator;
  },

  share: async (data: ShareData) => {
    if ('share' in navigator) {
      try {
        await navigator.share(data);
        return true;
      } catch (error) {
        console.error('PWA: Share failed:', error);
        return false;
      }
    }
    return false;
  }
};

console.log('PWA: Manager initialized');