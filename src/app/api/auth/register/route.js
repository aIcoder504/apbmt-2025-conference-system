import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { createUser, initializeDatabase, testConnection } from '@/lib/database-postgres';

export async function POST(request) {
  try {
    console.log('🚀 Registration API called');
    
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

    // Initialize database tables if they don't exist
    await initializeDatabase();
    
    const { email, password, full_name, institution, phone } = await request.json();
    
    console.log('📝 Registration data received:', { 
      email, 
      full_name,
      institution: institution || 'Not provided'
    });

    // Validation
    if (!email || !password || !full_name) {
      console.log('❌ Validation failed: Missing required fields');
      return NextResponse.json({
        success: false,
        message: 'Email, password, and full name are required'
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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log('🔐 Password hashed successfully');

    // Create user in PostgreSQL
    const result = await createUser({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      full_name: full_name.trim(),
      institution: institution?.trim() || '',
      phone: phone?.trim() || ''
    });

    if (!result.success) {
      console.log('❌ User creation failed:', result.error);
      
      // Handle duplicate email error
      if (result.error === 'Email already exists') {
        return NextResponse.json({
          success: false,
          message: 'User with this email already exists'
        }, { status: 400 });
      }
      
      return NextResponse.json({
        success: false,
        message: result.error
      }, { status: 400 });
    }

    // Generate JWT token for auto-login
    const token = jwt.sign(
      { 
        userId: result.user.id, 
        email: result.user.email,
        name: result.user.full_name
      },
      process.env.JWT_SECRET || 'apbmt-jwt-secret-2025',
      { expiresIn: '7d' }
    );

    console.log('✅ Registration successful for user:', result.user.email);
    console.log('✅ User ID:', result.user.id);
    console.log('✅ Registration ID:', result.user.registration_id);

    return NextResponse.json({
      success: true,
      message: 'User registered successfully! Welcome to APBMT 2025.',
      userId: result.user.id,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.full_name,
        registrationId: result.user.registration_id
      },
      token
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    
    // Specific error handling
    if (error.code === 'ECONNREFUSED') {
      return NextResponse.json({
        success: false,
        message: 'Database connection refused. Please try again later.'
      }, { status: 500 });
    }
    
    if (error.code === '23505') {
      return NextResponse.json({
        success: false,
        message: 'User with this email already exists'
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error. Please try again.'
    }, { status: 500 });
  }
}
