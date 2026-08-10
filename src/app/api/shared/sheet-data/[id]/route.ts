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

// GET - Fetch sheet data with fields and cells
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    const managerId = decoded.userId;
    const resolvedParams = await params;
    const sheetId = parseInt(resolvedParams.id);
    const userRole = decoded.role || 'agent';
    const isAdmin = userRole === 'admin';

    // Get sheet info
    // Admin: Check if they own the sheet
    // Agent: Check if the sheet has been shared with them
    let sheet: any[];
    
    if (isAdmin) {
      // Admin owns the sheet
      sheet = await prisma.$queryRaw`
        SELECT * FROM sheets WHERE id = ${sheetId} AND manager_id = ${managerId}
      `;
    } else {
      // Agent needs to check if sheet is shared with them
      sheet = await prisma.$queryRaw`
        SELECT s.* 
        FROM sheets s
        INNER JOIN sharesheets ss ON s.id = ss.sheet_id
        WHERE s.id = ${sheetId} AND ss.user_id = ${managerId}
      `;
    }

    if (sheet.length === 0) {
      return NextResponse.json({ error: 'Sheet not found or access denied' }, { status: 404 });
    }

    // Get fields (columns)
    const fields: any[] = await prisma.$queryRaw`
      SELECT * FROM fields WHERE sheet_id = ${sheetId} ORDER BY id ASC
    `;

    // Get all cells for this sheet
    // For admin (manager_id matches the creator), show all records from users with access
    // For regular users, only show their own records
    let cells: any[];
    if (isAdmin) {
      // Admin sees records from:
      // 1. Their own records (user_id IS NULL or user_id = manager_id)
      // 2. All agents who have been shared this sheet
      cells = await prisma.$queryRaw`
        SELECT c.*, u.username 
        FROM cells c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.sheet_id = ${sheetId} 
        AND (
          c.user_id IS NULL 
          OR c.user_id = ${managerId}
          OR c.user_id IN (
            SELECT user_id FROM sharesheets WHERE sheet_id = ${sheetId}
          )
        )
        ORDER BY COALESCE(c.user_id, 0) ASC, c.uuid ASC, c.field_id ASC
      `;
    } else {
      // Regular users only see their own records
      cells = await prisma.$queryRaw`
        SELECT c.*, u.username 
        FROM cells c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.sheet_id = ${sheetId} AND c.user_id = ${decoded.userId}
        ORDER BY c.uuid ASC, c.field_id ASC
      `;
    }

    // Organize cells by rows (uuid)
    const rowsMap = new Map();
    cells.forEach(cell => {
      const rowKey = cell.uuid || `row-${cell.id}`;
      if (!rowsMap.has(rowKey)) {
        rowsMap.set(rowKey, {
          uuid: cell.uuid,
          user_id: cell.user_id,
          username: cell.username || 'Admin',
          created_at: cell.created_at,
          cells: {}
        });
      }
      rowsMap.get(rowKey).cells[cell.field_id] = {
        id: cell.id,
        value: cell.value || ''
      };
    });

    const rows = Array.from(rowsMap.values());

    return NextResponse.json({
      sheet: sheet[0],
      fields,
      rows,
      isAdmin
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch sheet data' },
      { status: 500 }
    );
  }
}
