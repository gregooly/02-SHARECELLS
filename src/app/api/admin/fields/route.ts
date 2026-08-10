import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// GET - Fetch all fields for a sheet
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    const role = cookieStore.get('userRole')?.value;

    if (!token || role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const managerId = decoded.userId;

    const { searchParams } = new URL(request.url);
    const sheetId = searchParams.get('sheet_id');

    if (!sheetId) {
      return NextResponse.json({ error: 'Sheet ID is required' }, { status: 400 });
    }

    const fields = await prisma.fields.findMany({
      where: {
        sheet_id: parseInt(sheetId),
        manager_id: managerId
      },
      orderBy: {
        id: 'asc'
      }
    });

    return NextResponse.json({ fields });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch fields' }, { status: 500 });
  }
}

// POST - Create a new field
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    const role = cookieStore.get('userRole')?.value;

    if (!token || role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const managerId = decoded.userId;

    const body = await request.json();
    const { sheet_id, cell_title, cell_content, sheet_type, data_format } = body;

    if (!sheet_id || !cell_title) {
      return NextResponse.json({ error: 'Sheet ID and field name are required' }, { status: 400 });
    }

    // Verify the sheet belongs to this manager
    const sheet = await prisma.sheets.findFirst({
      where: {
        id: parseInt(sheet_id),
        manager_id: managerId
      }
    });

    if (!sheet) {
      return NextResponse.json({ error: 'Sheet not found or access denied' }, { status: 404 });
    }

    const newField = await prisma.fields.create({
      data: {
        manager_id: managerId,
        sheet_id: parseInt(sheet_id),
        cell_title,
        cell_content: cell_content || '150', // Default column width
        sheet_type: sheet_type || 1,
        data_format: data_format || 'text',
        created_at: new Date().toISOString()
      }
    });

    return NextResponse.json({ field: newField }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create field', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

