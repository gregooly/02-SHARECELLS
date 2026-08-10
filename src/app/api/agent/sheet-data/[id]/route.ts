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

// GET - Fetch sheet data with fields and cells (Agent only - sees only their own data)
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
    const userId = decoded.userId;
    const userRole = decoded.role;
    const resolvedParams = await params;
    const sheetId = parseInt(resolvedParams.id);

    // Agent needs to check if sheet is shared with them
    const sheet: any[] = await prisma.$queryRaw`
      SELECT s.* 
      FROM sheets s
      INNER JOIN sharesheets ss ON s.id = ss.sheet_id
      WHERE s.id = ${sheetId} AND ss.user_id = ${userId}
    `;

    if (sheet.length === 0) {
      return NextResponse.json({ error: 'Sheet not found or access denied' }, { status: 404 });
    }

    // Get fields (columns)
    const fields: any[] = await prisma.$queryRaw`
      SELECT * FROM fields WHERE sheet_id = ${sheetId} ORDER BY id ASC
    `;

    if (fields.length === 0) {
      return NextResponse.json(
        { error: 'You must design the sheet structure first.' },
        { status: 400 }
      );
    }

    // Agent sees only their own records, admin sees all records
    let cells: any[];
    if (userRole === 'agent') {
      // Agent sees only their own data
      cells = await prisma.$queryRaw`
        SELECT c.*, u.username, c.created_at
        FROM cells c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.sheet_id = ${sheetId} AND c.user_id = ${userId}
        ORDER BY c.id ASC
      `;
    } else {
      // Admin sees all users' records, sorted by user and creation order
      cells = await prisma.$queryRaw`
        SELECT c.*, u.username, c.created_at
        FROM cells c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.sheet_id = ${sheetId}
        ORDER BY COALESCE(c.user_id, 0) ASC, c.id ASC
      `;
    }

    // Organize cells by rows (uuid for agent's own data)
    const rowsMap = new Map();
    cells.forEach(cell => {
      // Agent API only returns their own data, so user_id is always present
      const rowKey = cell.uuid;
      if (!rowsMap.has(rowKey)) {
        rowsMap.set(rowKey, {
          uuid: cell.uuid,
          user_id: cell.user_id,
          username: cell.username,
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

    // Convert to array and sort by minCellId (earliest created first)
    // Agent only sees their own data, so no need to sort by user_id
    const rows = Array.from(rowsMap.values()).sort((a, b) => {
      return a.minCellId - b.minCellId;
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
