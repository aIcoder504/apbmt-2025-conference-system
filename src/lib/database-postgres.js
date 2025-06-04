// src/lib/database-postgres.js
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Initialize database tables
export async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Initializing database tables...');
    
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        institution VARCHAR(255),
        phone VARCHAR(20),
        registration_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Abstracts table  
    await client.query(`
      CREATE TABLE IF NOT EXISTS abstracts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title TEXT NOT NULL,
        presenter_name VARCHAR(255) NOT NULL,
        institution_name VARCHAR(255),
        presentation_type VARCHAR(50) NOT NULL,
        abstract_content TEXT NOT NULL,
        co_authors TEXT,
        file_path VARCHAR(500),
        file_name VARCHAR(255),
        file_size INTEGER,
        status VARCHAR(20) DEFAULT 'pending',
        abstract_number VARCHAR(50),
        registration_id VARCHAR(50),
        submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewer_comments TEXT,
        final_file_path VARCHAR(500)
      )
    `);

    console.log('✅ Database tables initialized successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

// User operations
export async function createUser(userData) {
  const client = await pool.connect();
  
  try {
    const { email, password, full_name, institution, phone } = userData;
    const registration_id = `REG-${Date.now()}`;
    
    const result = await client.query(
      `INSERT INTO users (email, password, full_name, institution, phone, registration_id) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, email, full_name, registration_id`,
      [email, password, full_name, institution, phone, registration_id]
    );
    
    console.log('✅ User created successfully:', result.rows[0]);
    return { success: true, user: result.rows[0] };
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      console.log('❌ Email already exists');
      return { success: false, error: 'Email already exists' };
    }
    console.error('❌ User creation error:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

export async function getUserByEmail(email) {
  const client = await pool.connect();
  
  try {
    const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Get user error:', error);
    return null;
  } finally {
    client.release();
  }
}

// Abstract operations
export async function createAbstract(abstractData) {
  const client = await pool.connect();
  
  try {
    const {
      user_id, title, presenter_name, institution_name,
      presentation_type, abstract_content, co_authors
    } = abstractData;
    
    const abstract_number = `ABST-${presentation_type.substring(0,2).toUpperCase()}-${String(Date.now()).slice(-6)}`;
    
    const result = await client.query(`
      INSERT INTO abstracts (
        user_id, title, presenter_name, institution_name,
        presentation_type, abstract_content, co_authors, abstract_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING id, abstract_number
    `, [user_id, title, presenter_name, institution_name, presentation_type, abstract_content, co_authors, abstract_number]);
    
    console.log('✅ Abstract created successfully:', result.rows[0]);
    return { success: true, abstract: result.rows[0] };
  } catch (error) {
    console.error('❌ Abstract creation error:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

export async function getAllAbstracts() {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT a.*, u.email, u.full_name as user_name 
      FROM abstracts a 
      LEFT JOIN users u ON a.user_id = u.id 
      ORDER BY a.submission_date DESC
    `);
    return result.rows;
  } catch (error) {
    console.error('❌ Get abstracts error:', error);
    return [];
  } finally {
    client.release();
  }
}

export async function getUserAbstracts(userId) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      'SELECT * FROM abstracts WHERE user_id = $1 ORDER BY submission_date DESC',
      [userId]
    );
    return result.rows;
  } catch (error) {
    console.error('❌ Get user abstracts error:', error);
    return [];
  } finally {
    client.release();
  }
}

// Test database connection
export async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection successful:', result.rows[0]);
    return { success: true, time: result.rows[0].now };
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return { success: false, error: error.message };
  }
}

export default pool;
