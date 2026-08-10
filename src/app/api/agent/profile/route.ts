import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { verifyPassword, hashPassword } from '@/lib/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// GET - Fetch user profile
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.userId;

    // Fetch user with manager information
    const user = await prisma.$queryRaw<any[]>`
      SELECT 
        u.id,
        u.username,
        u.isActive,
        u.manager_id,
        m.username as manager_name
      FROM users u
      LEFT JOIN users m ON u.manager_id = m.id
      WHERE u.id = ${userId}
      LIMIT 1
    `;

    if (!user || user.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Don't send password in response
    const { password, passwordRequest, isPasswordRequest, ...userProfile } = user[0] as any;

    return NextResponse.json({ user: userProfile });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update user profile
export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userId = decoded.userId;

    const body = await request.json();
    const { username, currentPassword, newPassword } = body;

    // Fetch current user
    const currentUser = await prisma.$queryRaw<any[]>`
      SELECT * FROM users WHERE id = ${userId} LIMIT 1
    `;

    if (!currentUser || currentUser.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = currentUser[0];

    // Validate username
    if (!username || username.trim().length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
    }

    // Check if username is already taken by another user
    if (username !== user.username) {
      const existingUser = await prisma.$queryRaw<any[]>`
        SELECT id FROM users WHERE username = ${username} AND id != ${userId} LIMIT 1
      `;

      if (existingUser && existingUser.length > 0) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
      }
    }

    // If password change is requested
    if (currentPassword && newPassword) {
      // Verify current password
      const isPasswordValid = await verifyPassword(currentPassword, user.password);

      if (!isPasswordValid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }      // Validate new password
      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update username and password
      await prisma.$executeRaw`
        UPDATE users 
        SET username = ${username}, password = ${hashedPassword}
        WHERE id = ${userId}
      `;
    } else {
      // Update only username
      await prisma.$executeRaw`
        UPDATE users 
        SET username = ${username}
        WHERE id = ${userId}
      `;
    }

    // Fetch updated user with manager information
    const updatedUser = await prisma.$queryRaw<any[]>`
      SELECT 
        u.id,
        u.username,
        u.isActive,
        u.manager_id,
        m.username as manager_name
      FROM users u
      LEFT JOIN users m ON u.manager_id = m.id
      WHERE u.id = ${userId}
      LIMIT 1
    `;

    const { password, passwordRequest, isPasswordRequest, ...userProfile } = updatedUser[0] as any;

    return NextResponse.json({ 
      message: 'Profile updated successfully',
      user: userProfile 
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
