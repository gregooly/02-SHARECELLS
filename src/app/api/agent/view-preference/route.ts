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

// GET - Get agent's view preference
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    const userId = decoded.userId;

    // Get or create view preference
    const viewPreference: any[] = await prisma.$queryRaw`
      SELECT * FROM sheet_view WHERE manager_id = ${String(userId)} LIMIT 1
    `;

    if (viewPreference.length === 0) {
      // Create default preference (0 = card view)
      await prisma.$executeRaw`
        INSERT INTO sheet_view (manager_id, view_type) VALUES (${String(userId)}, 0)
      `;
      return NextResponse.json({ view_type: 0 });
    }

    return NextResponse.json({ 
      view_type: viewPreference[0].view_type 
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch view preference' },
      { status: 500 }
    );
  }
}

// POST - Set agent's view preference
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    const userId = decoded.userId;

    const { view_type } = await request.json();

    if (view_type !== 0 && view_type !== 1) {
      return NextResponse.json(
        { error: 'Invalid view_type. Must be 0 (card) or 1 (table)' },
        { status: 400 }
      );
    }

    // Update or create view preference
    const existingPreference: any[] = await prisma.$queryRaw`
      SELECT * FROM sheet_view WHERE manager_id = ${String(userId)} LIMIT 1
    `;

    if (existingPreference.length > 0) {
      await prisma.$executeRaw`
        UPDATE sheet_view SET view_type = ${view_type} WHERE id = ${existingPreference[0].id}
      `;
    } else {
      await prisma.$executeRaw`
        INSERT INTO sheet_view (manager_id, view_type) VALUES (${String(userId)}, ${view_type})
      `;
    }

    return NextResponse.json({ 
      success: true,
      view_type 
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to update view preference' },
      { status: 500 }
    );
  }
}
