import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface JWTPayload {
  userId: number;
  username?: string;
  role?: string;
}

// POST - Update or create cell value (Admin only)
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    const managerId = decoded.userId;
    const userRole = decoded.role || 'agent';

    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Admin only.' }, { status: 403 });
    }

    const { sheet_id, field_id, uuid, value } = await request.json();

    if (!sheet_id || !field_id || !uuid) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if cell exists for this admin (user_id IS NULL)
    const existingCell: any[] = await prisma.$queryRaw`
      SELECT * FROM cells 
      WHERE sheet_id = ${sheet_id} 
      AND field_id = ${field_id} 
      AND uuid = ${uuid}
      AND user_id IS NULL
      LIMIT 1
    `;

    if (existingCell.length > 0) {
      // Update existing cell
      await prisma.$executeRaw`
        UPDATE cells 
        SET value = ${value}
        WHERE id = ${existingCell[0].id}
      `;
      
      return NextResponse.json({ 
        success: true, 
        cellId: existingCell[0].id,
        action: 'updated'
      });
    } else {
      // Create new cell (user_id is NULL for admin)
      await prisma.$executeRaw`
        INSERT INTO cells (manager_id, user_id, sheet_id, field_id, uuid, value, created_at)
        VALUES (${managerId}, NULL, ${sheet_id}, ${field_id}, ${uuid}, ${value}, ${new Date().toISOString()})
      `;

      return NextResponse.json({ 
        success: true,
        action: 'created'
      });
    }
  } catch {
    return NextResponse.json(
      { error: 'Failed to update cell' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a row (Admin only)
export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    const managerId = decoded.userId;
    const userRole = decoded.role || 'agent';

    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Admin only.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const uuid = searchParams.get('uuid');
    const sheetId = searchParams.get('sheet_id');
    const userId = searchParams.get('user_id'); // Get user_id to identify which row to delete

    if (!uuid || !sheetId) {
      return NextResponse.json(
        { error: 'Missing uuid or sheet_id' },
        { status: 400 }
      );
    }

    const sheetIdNum = parseInt(sheetId);

    // First, verify that the admin owns this sheet
    const sheet: any[] = await prisma.$queryRaw`
      SELECT * FROM sheets WHERE id = ${sheetIdNum} AND manager_id = ${managerId}
    `;

    if (sheet.length === 0) {
      return NextResponse.json(
        { error: 'Sheet not found or access denied' },
        { status: 403 }
      );
    }

    // Delete the specific row by uuid AND user_id combination
    // Admin can delete any row in their sheet (both admin rows and user rows)
    if (userId === 'null' || userId === null || userId === undefined) {
      // Delete admin row (user_id IS NULL)
      await prisma.$executeRaw`
        DELETE FROM cells 
        WHERE uuid = ${uuid} 
        AND sheet_id = ${sheetIdNum}
        AND user_id IS NULL
      `;
    } else {
      // Delete user row (user_id = specific value)
      const userIdNum = parseInt(userId);
      await prisma.$executeRaw`
        DELETE FROM cells 
        WHERE uuid = ${uuid} 
        AND sheet_id = ${sheetIdNum}
        AND user_id = ${userIdNum}
      `;
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete row' },
      { status: 500 }
    );
  }
}
