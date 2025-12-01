import L from 'leaflet';

/**
 * Create offline-compatible marker icons using data URLs
 * This ensures markers work even when external resources are unavailable
 */

// Create a blue marker icon as SVG data URL
const createBlueMarkerSVG = (): string => {
  const svg = `<svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg"><path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 10.9 12.5 28.5 12.5 28.5S25 23.4 25 12.5C25 5.6 19.4 0 12.5 0z" fill="#2563eb"/><circle cx="12.5" cy="12.5" r="7" fill="white"/><circle cx="12.5" cy="12.5" r="4" fill="#2563eb"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// Create a shadow as SVG data URL
const createShadowSVG = (): string => {
  const svg = `<svg width="41" height="41" viewBox="0 0 41 41" xmlns="http://www.w3.org/2000/svg"><ellipse cx="20.5" cy="37" rx="18" ry="4" fill="rgba(0,0,0,0.3)"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// Create default marker icon as SVG data URL
const createDefaultMarkerSVG = (): string => {
  const svg = `<svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg"><path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 10.9 12.5 28.5 12.5 28.5S25 23.4 25 12.5C25 5.6 19.4 0 12.5 0z" fill="#dc2626"/><circle cx="12.5" cy="12.5" r="7" fill="white"/><circle cx="12.5" cy="12.5" r="4" fill="#dc2626"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// Initialize offline-compatible icons
export const initializeOfflineIcons = () => {
  // Fix for default markers in react-leaflet with offline support
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: createDefaultMarkerSVG(),
    iconUrl: createDefaultMarkerSVG(),
    shadowUrl: createShadowSVG(),
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

// Create offline-compatible blue marker icon
export const createOfflineBlueIcon = () => {
  return new L.Icon({
    iconUrl: createBlueMarkerSVG(),
    shadowUrl: createShadowSVG(),
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

// Create offline-compatible default marker icon
export const createOfflineDefaultIcon = () => {
  return new L.Icon({
    iconUrl: createDefaultMarkerSVG(),
    shadowUrl: createShadowSVG(),
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

// Preload icons for offline use
export const preloadOfflineIcons = () => {
  // Create image elements to preload the data URLs
  const blueIcon = new Image();
  const defaultIcon = new Image();
  const shadow = new Image();
  
  blueIcon.src = createBlueMarkerSVG();
  defaultIcon.src = createDefaultMarkerSVG();
  shadow.src = createShadowSVG();
  
  console.log('🎯 Offline marker icons preloaded');
};
