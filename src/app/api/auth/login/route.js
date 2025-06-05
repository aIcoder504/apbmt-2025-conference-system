// src/app/api/auth/login/route.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import { getUserByEmail, testConnection } from '@/lib/database-postgres';

export async function POST(request) {
  try {
    console.log('🔐 Login API called - PostgreSQL Version');
    
    // Test database connection first
    const connectionTest = await testConnection();
    if (!connectionTest.success) {
      console.error('❌ Database connection failed:', connectionTest.error);
      return NextResponse.json({
        success: false,
        message: 'Database connection failed'
      }, { status: 500 });
    }
    console.log('✅ PostgreSQL database connected successfully');

    const { email, password } = await request.json();
    
    console.log('🔑 Login attempt for email:', email);

    // Validation
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return NextResponse.json({
        success: false,
        message: 'Email and password are required'
      }, { status: 400 });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Invalid email format:', email);
      return NextResponse.json({
        success: false,
        message: 'Invalid email format'
      }, { status: 400 });
    }

    // Get user from PostgreSQL
    const user = await getUserByEmail(email.toLowerCase().trim());
    
    if (!user) {
      console.log('❌ User not found:', email);
      return NextResponse.json({
        success: false,
        message: 'Invalid email or password'
      }, { status: 401 });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      console.log('❌ Invalid password for user:', email);
      return NextResponse.json({
        success: false,
        message: 'Invalid email or password'
      }, { status: 401 });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        name: user.full_name 
      },
      process.env.JWT_SECRET || 'apbmt-jwt-secret-2025',
      { expiresIn: '7d' }
    );

    console.log('✅ Login successful for user:', user.email);
    console.log('✅ User ID:', user.id);

    return NextResponse.json({
      success: true,
      message: 'Login successful! Welcome back to APBMT 2025.',
      token,
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.full_name,
        institution: user.institution,
        registrationId: user.registration_id
      }
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    
    // Specific error handling
    if (error.code === 'ECONNREFUSED') {
      return NextResponse.json({
        success: false,
        message: 'Database connection refused. Please try again later.'
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error. Please try again.'
    }, { status: 500 });
  }
}
