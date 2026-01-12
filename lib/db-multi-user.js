/**
 * Multi-User Database Helper
 *
 * This module provides database connection and query helpers
 * with automatic user context setting for Row Level Security (RLS)
 *
 * Usage:
 * import { withUserContext, queryWithUser } from '@/lib/db-multi-user';
 *
 * const students = await queryWithUser(userId, 'SELECT * FROM students');
 */

import { Pool } from 'pg';

// Create connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Execute a callback function with user context set
 * This is the main function you should use for all database operations
 *
 * @param {string} userId - The UUID of the current user
 * @param {Function} callback - Async function that receives the client
 * @returns {Promise<any>} Result from the callback function
 *
 * @example
 * const students = await withUserContext(userId, async (client) => {
 *   const result = await client.query('SELECT * FROM students');
 *   return result.rows;
 * });
 */
export async function withUserContext(userId, callback) {
  if (!userId) {
    throw new Error('User ID is required for database operations');
  }

  const client = await pool.connect();

  try {
    // Set the user context for Row Level Security
    await client.query('SET LOCAL app.current_user_id = $1', [userId]);

    // Execute the callback with the client
    const result = await callback(client);

    return result;
  } catch (error) {
    // Log error with context
    console.error('Database error for user:', userId, error);
    throw error;
  } finally {
    // Always release the client back to the pool
    client.release();
  }
}

/**
 * Execute a single query with user context
 * Simplified version for single queries
 *
 * @param {string} userId - The UUID of the current user
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} Query result rows
 *
 * @example
 * const students = await queryWithUser(
 *   userId,
 *   'SELECT * FROM students WHERE class_id = $1',
 *   [classId]
 * );
 */
export async function queryWithUser(userId, text, params = []) {
  return await withUserContext(userId, async (client) => {
    const result = await client.query(text, params);
    return result.rows;
  });
}

/**
 * Execute a single query and return the first row
 * Useful for queries that should return a single record
 *
 * @param {string} userId - The UUID of the current user
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<Object|null>} First row or null if no results
 *
 * @example
 * const student = await queryOneWithUser(
 *   userId,
 *   'SELECT * FROM students WHERE id = $1',
 *   [studentId]
 * );
 */
export async function queryOneWithUser(userId, text, params = []) {
  const rows = await queryWithUser(userId, text, params);
  return rows[0] || null;
}

/**
 * Execute multiple queries in a transaction with user context
 * All queries succeed or all fail together
 *
 * @param {string} userId - The UUID of the current user
 * @param {Function} callback - Async function that executes queries
 * @returns {Promise<any>} Result from the callback function
 *
 * @example
 * const result = await transactionWithUser(userId, async (client) => {
 *   // Insert student
 *   const student = await client.query(
 *     'INSERT INTO students (name, class_id) VALUES ($1, $2) RETURNING *',
 *     [name, classId]
 *   );
 *
 *   // Create admission record
 *   await client.query(
 *     'INSERT INTO student_admissions_history (student_id) VALUES ($1)',
 *     [student.rows[0].id]
 *   );
 *
 *   return student.rows[0];
 * });
 */
