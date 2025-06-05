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

export async function getUserById(id) {
  const client = await pool.connect();
  
  try {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new Error('Invalid user ID');
    }
    
    const result = await client.query(
      'SELECT id, email, full_name, institution, phone, registration_id FROM users WHERE id = $1',
      [numericId]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Get user by ID error:', error);
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
      presentation_type, abstract_content, co_authors,
      file_path, file_name, file_size, registration_id
    } = abstractData;
    
    const abstract_number = `ABST-${presentation_type.substring(0,2).toUpperCase()}-${String(Date.now()).slice(-6)}`;
    
    const result = await client.query(`
      INSERT INTO abstracts (
        user_id, title, presenter_name, institution_name,
        presentation_type, abstract_content, co_authors, abstract_number,
        file_path, file_name, file_size, registration_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
      RETURNING *
    `, [
      user_id, title, presenter_name, institution_name, 
      presentation_type, abstract_content, co_authors, abstract_number,
      file_path, file_name, file_size, registration_id
    ]);
    
    console.log('✅ Abstract created successfully:', result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Abstract creation error:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function getAllAbstracts(filters = {}) {
  const client = await pool.connect();
  
  try {
    let query = `
      SELECT a.*, u.email as user_email, u.phone as user_phone, u.full_name as user_name 
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
    console.log(`📊 Retrieved ${result.rows.length} abstracts from database`);
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
    const numericUserId = parseInt(userId, 10);
    if (isNaN(numericUserId)) {
      throw new Error('Invalid user ID');
    }
    
    const result = await client.query(
      'SELECT * FROM abstracts WHERE user_id = $1 ORDER BY submission_date DESC',
      [numericUserId]
    );
    return result.rows;
  } catch (error) {
    console.error('❌ Get user abstracts error:', error);
    return [];
  } finally {
    client.release();
  }
}

export async function getAbstractById(id) {
  const client = await pool.connect();
  
  try {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new Error('Invalid abstract ID');
    }
    
    const result = await client.query(
      'SELECT * FROM abstracts WHERE id = $1',
      [numericId]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Get abstract by ID error:', error);
    return null;
  } finally {
    client.release();
  }
}

export async function updateAbstractStatus(abstractId, status, comments = null) {
  const client = await pool.connect();
  
  try {
    const numericId = parseInt(abstractId, 10);
    if (isNaN(numericId)) {
      throw new Error('Invalid abstract ID');
    }
    
    console.log('🔄 Updating single abstract:', { id: numericId, status, comments });
    
    const result = await client.query(`
      UPDATE abstracts 
      SET status = $1, reviewer_comments = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [status, comments, numericId]);
    
    if (result.rows.length > 0) {
      console.log('✅ Abstract status updated:', result.rows[0]);
      return result.rows[0];
    } else {
      throw new Error('Abstract not found');
    }
  } catch (error) {
    console.error('❌ Update abstract status error:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function bulkUpdateAbstractStatus(abstractIds, status, comments = null) {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Bulk update starting:', { 
      abstractIds, 
      status, 
      comments,
      idsType: Array.isArray(abstractIds) ? `array[${abstractIds.length}]` : typeof abstractIds 
    });
    
    // Validate inputs
    if (!abstractIds || !Array.isArray(abstractIds) || abstractIds.length === 0) {
      throw new Error('Invalid abstractIds array');
    }
    
    if (!status) {
      throw new Error('Status is required');
    }
    
    // Convert all IDs to integers
    const numericIds = abstractIds.map(id => {
      const numId = parseInt(id, 10);
      console.log(`Converting ID: ${id} (${typeof id}) -> ${numId}`);
      return numId;
    }).filter(id => !isNaN(id));
    
    console.log('📋 Converted numeric IDs:', numericIds);
    
    if (numericIds.length === 0) {
      throw new Error('No valid numeric abstract IDs found');
    }
    
    // Check which abstracts exist first
    const placeholders = numericIds.map((_, index) => `$${index + 1}`).join(',');
    const checkQuery = `
      SELECT id, title, status, presenter_name 
      FROM abstracts 
      WHERE id IN (${placeholders})
    `;
    
    console.log('🔍 Check query:', checkQuery);
    console.log('🔍 Check params:', numericIds);
    
    const checkResult = await client.query(checkQuery, numericIds);
    console.log('📊 Found abstracts:', checkResult.rows.length, 'out of', numericIds.length);
    
    if (checkResult.rows.length === 0) {
      throw new Error(`No abstracts found with IDs: ${numericIds.join(', ')}`);
    }
    
    // Update the abstracts using IN clause
    const updatePlaceholders = numericIds.map((_, index) => `$${index + 3}`).join(',');
    const updateQuery = `
      UPDATE abstracts 
      SET 
        status = $1, 
        reviewer_comments = $2, 
        updated_at = CURRENT_TIMESTAMP
      WHERE id IN (${updatePlaceholders})
      RETURNING id, title, presenter_name, status, updated_at, reviewer_comments
    `;
    
    console.log('🔄 Update query:', updateQuery);
    const updateParams = [status, comments, ...numericIds];
    console.log('🔄 Update params:', updateParams);
    
    const updateResult = await client.query(updateQuery, updateParams);
    
    console.log('✅ Bulk update successful!');
    console.log('📊 Updated abstracts count:', updateResult.rows.length);
    console.log('📋 Updated abstracts:', updateResult.rows.map(r => ({ id: r.id, title: r.title, status: r.status })));
    
    return updateResult.rows;
    
  } catch (error) {
    console.error('❌ Bulk update error:', {
      message: error.message,
      abstractIds,
      status,
      comments
    });
    throw error;
  } finally {
    client.release();
  }
}

export async function updateAbstract(id, updateData) {
  const client = await pool.connect();
  
  try {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new Error('Invalid abstract ID');
    }
    
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(updateData[key]);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(numericId);

    const query = `
      UPDATE abstracts 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await client.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Update abstract error:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteAbstract(id) {
  const client = await pool.connect();
  
  try {
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      throw new Error('Invalid abstract ID');
    }
    
    const result = await client.query('DELETE FROM abstracts WHERE id = $1 RETURNING *', [numericId]);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Delete abstract error:', error);
    throw error;
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

export async function getStatistics() {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT 
        presentation_type,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
      FROM abstracts
      GROUP BY presentation_type
      ORDER BY presentation_type
    `);
    
    return result.rows;
  } catch (error) {
    console.error('❌ Get statistics error:', error);
    return [];
  } finally {
    client.release();
  }
}

// Initialize database on module load
initializeDatabase().catch(console.error);

export default pool;
