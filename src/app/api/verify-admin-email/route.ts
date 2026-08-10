import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    // Fetch all users from PulsePoint API using server-side credentials
    const response = await axios.get('https://api.pulsepoint.clinotag.com/api/user/allusers', {
      auth: {
        username: process.env.PULSEPOINT_API_USERNAME || '',
        password: process.env.PULSEPOINT_API_PASSWORD || ''
      }
    });

    const allUsers = response.data?.data || response.data || [];

    // Check if email exists in the user list
    const adminUser = allUsers.find((user: { email?: string; id: number }) =>
      user.email?.toLowerCase() === email.toLowerCase()
    );

    if (adminUser) {
      return NextResponse.json({
        success: true,
        exists: true,
        data: allUsers,
        customerId: adminUser.id
      });
    }

    return NextResponse.json({
      success: true,
      exists: false
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Failed to verify email' },
      { status: 500 }
    );
  }
}
