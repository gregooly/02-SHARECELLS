import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get token from cookies
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify token and get user info
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get customerId from URL params if admin, or from user data if agent
    const { searchParams } = new URL(request.url);
    const userRole = request.cookies.get('userRole')?.value;
    
    let managerId: number;

    if (userRole === 'admin') {
      // For admin, use the customerId from the token (PulsePoint user ID)
      managerId = decoded.userId;
    } else {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    // Fetch users where manager_id matches the current manager's customerId
    const users = await prisma.user.findMany({
      where: {
        manager_id: managerId
      },
      select: {
        id: true,
        username: true,
        isActive: true,
        isPasswordRequest: true
      },
      orderBy: {
        username: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      users
    });

  } catch {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
