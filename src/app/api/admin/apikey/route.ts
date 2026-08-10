import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// GET - Fetch the API key for the logged-in admin
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verify(token, JWT_SECRET) as { userId: number; role: string };

    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const customerId = decoded.userId;

    // Check if API key exists for this customer using raw SQL
    const apiKeyRecord = await prisma.$queryRaw<Array<{ id: number; customer_id: number; api_key: string }>>`
      SELECT * FROM apikey WHERE customer_id = ${customerId} LIMIT 1
    `;

    if (!apiKeyRecord || apiKeyRecord.length === 0) {
      return NextResponse.json({ apiKey: null, customerId }, { status: 200 });
    }

    return NextResponse.json({ apiKey: apiKeyRecord[0].api_key, customerId }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Generate or update API key for the logged-in admin
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verify(token, JWT_SECRET) as { userId: number; role: string };

    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const customerId = decoded.userId;
    const newApiKey = randomUUID();

    // Check if API key already exists using raw SQL
    const existingKey = await prisma.$queryRaw<Array<{ id: number; customer_id: number; api_key: string }>>`
      SELECT * FROM apikey WHERE customer_id = ${customerId} LIMIT 1
    `;

    if (existingKey && existingKey.length > 0) {
      // Update existing key
      await prisma.$executeRaw`
        UPDATE apikey 
        SET api_key = ${newApiKey}
        WHERE customer_id = ${customerId}
      `;
    } else {
      // Create new key
      await prisma.$executeRaw`
        INSERT INTO apikey (customer_id, api_key, created_at)
        VALUES (${customerId}, ${newApiKey}, NOW())
      `;
    }

    return NextResponse.json({ apiKey: newApiKey, customerId }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
