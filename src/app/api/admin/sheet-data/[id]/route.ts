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

// GET - Fetch sheet data with fields and cells (Admin only - sees all data)
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

    // Verify user is admin
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Admin only.' }, { status: 403 });
    }

    // Admin owns the sheet - verify ownership
    const sheet: any[] = await prisma.$queryRaw`
      SELECT * FROM sheets WHERE id = ${sheetId} AND manager_id = ${managerId}
    `;

    if (sheet.length === 0) {
      return NextResponse.json({ error: 'Sheet not found or access denied' }, { status: 404 });
    }

    // Get fields (columns)
    const fields: any[] = await prisma.$queryRaw`
      SELECT * FROM fields WHERE sheet_id = ${sheetId} ORDER BY id ASC
    `;

    // Check if sheet has fields designed
    if (fields.length === 0) {
      return NextResponse.json({ 
        error: 'You must design the sheet structure first.' 
      }, { status: 400 });
    }

    // Admin sees ALL records for this sheet (their own + all agents' data)
    const cells: any[] = await prisma.$queryRaw`
      SELECT c.*, u.username, c.created_at
      FROM cells c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.sheet_id = ${sheetId}
      ORDER BY COALESCE(c.user_id, 0) ASC, c.id ASC
    `;

    // Organize cells by rows (uuid + user_id combination) and track minimum cell ID for sorting
    const rowsMap = new Map();
    cells.forEach(cell => {
      // Create unique key: uuid + user_id (to handle same uuid across different users)
      const rowKey = `${cell.uuid}-${cell.user_id || 'admin'}`;
      if (!rowsMap.has(rowKey)) {
        rowsMap.set(rowKey, {
          uuid: cell.uuid,
          user_id: cell.user_id,
          username: cell.username || 'Admin',
          created_at: cell.created_at,
          minCellId: cell.id, // Track minimum cell ID for this row (never changes, reliable for sorting)
          cells: {}
        });
      } else {
        // Update minCellId if we find a smaller one (earlier registration)
        const row = rowsMap.get(rowKey);
        if (cell.id < row.minCellId) {
          row.minCellId = cell.id;
        }
      }
      rowsMap.get(rowKey).cells[cell.field_id] = {
        id: cell.id,
        value: cell.value || ''
      };
    });

    // Convert to array and sort: User rows first (by user_id), then admin rows (user_id = null) at the end
    const rows = Array.from(rowsMap.values()).sort((a, b) => {
      // Admin rows (user_id = null) always come last
      if (a.user_id === null && b.user_id !== null) return 1;
      if (a.user_id !== null && b.user_id === null) return -1;
      
      // Both are admin rows OR both are user rows
      if (a.user_id === b.user_id) {
        // Sort by minimum cell ID (earliest created first within same user)
        return a.minCellId - b.minCellId;
      }
      
      // Different users - sort by user_id
      return a.user_id - b.user_id;
    });

    return NextResponse.json({
      sheet: sheet[0],
      fields,
      rows
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch sheet data' },
      { status: 500 }
    );
  }
}
