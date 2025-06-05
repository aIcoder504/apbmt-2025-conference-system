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
      RETURNING id, abstract_number, submission_date
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

export async function getAllAbstracts(filters = {}) {
  const client = await pool.connect();
  
  try {
    let query = `
      SELECT a.*, u.email, u.full_name as user_name 
      FROM abstracts a 
      LEFT JOIN users u ON a.user_id = u.id 
    `;
    
    const conditions = [];
    const values = [];
    
    if (filters.status && filters.status !== 'all') {
      conditions.push(`a.status = $${values.length + 1}`);
      values.push(filters.status);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY a.submission_date DESC`;
    
    if (filters.limit) {
      query += ` LIMIT $${values.length + 1}`;
      values.push(filters.limit);
    }
    
    const result = await client.query(query, values);
    return result.rows;
  } catch (error) {
    console.error('❌ Get all abstracts error:', error);
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

export async function updateAbstractStatus(abstractId, status, comments = null) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      UPDATE abstracts 
      SET status = $1, reviewer_comments = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, title, status
    `, [status, comments, abstractId]);
    
    if (result.rows.length > 0) {
      console.log('✅ Abstract status updated:', result.rows[0]);
      return { success: true, abstract: result.rows[0] };
    } else {
      return { success: false, error: 'Abstract not found' };
    }
  } catch (error) {
    console.error('❌ Update abstract status error:', error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

export async function getAbstractStats() {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM abstracts 
      GROUP BY status
    `);
    
    const stats = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      under_review: 0,
      final_submitted: 0
    };
    
    result.rows.forEach(row => {
      stats[row.status] = parseInt(row.count);
      stats.total += parseInt(row.count);
    });
    
    return stats;
  } catch (error) {
    console.error('❌ Get stats error:', error);
    return {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      under_review: 0,
      final_submitted: 0
    };
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
