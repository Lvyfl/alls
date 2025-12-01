/**
 * Utility functions to parse user agent and extract device information
 */

export interface DeviceInfo {
  device: string;
  browser: string;
  os: string;
}

/**
 * Parse user agent string to extract device, browser, and OS information
 */
export function parseUserAgent(userAgent: string | null | undefined): DeviceInfo {
  if (!userAgent) {
    return {
      device: 'Unknown Device',
      browser: 'Unknown Browser',
      os: 'Unknown OS',
    };
  }

  const ua = userAgent.toLowerCase();

  // Detect OS
  let os = 'Unknown OS';
  if (ua.includes('windows')) {
    if (ua.includes('windows nt 10.0')) os = 'Windows 10/11';
    else if (ua.includes('windows nt 6.3')) os = 'Windows 8.1';
    else if (ua.includes('windows nt 6.2')) os = 'Windows 8';
    else if (ua.includes('windows nt 6.1')) os = 'Windows 7';
    else os = 'Windows';
  } else if (ua.includes('mac os x')) {
    if (ua.includes('iphone')) os = 'iOS';
    else if (ua.includes('ipad')) os = 'iPadOS';
    else os = 'macOS';
  } else if (ua.includes('android')) {
    os = 'Android';
  } else if (ua.includes('linux')) {
    os = 'Linux';
  } else if (ua.includes('iphone')) {
    os = 'iOS';
  } else if (ua.includes('ipad')) {
    os = 'iPadOS';
  }

  // Detect Browser
  let browser = 'Unknown Browser';
  if (ua.includes('edg/')) {
    browser = 'Microsoft Edge';
  } else if (ua.includes('chrome/') && !ua.includes('edg/')) {
    browser = 'Google Chrome';
  } else if (ua.includes('firefox/')) {
    browser = 'Mozilla Firefox';
  } else if (ua.includes('safari/') && !ua.includes('chrome/')) {
    browser = 'Safari';
  } else if (ua.includes('opera/') || ua.includes('opr/')) {
    browser = 'Opera';
  } else if (ua.includes('msie') || ua.includes('trident/')) {
    browser = 'Internet Explorer';
  }

  // Detect Device Type
  let device = 'Desktop';
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    device = 'Mobile';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    device = 'Tablet';
  } else if (ua.includes('smart-tv') || ua.includes('smarttv')) {
    device = 'Smart TV';
  }

  return {
    device,
    browser,
    os,
  };
}

/**
 * Get client IP address from request headers
 */
export function getClientIP(req: Request): string | undefined {
  // Try various headers that might contain the IP
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  return undefined;
}

