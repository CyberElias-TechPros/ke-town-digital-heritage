export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface PWAInstallPrompt {
  isSupported: boolean;
  isInstalled: boolean;
  canInstall: boolean;
  prompt: BeforeInstallPromptEvent | null;
}

export interface PWANotificationPermission {
  supported: boolean;
  permission: NotificationPermission;
  canRequest: boolean;
}

export interface PWAInfo {
  isStandalone: boolean;
  isOnline: boolean;
  connectionType?: string;
  effectiveConnectionType?: string;
}

class PWAManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private isOnline = navigator.onLine;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen for beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      console.log('[PWA] Install prompt available');
    });

    // Listen for app installed
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed successfully');
      this.deferredPrompt = null;
    });

    // Listen for online/offline changes
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('[PWA] App is online');
      this.syncOfflineData();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('[PWA] App is offline');
    });

    // Listen for service worker messages
    navigator.serviceWorker?.addEventListener('message', (event) => {
      console.log('[PWA] Message from service worker:', event.data);
    });
  }

  // Register service worker
  async registerServiceWorker(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      console.warn('[PWA] Service workers not supported');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('[PWA] Service worker registered:', registration.scope);
      this.swRegistration = registration;

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        console.log('[PWA] New service worker found');
        const newWorker = registration.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New content available');
              this.notifyUpdate();
            }
          });
        }
      });

      return true;
    } catch (error) {
      console.error('[PWA] Service worker registration failed:', error);
      return false;
    }
  }

  // Check PWA install status
  getInstallStatus(): PWAInstallPrompt {
    const isInstalled = this.checkIsInstalled();
    
    return {
      isSupported: 'beforeinstallprompt' in window,
      isInstalled,
      canInstall: !isInstalled && !!this.deferredPrompt,
      prompt: this.deferredPrompt
    };
  }

  // Check if app is installed
  private checkIsInstalled(): boolean {
    // Check if running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }

    // Check if app is installed in iOS
    if ('standalone' in navigator && (navigator as any).standalone) {
      return true;
    }

    // Check if app is installed in desktop
    if (window.matchMedia('(display-mode: minimal-ui)').matches) {
      return true;
    }

    return false;
  }

  // Prompt for installation
  async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.warn('[PWA] Install prompt not available');
      return false;
    }

    try {
      await this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('[PWA] User accepted install prompt');
        return true;
      } else {
        console.log('[PWA] User dismissed install prompt');
        return false;
      }
    } catch (error) {
      console.error('[PWA] Install prompt failed:', error);
      return false;
    }
  }

  // Request notification permission
  async requestNotificationPermission(): Promise<PWANotificationPermission> {
    const supported = 'Notification' in window;
    
    if (!supported) {
      console.warn('[PWA] Notifications not supported');
      return {
        supported: false,
        permission: 'default',
        canRequest: false
      };
    }

    const permission = Notification.permission;
    const canRequest = permission === 'default';

    if (canRequest) {
      try {
        const newPermission = await Notification.requestPermission();
        console.log('[PWA] Notification permission:', newPermission);
        
        return {
          supported: true,
          permission: newPermission,
          canRequest: false
        };
      } catch (error) {
        console.error('[PWA] Failed to request notification permission:', error);
        return {
          supported: true,
          permission,
          canRequest: false
        };
      }
    }

    return {
      supported: true,
      permission,
      canRequest: false
    };
  }

  // Show notification
  async showNotification(title: string, options?: NotificationOptions): Promise<boolean> {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      console.warn('[PWA] Notifications not available or not granted');
      return false;
    }

    try {
      if (this.swRegistration) {
        await this.swRegistration.showNotification(title, {
          icon: '/icon-192.png',
          badge: '/favicon.ico',
          ...options
        });
      } else {
        new Notification(title, {
          icon: '/icon-192.png',
          badge: '/favicon.ico',
          ...options
        });
      }
      
      console.log('[PWA] Notification shown:', title);
      return true;
    } catch (error) {
      console.error('[PWA] Failed to show notification:', error);
      return false;
    }
  }

  // Get PWA info
  getInfo(): PWAInfo {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    return {
      isStandalone: this.checkIsInstalled(),
      isOnline: this.isOnline,
      connectionType: connection?.type,
      effectiveConnectionType: connection?.effectiveType
    };
  }

  // Sync offline data
  private async syncOfflineData() {
    if (!this.swRegistration) return;

    try {
      // Check if background sync is supported
      if ('sync' in this.swRegistration) {
        // Trigger background sync for posts
        await (this.swRegistration as any).sync.register('background-sync-posts');
        
        // Trigger background sync for messages
        await (this.swRegistration as any).sync.register('background-sync-messages');
        
        console.log('[PWA] Background sync registered');
      } else {
        console.log('[PWA] Background sync not supported');
      }
    } catch (error) {
      console.error('[PWA] Failed to register background sync:', error);
    }
  }

  // Store offline data
  async storeOfflineData(storeName: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ke-kingdom-offline', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const addRequest = store.add(data);
        
        addRequest.onsuccess = () => resolve();
        addRequest.onerror = () => reject(addRequest.error);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      };
    });
  }

  // Get offline data
  async getOfflineData(storeName: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ke-kingdom-offline', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => resolve(getAllRequest.result);
        getAllRequest.onerror = () => reject(getAllRequest.error);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      };
    });
  }

  // Clear offline data
  async clearOfflineData(storeName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ke-kingdom-offline', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const clearRequest = store.clear();
        
        clearRequest.onsuccess = () => resolve();
        clearRequest.onerror = () => reject(clearRequest.error);
      };
    });
  }

  // Check for service worker updates
  async checkForUpdates(): Promise<boolean> {
    if (!this.swRegistration) return false;

    try {
      await this.swRegistration.update();
      console.log('[PWA] Checked for updates');
      return true;
    } catch (error) {
      console.error('[PWA] Failed to check for updates:', error);
      return false;
    }
  }

  // Apply service worker update
  async applyUpdate(): Promise<void> {
    if (!this.swRegistration || !this.swRegistration.waiting) {
      console.warn('[PWA] No waiting service worker');
      return;
    }

    // Send message to waiting service worker to skip waiting
    this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    
    // Reload the page
    window.location.reload();
  }

  // Notify user about update
  private notifyUpdate(): void {
    // You can implement a toast notification or other UI here
    console.log('[PWA] Update available - please refresh');
    
    // Show notification if permitted
    this.showNotification('Update Available', {
      body: 'A new version of KE Kingdom is available!',
      requireInteraction: true
    });
  }

  // Get cache size
  async getCacheSize(): Promise<{ size: number; count: number }> {
    try {
      const cacheNames = await caches.keys();
      let totalSize = 0;
      let totalCount = 0;

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        totalCount += requests.length;

        for (const request of requests) {
          const response = await cache.match(request);
          if (response) {
            const blob = await response.blob();
            totalSize += blob.size;
          }
        }
      }

      return { size: totalSize, count: totalCount };
    } catch (error) {
      console.error('[PWA] Failed to get cache size:', error);
      return { size: 0, count: 0 };
    }
  }

  // Clear all caches
  async clearAllCaches(): Promise<void> {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('[PWA] All caches cleared');
    } catch (error) {
      console.error('[PWA] Failed to clear caches:', error);
    }
  }

  // Share content
  async shareContent(data: ShareData): Promise<boolean> {
    if (!('share' in navigator)) {
      console.warn('[PWA] Web Share API not supported');
      return false;
    }

    try {
      await navigator.share(data);
      console.log('[PWA] Content shared successfully');
      return true;
    } catch (error) {
      console.error('[PWA] Failed to share content:', error);
      return false;
    }
  }

  // Copy to clipboard
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      console.log('[PWA] Text copied to clipboard');
      return true;
    } catch (error) {
      console.error('[PWA] Failed to copy to clipboard:', error);
      return false;
    }
  }

  // Get device info
  getDeviceInfo(): {
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    platform: string;
    userAgent: string;
    language: string;
  } {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();
    
    const isMobile = /mobile|android|iphone|ipod|blackberry|opera mini|iemobile/.test(userAgent);
    const isTablet = /tablet|ipad/.test(userAgent) || (isMobile && screen.width >= 768);
    const isDesktop = !isMobile && !isTablet;
    
    return {
      isMobile,
      isTablet,
      isDesktop,
      platform,
      userAgent: navigator.userAgent,
      language: navigator.language
    };
  }
}