export async function transactionWithUser(userId, callback) {
  return await withUserContext(userId, async (client) => {
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}

/**
 * Insert a record and return the created row
 *
 * @param {string} userId - The UUID of the current user
 * @param {string} table - Table name
 * @param {Object} data - Object with column names as keys
 * @returns {Promise<Object>} The created row
 *
 * @example
 * const student = await insertWithUser(userId, 'students', {
 *   name: 'Ali Ahmed',
 *   admission_no: 'STD001',
 *   class_id: classId
 * });
 */
export async function insertWithUser(userId, table, data) {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

  const query = `
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES (${placeholders})
    RETURNING *
  `;

  const rows = await queryWithUser(userId, query, values);
  return rows[0];
}

/**
 * Update a record and return the updated row
 *
 * @param {string} userId - The UUID of the current user
 * @param {string} table - Table name
 * @param {string} id - Record ID to update
 * @param {Object} data - Object with column names as keys
 * @returns {Promise<Object|null>} The updated row or null if not found
 *
 * @example
 * const student = await updateWithUser(userId, 'students', studentId, {
 *   name: 'Ali Ahmed Updated',
 *   email: 'ali@example.com'
 * });
 */
export async function updateWithUser(userId, table, id, data) {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');

  const query = `
    UPDATE ${table}
    SET ${setClause}, updated_at = NOW()
    WHERE id = $${values.length + 1}
    RETURNING *
  `;

  const rows = await queryWithUser(userId, query, [...values, id]);
  return rows[0] || null;
}

/**
 * Delete a record
 *
 * @param {string} userId - The UUID of the current user
 * @param {string} table - Table name
 * @param {string} id - Record ID to delete
 * @returns {Promise<boolean>} True if deleted, false if not found
 *
 * @example
 * const deleted = await deleteWithUser(userId, 'students', studentId);
 * if (!deleted) {
 *   throw new Error('Student not found or access denied');
 * }
 */
export async function deleteWithUser(userId, table, id) {
  const query = `DELETE FROM ${table} WHERE id = $1 RETURNING id`;
  const rows = await queryWithUser(userId, query, [id]);
  return rows.length > 0;
}

/**
 * Find a single record by ID
 *
 * @param {string} userId - The UUID of the current user
 * @param {string} table - Table name
 * @param {string} id - Record ID
 * @returns {Promise<Object|null>} The record or null if not found
 *
 * @example
 * const student = await findByIdWithUser(userId, 'students', studentId);
 */
export async function findByIdWithUser(userId, table, id) {
  return await queryOneWithUser(
    userId,
    `SELECT * FROM ${table} WHERE id = $1`,
    [id]
  );
}

/**
 * Find records by a specific column value
 *
 * @param {string} userId - The UUID of the current user
 * @param {string} table - Table name
 * @param {string} column - Column name to filter by
 * @param {any} value - Value to match
 * @returns {Promise<Array>} Array of matching records
 *
 * @example
 * const students = await findByWithUser(
 *   userId,
 *   'students',
 *   'class_id',
 *   classId
 * );
 */
export async function findByWithUser(userId, table, column, value) {
  return await queryWithUser(
    userId,
    `SELECT * FROM ${table} WHERE ${column} = $1 ORDER BY created_at DESC`,
    [value]
  );
}

/**
 * Count records in a table
 *
 * @param {string} userId - The UUID of the current user
 * @param {string} table - Table name
 * @param {string} whereClause - Optional WHERE clause (without WHERE keyword)
 * @param {Array} params - Parameters for the where clause
 * @returns {Promise<number>} Count of records
 *
 * @example
 * const count = await countWithUser(userId, 'students');
 * const activeCount = await countWithUser(
 *   userId,
 *   'students',
 *   'status = $1',
 *   ['active']
 * );
 */
export async function countWithUser(userId, table, whereClause = '', params = []) {
  const query = whereClause
    ? `SELECT COUNT(*) FROM ${table} WHERE ${whereClause}`
    : `SELECT COUNT(*) FROM ${table}`;

  const rows = await queryWithUser(userId, query, params);
  return parseInt(rows[0].count);
}

/**
 * Check if a record exists
 *
 * @param {string} userId - The UUID of the current user
 * @param {string} table - Table name
 * @param {string} column - Column name to check
 * @param {any} value - Value to check
 * @returns {Promise<boolean>} True if exists, false otherwise
 *
 * @example
 * const exists = await existsWithUser(
 *   userId,
 *   'students',
 *   'admission_no',
 *   'STD001'
 * );
 */
export async function existsWithUser(userId, table, column, value) {
  const count = await countWithUser(userId, table, `${column} = $1`, [value]);
  return count > 0;
}

/**
 * Get the current user ID from database context
 * Useful for debugging
 *
 * @param {Object} client - Database client
 * @returns {Promise<string|null>} Current user ID or null
 */
export async function getCurrentUserId(client) {
  const result = await client.query('SELECT get_current_user_id() as user_id');
  return result.rows[0].user_id;
}

/**
 * Test database connection
 *
 * @returns {Promise<boolean>} True if connected successfully
 */
export async function testConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

/**
 * Close the database pool
 * Call this when shutting down the application
 *
 * @returns {Promise<void>}
 */
export async function closePool() {
  await pool.end();
  console.log('Database pool closed');
}

// Export the pool for advanced use cases
export { pool };

// Export default object with all functions
export default {
  withUserContext,
  queryWithUser,
  queryOneWithUser,
  transactionWithUser,
  insertWithUser,
  updateWithUser,
  deleteWithUser,
  findByIdWithUser,
  findByWithUser,
  countWithUser,
  existsWithUser,
  getCurrentUserId,
  testConnection,
  closePool,
  pool
};
