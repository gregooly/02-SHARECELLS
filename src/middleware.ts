import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

// Simple runtime configuration to use nodejs instead of edge
export const runtime = 'nodejs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function verifyTokenMiddleware(token: string): { userId: number; role?: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; role?: string };
    return decoded;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get token from cookies
  const token = request.cookies.get('token')?.value;

  // Protected routes
  const isAdminRoute = pathname.startsWith('/admin');
  const isAgentRoute = pathname.startsWith('/agent');
  const isProtectedRoute = isAdminRoute || isAgentRoute;

  // If accessing protected route without token, redirect to signin
  if (isProtectedRoute && !token) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('error', 'unauthorized');
    return NextResponse.redirect(url);
  }

  // If token exists, verify it and check role
  if (token && isProtectedRoute) {
    const decoded = verifyTokenMiddleware(token);

    if (!decoded || !decoded.role) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('error', 'invalid_token');

      const response = NextResponse.redirect(url);
      response.cookies.delete('token');
      response.cookies.delete('userRole');
      return response;
    }

    const userRole = decoded.role;

    // Check if user is trying to access admin routes without admin role
    if (isAdminRoute && userRole !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('error', 'forbidden');
      return NextResponse.redirect(url);
    }

    // Check if user is trying to access agent routes without agent role
    if (isAgentRoute && userRole !== 'agent') {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('error', 'forbidden');
      return NextResponse.redirect(url);
    }

    // Add role to response headers for use in pages
    const response = NextResponse.next();
    response.headers.set('x-user-role', userRole);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/agent/:path*'],
};
