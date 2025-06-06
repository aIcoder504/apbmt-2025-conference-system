// src/lib/database-postgres.js
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL connection error:', err);
});

// ========================================
// USER MANAGEMENT FUNCTIONS
// ========================================

export async function createUser(userData) {
  const client = await pool.connect();
  try {
    console.log('🔄 Creating user:', userData.email);
    
    const query = `
      INSERT INTO users (email, password, full_name, institution, phone, registration_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, email, full_name, institution, phone, registration_id, created_at
    `;
    
    const values = [
      userData.email,
      userData.password,
      userData.full_name,
      userData.institution || null,
      userData.phone || null,
      userData.registration_id || null
    ];
    
    const result = await client.query(query, values);
    console.log('✅ User created successfully:', result.rows[0].id);
    return result.rows[0];
    
  } catch (error) {
    console.error('❌ Error creating user:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function getUserByEmail(email) {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await client.query(query, [email]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error getting user by email:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function getUserById(userId) {
  const client = await pool.connect();
  try {
    // Convert to integer if string
    const id = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    
    if (isNaN(id)) {
      throw new Error('Invalid user ID provided');
    }
    
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await client.query(query, [id]);
    
    console.log(`📊 User ${id} lookup:`, result.rows.length > 0 ? 'Found' : 'Not found');
    return result.rows[0] || null;
    
  } catch (error) {
    console.error('❌ Error getting user by ID:', error);
    throw error;
  } finally {
    client.release();
  }
}

// ========================================
// ABSTRACT MANAGEMENT FUNCTIONS
// ========================================

export async function createAbstract(abstractData) {
  const client = await pool.connect();
  try {
    console.log('🔄 Creating abstract for user:', abstractData.user_id);
    
    // Generate unique abstract number
    const abstractNumber = `ABST-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
    const query = `
      INSERT INTO abstracts (
        user_id, title, presenter_name, institution_name, presentation_type,
        abstract_content, co_authors, file_path, file_name, file_size,
        status, abstract_number, registration_id, submission_date, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING *
    `;
    
    const values = [
      abstractData.user_id,
      abstractData.title,
      abstractData.presenter_name,
      abstractData.institution_name || null,
      abstractData.presentation_type,
      abstractData.abstract_content,
      abstractData.co_authors || null,
      abstractData.file_path || null,
      abstractData.file_name || null,
      abstractData.file_size || null,
      'pending',
      abstractNumber,
      abstractData.registration_id || null
    ];
    
    const result = await client.query(query, values);
    console.log('✅ Abstract created successfully:', result.rows[0].id);
    return result.rows[0];
    
  } catch (error) {
    console.error('❌ Error creating abstract:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function getAbstractsByUserId(userId) {
  const client = await pool.connect();
  try {
    // Convert to integer if string
    const id = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    
    if (isNaN(id)) {
      throw new Error('Invalid user ID provided');
    }
    
    const query = `
      SELECT * FROM abstracts 
      WHERE user_id = $1 
      ORDER BY submission_date DESC
    `;
    
    const result = await client.query(query, [id]);
    console.log(`📊 Found ${result.rows.length} abstracts for user ${id}`);
    return result.rows;
    
  } catch (error) {
    console.error('❌ Error getting user abstracts:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function getAllAbstracts() {
  const client = await pool.connect();
  try {
    const query = `
      SELECT a.*, u.email, u.phone 
      FROM abstracts a 
      LEFT JOIN users u ON a.user_id = u.id 
      ORDER BY a.submission_date DESC
    `;
    
    const result = await client.query(query);
    console.log(`📊 Retrieved ${result.rows.length} total abstracts`);
    return result.rows;
    
  } catch (error) {
    console.error('❌ Error getting all abstracts:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function getAbstractById(abstractId) {
  const client = await pool.connect();
  try {
    // Convert to integer if string
    const id = typeof abstractId === 'string' ? parseInt(abstractId, 10) : abstractId;
    
    if (isNaN(id)) {
      throw new Error('Invalid abstract ID provided');
    }
    
    const query = `
      SELECT a.*, u.email, u.phone, u.full_name as user_full_name
      FROM abstracts a 
      LEFT JOIN users u ON a.user_id = u.id 
      WHERE a.id = $1
    `;
    
    const result = await client.query(query, [id]);
    
    console.log(`📊 Abstract ${id} lookup:`, result.rows.length > 0 ? 'Found' : 'Not found');
    return result.rows[0] || null;
    
  } catch (error) {
    console.error('❌ Error getting abstract by ID:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function updateAbstractStatus(abstractId, status, comments = null) {
  const client = await pool.connect();
  try {
    // Convert to integer if string
    const id = typeof abstractId === 'string' ? parseInt(abstractId, 10) : abstractId;
    
    if (isNaN(id)) {
      throw new Error('Invalid abstract ID provided');
    }
    
    console.log(`🔄 Updating abstract ${id} status to: ${status}`);
    
    const query = `
      UPDATE abstracts 
      SET status = $1, reviewer_comments = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    
    const result = await client.query(query, [status, comments, id]);
    
    if (result.rows.length === 0) {
      throw new Error(`Abstract with ID ${id} not found`);
    }
    
    console.log('✅ Abstract status updated successfully');
    return result.rows[0];
    
  } catch (error) {
    console.error('❌ Error updating abstract status:', error);
    throw error;
  } finally {
    client.release();
  }
}

// ========================================
// 🚀 BULK UPDATE FUNCTION - CRITICAL FIX
// ========================================

export async function bulkUpdateAbstractStatus(abstractIds, status, comments = null) {
  const client = await pool.connect();
  
  try {
    console.log(`🔄 Bulk updating ${abstractIds.length} abstracts to status: ${status}`);
    
    // Convert all IDs to integers and validate
    const validIds = abstractIds.map(id => {
      const numId = typeof id === 'string' ? parseInt(id, 10) : id;
      if (isNaN(numId)) {
        throw new Error(`Invalid abstract ID: ${id}`);
      }
      return numId;
    });
    
    // Start transaction for atomicity
    await client.query('BEGIN');
    
    // Build query with proper parameterization
    const placeholders = validIds.map((_, index) => `$${index + 1}`).join(',');
    const query = `
      UPDATE abstracts 
      SET status = $${validIds.length + 1}, 
          reviewer_comments = $${validIds.length + 2}, 
          updated_at = NOW()
      WHERE id IN (${placeholders})
      RETURNING id, title, status
    `;
    
    const values = [...validIds, status, comments];
    const result = await client.query(query, values);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log(`✅ Successfully updated ${result.rows.length} abstracts in bulk`);
    
    return {
      success: true,
      updatedCount: result.rows.length,
      updatedAbstracts: result.rows,
      message: `Successfully updated ${result.rows.length} abstracts to ${status}`
    };
    
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    console.error('❌ Error in bulk update operation:', error);
    throw new Error(`Bulk update failed: ${error.message}`);
    
  } finally {
    client.release();
  }
}

export async function updateAbstract(abstractId, updateData) {
  const client = await pool.connect();
  try {
    // Convert to integer if string
    const id = typeof abstractId === 'string' ? parseInt(abstractId, 10) : abstractId;
    
    if (isNaN(id)) {
      throw new Error('Invalid abstract ID provided');
    }
    
    console.log(`🔄 Updating abstract ${id} with data:`, Object.keys(updateData));
    
    // Build dynamic query based on provided fields
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    // Handle each possible update field
    const allowedFields = [
      'title', 'presenter_name', 'institution_name', 'presentation_type',
      'abstract_content', 'co_authors', 'file_path', 'file_name', 
      'file_size', 'status', 'reviewer_comments', 'final_file_path'
    ];
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        updateFields.push(`${field} = $${paramCount}`);
        values.push(updateData[field]);
        paramCount++;
      }
    }
    
    if (updateFields.length === 0) {
      throw new Error('No valid fields provided for update');
    }
    
    // Always update the updated_at timestamp
    updateFields.push(`updated_at = NOW()`);
    
    // Add the ID parameter at the end
    values.push(id);
    
    const query = `
      UPDATE abstracts 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await client.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error(`Abstract with ID ${id} not found`);
    }
    
    console.log('✅ Abstract updated successfully');
    return result.rows[0];
    
  } catch (error) {
    console.error('❌ Error updating abstract:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteAbstract(abstractId) {
  const client = await pool.connect();
  try {
    // Convert to integer if string
    const id = typeof abstractId === 'string' ? parseInt(abstractId, 10) : abstractId;
    
    if (isNaN(id)) {
      throw new Error('Invalid abstract ID provided');
    }
    
    console.log(`🔄 Deleting abstract ${id}`);
    
    const query = 'DELETE FROM abstracts WHERE id = $1 RETURNING *';
    const result = await client.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new Error(`Abstract with ID ${id} not found`);
    }
    
    console.log('✅ Abstract deleted successfully');
    return result.rows[0];
    
  } catch (error) {
    console.error('❌ Error deleting abstract:', error);
    throw error;
  } finally {
    client.release();
  }
}

// ========================================
// STATISTICS AND REPORTING
// ========================================

export async function getStatistics() {
  const client = await pool.connect();
  try {
    console.log('🔄 Fetching statistics...');
    
    const query = `
      SELECT 
        presentation_type,
        COUNT(*) as total_count,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count
      FROM abstracts 
      GROUP BY presentation_type
      ORDER BY presentation_type
    `;
    
    const result = await client.query(query);
    
    // Also get overall totals
    const totalQuery = `
      SELECT 
        COUNT(*) as total_abstracts,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as total_pending,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as total_approved,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as total_rejected,
        COUNT(DISTINCT user_id) as total_users
      FROM abstracts
    `;
    
    const totalResult = await client.query(totalQuery);
    
    console.log('✅ Statistics retrieved successfully');
    
    return {
      byCategory: result.rows,
      totals: totalResult.rows[0]
    };
    
  } catch (error) {
    console.error('❌ Error getting statistics:', error);
    throw error;
  } finally {
    client.release();
  }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

export async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log('🔄 Checking database tables...');
    
    // Check if tables exist
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'abstracts')
    `;
    
    const result = await client.query(tablesQuery);
    const existingTables = result.rows.map(row => row.table_name);
    
    if (existingTables.includes('users') && existingTables.includes('abstracts')) {
      console.log('✅ Database tables exist and ready');
      return true;
    } else {
      console.log('⚠️ Some tables missing. Database needs setup.');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool() {
  try {
    await pool.end();
    console.log('✅ Database pool closed');
  } catch (error) {
    console.error('❌ Error closing pool:', error);
    throw error;
  }
}

// ========================================
// ERROR HANDLING UTILITIES
// ========================================

export function handleDatabaseError(error, operation) {
  console.error(`❌ Database error during ${operation}:`, {
    message: error.message,
    code: error.code,
    detail: error.detail,
    hint: error.hint
  });
  
  // Return user-friendly error messages
  if (error.code === '23505') { // Unique violation
    return new Error('A record with this information already exists');
  } else if (error.code === '23503') { // Foreign key violation
    return new Error('Referenced record not found');
  } else if (error.code === '23502') { // Not null violation
    return new Error('Required field is missing');
  } else {
    return new Error(`Database operation failed: ${error.message}`);
  }
}

// Export pool for direct access if needed
export { pool };

// Default export for convenience
export default {
  // User functions
  createUser,
  getUserByEmail,
  getUserById,
  
  // Abstract functions
  createAbstract,
  getAbstractsByUserId,
  getAllAbstracts,
  getAbstractById,
  updateAbstractStatus,
  bulkUpdateAbstractStatus, // 🚀 CRITICAL FUNCTION
  updateAbstract,
  deleteAbstract,
  
  // Statistics and utilities
  getStatistics,
  initializeDatabase,
  closePool,
  handleDatabaseError,
  
  // Direct pool access
  pool
};
