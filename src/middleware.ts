import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { UserRole } from './types/auth';

// Define protected routes
const protectedRoutes = [
  '/dashboard',
  '/students',
  '/progress',
  '/settings',
  '/profile',
];

// Define admin-only routes (only master admin can access)
const masterAdminRoutes = [
  '/admin',
];

// Define auth routes
const authRoutes = [
  '/login',
  '/register',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect register route to login (disable public registration)
  if (pathname === '/register') {
    console.log('🚫 Public registration disabled, redirecting to login...');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  );

  // Check if the route is admin-only
  const isMasterAdminRoute = masterAdminRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  );

  // Check if the route is an auth route
  const isAuthRoute = authRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  );

  // Get the token from cookies
  const token = request.cookies.get('als_token')?.value;

  // Get user role from cookies (if available)
  const userRoleStr = request.cookies.get('als_user_role')?.value;
  const userRole = userRoleStr as UserRole | undefined;

  // Get assigned barangay from cookies (if available)
  const assignedBarangayId = request.cookies.get('als_assigned_barangay')?.value;

  // Validate token format (basic check for mock tokens)
  const isValidToken = token && (
    token.startsWith('mock-jwt-token-') ||
    token.length > 10 // Basic length check
  );

  // If the route is protected and there's no valid token, redirect to login
  if ((isProtectedRoute || isMasterAdminRoute) && !isValidToken) {
    console.log('🚫 Unauthenticated user accessing protected route, redirecting to login...', {
      pathname,
      hasToken: !!token,
      tokenValid: isValidToken
    });
    const url = new URL('/login', request.url);
    url.searchParams.set('from', pathname);
    return NextResponse.redirect(url);
  }

  // If the route is admin-only and the user is not a master admin, redirect to dashboard
  if (isMasterAdminRoute && userRole !== 'master_admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If the route is an auth route and there's a valid token, redirect to dashboard
  // This is the primary mechanism to prevent authenticated users from accessing login/register pages
  if (isAuthRoute && isValidToken) {
    console.log('🔄 Authenticated user accessing auth route, redirecting...', {
      pathname,
      token: token ? `${token.substring(0, 20)}...` : null,
      userRole
    });

    // Get the 'from' query parameter if it exists
    const fromParam = request.nextUrl.searchParams.get('from');

    // If there's a 'from' parameter and it's a protected route, redirect there
    // This allows users to be redirected back to the page they were trying to access
    if (fromParam &&
        (protectedRoutes.some(route => fromParam === route || fromParam.startsWith(`${route}/`)) ||
         (userRole === 'master_admin' && masterAdminRoutes.some(route => fromParam === route || fromParam.startsWith(`${route}/`))))) {
      console.log('🎯 Redirecting to original destination:', fromParam);
      return NextResponse.redirect(new URL(fromParam, request.url));
    }

    // Otherwise redirect to dashboard
    console.log('🏠 Redirecting to dashboard');
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // For barangay-specific routes, check if the user has access to the barangay
  if (pathname.includes('/barangay/') && userRole === 'admin') {
    const barangayIdInUrl = pathname.split('/barangay/')[1]?.split('/')[0];

    // If the admin is trying to access a barangay they're not assigned to, redirect to dashboard
    if (barangayIdInUrl && barangayIdInUrl !== assignedBarangayId) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Otherwise, continue
  return NextResponse.next();
}

// Configure the middleware to run only on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
