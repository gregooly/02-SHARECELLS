/**
 * Agent Shared Sheets API
 * 
 * This route fetches all worksheets shared with the logged-in agent/user.
 * Access: Agent/User only
 * 
 * Endpoints:
 * - GET /api/agent/shared-sheets - List sheets shared with current user
 * 
 * Features:
 * - Returns sheets from sharesheets table
 * - Filters by current user's ID
 * - Includes manager name via LEFT JOIN
 * - Ordered by creation date (newest first)
 * 
 * Response:
 * {
 *   success: true,
 *   sheets: [
 *     {
 *       id: number,
 *       sheet_name: string,
 *       sheet_number: number,
 *       created_at: string,
 *       manager_id: number,
 *       manager_name: string
 *     }
 *   ]
 * }
 * 
 * Database Tables:
 * - sharesheets: Stores sharing relationships
 * - sheets: Worksheet definitions
 * - users: User accounts (for manager name)
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface JWTPayload {
  userId: number;
  username: string;
  userRole: string;
}

// GET - Fetch sheets shared with the current user (agent)
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    const userId = decoded.userId;

    // Get all sheets shared with this user
    const sharedSheets: any[] = await prisma.$queryRaw`
      SELECT 
        s.id,
        s.sheet_name,
        s.sheet_number,
        s.created_at,
        s.manager_id,
        u.username as manager_name
      FROM sharesheets ss
      INNER JOIN sheets s ON ss.sheet_id = s.id
      LEFT JOIN users u ON s.manager_id = u.id
      WHERE ss.user_id = ${userId}
      ORDER BY s.created_at DESC
    `;

    return NextResponse.json({
      success: true,
      sheets: sharedSheets
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch shared sheets' },
      { status: 500 }
    );
  }
}
