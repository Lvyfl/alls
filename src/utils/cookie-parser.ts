/**
 * Parse cookies from request headers
 */
export function parseCookies(cookieHeader: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  
  if (!cookieHeader) {
    return cookies;
  }
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name) {
      cookies[name] = decodeURIComponent(rest.join('='));
    }
  });
  
  return cookies;
}

/**
 * Get a specific cookie value from request headers
 */
export function getCookie(req: Request, name: string): string | undefined {
  const cookieHeader = req.headers.get('cookie');
  const cookies = parseCookies(cookieHeader);
  return cookies[name];
}