// Create singleton instance
export const pwaManager = new PWAManager();

// React hook for PWA functionality
export function usePWA() {
  const [installStatus, setInstallStatus] = useState<PWAInstallPrompt>({
    isSupported: false,
    isInstalled: false,
    canInstall: false,
    prompt: null
  });
  
  const [notificationPermission, setNotificationPermission] = useState<PWANotificationPermission>({
    supported: false,
    permission: 'default',
    canRequest: false
  });
  
  const [pwaInfo, setPwaInfo] = useState<PWAInfo>({
    isStandalone: false,
    isOnline: navigator.onLine
  });

  useEffect(() => {
    // Initialize PWA
    pwaManager.registerServiceWorker();
    
    // Update states periodically
    const updateStates = async () => {
      setInstallStatus(pwaManager.getInstallStatus());
      const notifPermission = await pwaManager.requestNotificationPermission();
      setNotificationPermission(notifPermission);
      setPwaInfo(pwaManager.getInfo());
    };
    
    updateStates();
    
    const interval = setInterval(updateStates, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    // PWA manager
    pwaManager,
    
    // States
    installStatus,
    notificationPermission,
    pwaInfo,
    
    // Actions
    promptInstall: () => pwaManager.promptInstall(),
    requestNotificationPermission: () => pwaManager.requestNotificationPermission(),
    showNotification: (title: string, options?: NotificationOptions) => 
      pwaManager.showNotification(title, options),
    checkForUpdates: () => pwaManager.checkForUpdates(),
    applyUpdate: () => pwaManager.applyUpdate(),
    shareContent: (data: ShareData) => pwaManager.shareContent(data),
    copyToClipboard: (text: string) => pwaManager.copyToClipboard(text),
    getDeviceInfo: () => pwaManager.getDeviceInfo(),
    getCacheSize: () => pwaManager.getCacheSize(),
    clearAllCaches: () => pwaManager.clearAllCaches(),
    
    // Offline storage
    storeOfflineData: (storeName: string, data: any) => 
      pwaManager.storeOfflineData(storeName, data),
    getOfflineData: (storeName: string) => 
      pwaManager.getOfflineData(storeName),
    clearOfflineData: (storeName: string) => 
      pwaManager.clearOfflineData(storeName)
  };
}

// Import useState for the hook
import { useState, useEffect } from 'react';
