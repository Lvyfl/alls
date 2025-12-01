/**
 * Map Tile Cache Manager for Offline Functionality
 * Handles caching of OpenStreetMap tiles using IndexedDB
 */

interface CachedTile {
  key: string;
  blob: Blob;
  timestamp: number;
  url: string;
}

class MapTileCache {
  private dbName = 'als-map-tiles';
  private dbVersion = 1;
  private storeName = 'tiles';
  private db: IDBDatabase | null = null;
  private maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  private getTileKey(z: number, x: number, y: number): string {
    return `${z}/${x}/${y}`;
  }

  async cacheTile(z: number, x: number, y: number, blob: Blob, url: string): Promise<void> {
    try {
      if (!this.db) await this.init();

      const key = this.getTileKey(z, x, y);
      const tile: CachedTile = {
        key,
        blob,
        timestamp: Date.now(),
        url
      };

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(tile);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          console.log(`🗺️ Cached tile: ${key}`);
          resolve();
        };
      });
    } catch (error) {
      console.warn(`Failed to cache tile ${z}/${x}/${y}:`, error);
      throw error;
    }
  }

  async getCachedTile(z: number, x: number, y: number): Promise<Blob | null> {
    if (!this.db) await this.init();

    const key = this.getTileKey(z, x, y);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result as CachedTile | undefined;
        
        if (!result) {
          resolve(null);
          return;
        }

        // Check if tile is still valid (not expired)
        const isExpired = Date.now() - result.timestamp > this.maxAge;
        if (isExpired) {
          console.log(`🗑️ Expired tile: ${key}`);
          this.deleteTile(z, x, y); // Clean up expired tile
          resolve(null);
          return;
        }

        console.log(`📦 Retrieved cached tile: ${key}`);
        resolve(result.blob);
      };
    });
  }

  async deleteTile(z: number, x: number, y: number): Promise<void> {
    if (!this.db) await this.init();

    const key = this.getTileKey(z, x, y);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearExpiredTiles(): Promise<void> {
    if (!this.db) await this.init();

    const cutoffTime = Date.now() - this.maxAge;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));

      request.onerror = () => reject(request.error);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          console.log('🧹 Cleared expired map tiles');
          resolve();
        }
      };
    });
  }

  async getCacheStats(): Promise<{ count: number; size: number }> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const tiles = request.result as CachedTile[];
        const count = tiles.length;
        const size = tiles.reduce((total, tile) => total + tile.blob.size, 0);
        resolve({ count, size });
      };
    });
  }
}

// Export singleton instance
export const mapTileCache = new MapTileCache();
