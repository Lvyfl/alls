'use client';

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { mapTileCache } from '@/utils/map-tile-cache';

interface OfflineTileLayerProps {
  url: string;
  attribution: string;
  isOnline: boolean;
}

export function OfflineTileLayer({ url, attribution, isOnline }: OfflineTileLayerProps) {
  const map = useMap();
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    if (!map) return;

    console.log(`🗺️ Setting up ${isOnline ? 'online' : 'offline'} tile layer`);

    // Create custom tile layer with offline support
    const OfflineTileLayerClass = L.TileLayer.extend({
      createTile: function(coords: L.Coords, done: (error: Error | null, tile?: HTMLElement) => void) {
        const tile = document.createElement('img');
        const tileUrl = this.getTileUrl(coords);
        const { z, x, y } = coords;

        // Set up tile properties
        tile.alt = '';
        tile.setAttribute('role', 'presentation');

        const loadTile = async () => {
          try {
            if (isOnline) {
              // Online mode: try to fetch from network and cache
              try {
                const response = await fetch(tileUrl);
                if (response.ok) {
                  const blob = await response.blob();
                  
                  // Cache the tile for offline use
                  mapTileCache.cacheTile(z, x, y, blob, tileUrl).catch(console.warn);
                  
                  // Create object URL and set as tile source
                  const objectUrl = URL.createObjectURL(blob);
                  tile.onload = () => {
                    URL.revokeObjectURL(objectUrl);
                    done(null, tile);
                  };
                  tile.onerror = () => {
                    URL.revokeObjectURL(objectUrl);
                    this.tryOfflineTile(tile, z, x, y, done);
                  };
                  tile.src = objectUrl;
                  return;
                }
              } catch (networkError) {
                console.warn(`Network error for tile ${z}/${x}/${y}:`, networkError);
              }
              
              // Network failed, try offline cache
              this.tryOfflineTile(tile, z, x, y, done);
            } else {
              // Offline mode: use cached tiles only
              this.tryOfflineTile(tile, z, x, y, done);
            }
          } catch (error) {
            console.error(`Error loading tile ${z}/${x}/${y}:`, error);
            done(error as Error);
          }
        };

        // Method to try loading from offline cache
        this.tryOfflineTile = async (tileElement: HTMLImageElement, z: number, x: number, y: number, callback: Function) => {
          try {
            const cachedBlob = await mapTileCache.getCachedTile(z, x, y);
            if (cachedBlob) {
              const objectUrl = URL.createObjectURL(cachedBlob);
              tileElement.onload = () => {
                URL.revokeObjectURL(objectUrl);
                callback(null, tileElement);
              };
              tileElement.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                this.showOfflinePlaceholder(tileElement, callback);
              };
              tileElement.src = objectUrl;
            } else {
              this.showOfflinePlaceholder(tileElement, callback);
            }
          } catch (error) {
            console.warn(`Cache error for tile ${z}/${x}/${y}:`, error);
            this.showOfflinePlaceholder(tileElement, callback);
          }
        };

        // Method to show offline placeholder
        this.showOfflinePlaceholder = (tileElement: HTMLImageElement, callback: Function) => {
          // Create a simple offline placeholder
          const canvas = document.createElement('canvas');
          canvas.width = 256;
          canvas.height = 256;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            // Draw a simple offline indicator
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, 256, 256);
            
            ctx.strokeStyle = '#ddd';
            ctx.lineWidth = 1;
            ctx.strokeRect(0, 0, 256, 256);
            
            ctx.fillStyle = '#999';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Offline', 128, 128);
            ctx.fillText('No cached tile', 128, 145);
          }
          
          canvas.toBlob((blob) => {
            if (blob) {
              const objectUrl = URL.createObjectURL(blob);
              tileElement.onload = () => {
                URL.revokeObjectURL(objectUrl);
                callback(null, tileElement);
              };
              tileElement.src = objectUrl;
            } else {
              callback(new Error('Failed to create offline placeholder'));
            }
          });
        };

        loadTile();
        return tile;
      }
    });

    // Remove existing tile layer if any
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    // Create and add new tile layer
    tileLayerRef.current = new (OfflineTileLayerClass as any)(url, {
      attribution,
      maxZoom: 19,
      subdomains: ['a', 'b', 'c']
    });

    if (tileLayerRef.current) {
      map.addLayer(tileLayerRef.current);
    }

    // Cleanup function
    return () => {
      if (tileLayerRef.current && map) {
        map.removeLayer(tileLayerRef.current);
        tileLayerRef.current = null;
      }
    };
  }, [map, url, attribution, isOnline]);

  return null;
}
