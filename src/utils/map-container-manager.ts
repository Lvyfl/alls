/**
 * Map Container Manager Utility
 * Helps prevent Leaflet map container reuse errors
 */

// Track active map containers to prevent reuse
const activeContainers = new Set<string>();

/**
 * Generate a unique container ID and register it
 */
export function generateUniqueContainerId(): string {
  let containerId: string;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    containerId = `map-container-${timestamp}-${random}`;
    attempts++;
  } while (activeContainers.has(containerId) && attempts < maxAttempts);

  if (attempts >= maxAttempts) {
    console.warn('Failed to generate unique container ID after maximum attempts');
  }

  activeContainers.add(containerId);

  if (process.env.NODE_ENV === 'development') {
    console.log(`🗺️ Generated container ID: ${containerId} (Active: ${activeContainers.size})`);
  }

  return containerId;
}

/**
 * Release a container ID when map is unmounted
 */
export function releaseContainerId(containerId: string): void {
  const wasActive = activeContainers.has(containerId);
  activeContainers.delete(containerId);

  if (process.env.NODE_ENV === 'development' && wasActive) {
    console.log(`🗺️ Released container ID: ${containerId} (Active: ${activeContainers.size})`);
  }
}

/**
 * Check if a container ID is currently active
 */
export function isContainerActive(containerId: string): boolean {
  return activeContainers.has(containerId);
}

/**
 * Clear all container registrations (use with caution)
 */
export function clearAllContainers(): void {
  activeContainers.clear();
}

/**
 * Get count of active containers (for debugging)
 */
export function getActiveContainerCount(): number {
  return activeContainers.size;
}

/**
 * Clean up DOM elements that might interfere with Leaflet
 */
export function cleanupMapContainer(containerId: string): void {
  try {
    // Find and clean up any existing container elements
    const existingContainer = document.getElementById(containerId);
    if (existingContainer) {
      // Remove all child elements
      existingContainer.innerHTML = '';
      
      // Remove Leaflet-specific classes and attributes
      existingContainer.classList.remove('leaflet-container', 'leaflet-touch', 'leaflet-fade-anim', 'leaflet-grab', 'leaflet-touch-drag', 'leaflet-touch-zoom');
      existingContainer.removeAttribute('tabindex');
      
      // Remove any Leaflet-specific data attributes
      const attributes = existingContainer.attributes;
      for (let i = attributes.length - 1; i >= 0; i--) {
        const attr = attributes[i];
        if (attr.name.startsWith('data-leaflet') || attr.name.startsWith('_leaflet')) {
          existingContainer.removeAttribute(attr.name);
        }
      }
    }
  } catch (error) {
    console.warn('Error cleaning up map container:', error);
  }
}

/**
 * Prepare container for new map instance
 */
export function prepareMapContainer(containerId: string): void {
  cleanupMapContainer(containerId);
  
  // Small delay to ensure cleanup is complete
  setTimeout(() => {
    const container = document.getElementById(containerId);
    if (container) {
      // Ensure container is ready for new map
      container.style.position = 'relative';
      container.style.overflow = 'hidden';
    }
  }, 50);
}
