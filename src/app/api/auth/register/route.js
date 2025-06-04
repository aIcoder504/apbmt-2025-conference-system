import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import { join } from 'path';

export async function POST(request) {
  try {
    // Initialize database directly here
    const db = new Database(join(process.cwd(), 'database.sqlite'));
    
    // Create table if not exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        institution TEXT,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const { email, password, full_name, institution, phone } = await request.json();
    
    if (!email || !password || !full_name) {
      return NextResponse.json({ 
        success: false, 
        message: 'Email, password, and full name are required' 
      }, { status: 400 });
    }
    
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    
    if (existingUser) {
      return NextResponse.json({ 
        success: false, 
        message: 'User with this email already exists' 
      }, { status: 400 });
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const stmt = db.prepare(`
      INSERT INTO users (email, password, full_name, institution, phone) 
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(email, hashedPassword, full_name, institution || null, phone || null);
    
    db.close();
    
    return NextResponse.json({ 
      success: true, 
      message: 'User registered successfully',
      userId: result.lastInsertRowid 
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}