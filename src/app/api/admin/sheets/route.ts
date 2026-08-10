import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
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

    // Check if user has admin role
    const userRole = request.cookies.get('userRole')?.value;
    if (userRole !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    const { sheetNumber, sheetName } = await request.json();

    // Validate input
    if (!sheetNumber || !sheetName) {
      return NextResponse.json(
        { success: false, message: 'Sheet number and sheet name are required' },
        { status: 400 }
      );
    }

    // For admin, use the customerId from the token (PulsePoint user ID)
    const managerId = decoded.userId;

    // Check if sheet number already exists for this manager
    const existingSheetNumber = await prisma.sheets.findFirst({
      where: {
        manager_id: managerId,
        sheet_number: parseInt(sheetNumber)
      }
    });

    if (existingSheetNumber) {
      return NextResponse.json(
        { success: false, message: 'A sheet with this number already exists' },
        { status: 409 }
      );
    }

    // Check if sheet name already exists for this manager
    const existingSheet = await prisma.sheets.findFirst({
      where: {
        manager_id: managerId,
        sheet_name: sheetName
      }
    });

    if (existingSheet) {
      return NextResponse.json(
        { success: false, message: 'A sheet with this name already exists' },
        { status: 409 }
      );
    }

    // Get current timestamp
    const createdAt = new Date().toISOString();

    // Create new sheet
    const newSheet = await prisma.sheets.create({
      data: {
        manager_id: managerId,
        sheet_number: parseInt(sheetNumber),
        sheet_name: sheetName,
        created_at: createdAt
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Sheet created successfully',
      sheet: newSheet
    });

  } catch {
    return NextResponse.json(
      { success: false, message: 'Failed to create sheet' },
      { status: 500 }
    );
  }
}

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

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const userRole = request.cookies.get('userRole')?.value;
    if (userRole !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    // For admin, use the customerId from the token
    const managerId = decoded.userId;

    // Fetch sheets for this manager
    const sheets = await prisma.sheets.findMany({
      where: {
        manager_id: managerId
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Get share counts for each sheet
    const sheetsWithShareCount = await Promise.all(
      sheets.map(async (sheet) => {
        const shareCount = await prisma.sharesheets.count({
          where: {
            sheet_id: sheet.id
          }
        });
        return {
          ...sheet,
          shareCount: shareCount || 0
        };
      })
    );

    return NextResponse.json({
      success: true,
      sheets: sheetsWithShareCount
    });

  } catch {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch sheets' },
      { status: 500 }
    );
  }
}
