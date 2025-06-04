import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import { join } from 'path';

export async function POST(request) {
  try {
    // Initialize database directly here
    const db = new Database(join(process.cwd(), 'database.sqlite'));
    
    const { email, password } = await request.json();
    
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = stmt.get(email);
    
    if (!user) {
      db.close();
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid email or password' 
      }, { status: 401 });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      db.close();
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid email or password' 
      }, { status: 401 });
    }
    
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        name: user.full_name 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    db.close();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Login successful',
      token,
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.full_name,
        institution: user.institution
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}