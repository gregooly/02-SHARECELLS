import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// Get shared users for a sheet
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sheetId = searchParams.get('sheet_id');

    if (!sheetId) {
      return NextResponse.json(
        { success: false, message: 'Sheet ID is required' },
        { status: 400 }
      );
    }

    const sharedUsers = await prisma.sharesheets.findMany({
      where: {
        sheet_id: parseInt(sheetId),
        manager_id: decoded.userId
      }
    });

    return NextResponse.json({
      success: true,
      sharedUsers
    });

  } catch {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch shared users' },
      { status: 500 }
    );
  }
}

// Share sheet with a user
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sheet_id, user_id } = body;

    if (!sheet_id || !user_id) {
      return NextResponse.json(
        { success: false, message: 'Sheet ID and User ID are required' },
        { status: 400 }
      );
    }

    // Check if already shared
    const existing = await prisma.sharesheets.findFirst({
      where: {
        sheet_id: parseInt(sheet_id),
        user_id: parseInt(user_id),
        manager_id: decoded.userId
      }
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Sheet is already shared with this user' },
        { status: 400 }
      );
    }

    // Create sharesheet record
    const sharesheet = await prisma.sharesheets.create({
      data: {
        manager_id: decoded.userId,
        sheet_id: parseInt(sheet_id),
        user_id: parseInt(user_id),
        created_at: new Date().toISOString()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Sheet shared successfully',
      sharesheet
    });

  } catch {
    return NextResponse.json(
      { success: false, message: 'Failed to share sheet' },
      { status: 500 }
    );
  }
}

// Unshare sheet from a user
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sheetId = searchParams.get('sheet_id');
    const userId = searchParams.get('user_id');

    if (!sheetId || !userId) {
      return NextResponse.json(
        { success: false, message: 'Sheet ID and User ID are required' },
        { status: 400 }
      );
    }

    // Delete sharesheet record
    await prisma.sharesheets.deleteMany({
      where: {
        sheet_id: parseInt(sheetId),
        user_id: parseInt(userId),
        manager_id: decoded.userId
      }
    });

    return NextResponse.json({
      success: true,
      message: 'User removed successfully'
    });

  } catch {
    return NextResponse.json(
      { success: false, message: 'Failed to remove user' },
      { status: 500 }
    );
  }
}
