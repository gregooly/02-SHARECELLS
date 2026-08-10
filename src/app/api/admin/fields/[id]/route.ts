import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// DELETE - Delete a field
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    const role = cookieStore.get('userRole')?.value;

    if (!token || role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const managerId = decoded.userId;

    const { id } = await params;
    const fieldId = parseInt(id);

    // Verify the field belongs to this manager
    const field = await prisma.fields.findFirst({
      where: {
        id: fieldId,
        manager_id: managerId
      }
    });

    if (!field) {
      return NextResponse.json({ error: 'Field not found or access denied' }, { status: 404 });
    }

    // First, delete all related records from cells table where field_id matches
    await prisma.cells.deleteMany({
      where: {
        field_id: fieldId
      }
    });

    // Then delete the field itself from fields table
    await prisma.fields.delete({
      where: {
        id: fieldId
      }
    });

    return NextResponse.json({ 
      message: 'Field and all related cell data deleted successfully' 
    });
  } catch {
    return NextResponse.json({ error: 'Failed to delete field' }, { status: 500 });
  }
}

// PATCH - Update a field
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    const role = cookieStore.get('userRole')?.value;

    if (!token || role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const managerId = decoded.userId;

    const { id } = await params;
    const fieldId = parseInt(id);
    const body = await request.json();
    const { cell_title, cell_content, sheet_type, data_format } = body;

    // Verify the field belongs to this manager
    const field = await prisma.fields.findFirst({
      where: {
        id: fieldId,
        manager_id: managerId
      }
    });

    if (!field) {
      return NextResponse.json({ error: 'Field not found or access denied' }, { status: 404 });
    }

    const updatedField = await prisma.fields.update({
      where: {
        id: fieldId
      },
      data: {
        ...(cell_title !== undefined && { cell_title }),
        ...(cell_content !== undefined && { cell_content }),
        ...(sheet_type !== undefined && { sheet_type }),
        ...(data_format !== undefined && { data_format })
      }
    });

    return NextResponse.json({ field: updatedField });
  } catch {
    return NextResponse.json({ error: 'Failed to update field' }, { status: 500 });
  }
}
