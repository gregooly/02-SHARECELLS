import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/admin/sheets/[id] - Get a single sheet (Admin only)
// This endpoint is for admin-specific operations only
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json(
        { message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const params = await context.params;
    const sheetId = parseInt(params.id);

    if (isNaN(sheetId)) {
      return NextResponse.json(
        { message: 'Invalid sheet ID' },
        { status: 400 }
      );
    }

    // Fetch the sheet (admin must own it)
    const sheet = await prisma.sheets.findUnique({
      where: { id: sheetId },
    });

    if (!sheet) {
      return NextResponse.json(
        { message: 'Sheet not found' },
        { status: 404 }
      );
    }

    if (sheet.manager_id !== decoded.userId) {
      return NextResponse.json(
        { message: 'Unauthorized to access this sheet' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { sheet },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/sheets/[id] - Update a sheet (Admin only)
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json(
        { message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const params = await context.params;
    const sheetId = parseInt(params.id);

    if (isNaN(sheetId)) {
      return NextResponse.json(
        { message: 'Invalid sheet ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { sheet_number, sheet_name } = body;

    // Check if the sheet exists and belongs to this manager
    const sheet = await prisma.sheets.findUnique({
      where: { id: sheetId },
    });

    if (!sheet) {
      return NextResponse.json(
        { message: 'Sheet not found' },
        { status: 404 }
      );
    }

    if (sheet.manager_id !== decoded.userId) {
      return NextResponse.json(
        { message: 'Unauthorized to update this sheet' },
        { status: 403 }
      );
    }

    // Check if sheet_name already exists for another sheet
    if (sheet_name && sheet_name !== sheet.sheet_name) {
      const existingSheet = await prisma.sheets.findFirst({
        where: {
          sheet_name: sheet_name,
          manager_id: decoded.userId,
          id: { not: sheetId }
        }
      });

      if (existingSheet) {
        return NextResponse.json(
          { error: 'Sheet name already exists' },
          { status: 400 }
        );
      }
    }

    // Check if sheet_number already exists for another sheet
    if (sheet_number !== undefined && sheet_number !== sheet.sheet_number) {
      const existingSheetNumber = await prisma.sheets.findFirst({
        where: {
          sheet_number: sheet_number,
          manager_id: decoded.userId,
          id: { not: sheetId }
        }
      });

      if (existingSheetNumber) {
        return NextResponse.json(
          { error: 'Sheet number already exists' },
          { status: 400 }
        );
      }
    }

    // Update the sheet
    const updatedSheet = await prisma.sheets.update({
      where: { id: sheetId },
      data: {
        ...(sheet_number !== undefined && { sheet_number }),
        ...(sheet_name !== undefined && { sheet_name })
      }
    });

    return NextResponse.json(
      { sheet: updatedSheet, message: 'Sheet updated successfully' },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/sheets/[id] - Delete a sheet (Admin only)
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return NextResponse.json(
        { message: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const params = await context.params;
    const sheetId = parseInt(params.id);

    if (isNaN(sheetId)) {
      return NextResponse.json(
        { message: 'Invalid sheet ID' },
        { status: 400 }
      );
    }

    // Check if the sheet exists and belongs to this manager
    const sheet = await prisma.sheets.findUnique({
      where: { id: sheetId },
    });

    if (!sheet) {
      return NextResponse.json(
        { message: 'Sheet not found' },
        { status: 404 }
      );
    }

    if (sheet.manager_id !== decoded.userId) {
      return NextResponse.json(
        { message: 'Unauthorized to delete this sheet' },
        { status: 403 }
      );
    }

    // Cascading delete: Delete all related data first
    // Using raw SQL to ensure all related records are deleted
    
    // 1. Delete all cells related to this sheet (admin and all users' cells)
    await prisma.$executeRaw`DELETE FROM cells WHERE sheet_id = ${sheetId}`;

    // 2. Delete all fields related to this sheet
    await prisma.$executeRaw`DELETE FROM fields WHERE sheet_id = ${sheetId}`;

    // 3. Delete all share relationships for this sheet
    await prisma.$executeRaw`DELETE FROM sharesheets WHERE sheet_id = ${sheetId}`;

    // 4. Finally, delete the sheet itself
    await prisma.$executeRaw`DELETE FROM sheets WHERE id = ${sheetId}`;

    return NextResponse.json(
      { message: 'Sheet and all related data deleted successfully' },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
