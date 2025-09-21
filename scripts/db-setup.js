const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuration for initial connection (without database)
const initialConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'portal_user',
  password: process.env.DB_PASSWORD || 'portal_password'
};

// Configuration for database connection
const dbConfig = {
  ...initialConfig,
  database: process.env.DB_NAME || 'portal_db'
};

const setupDatabase = async () => {
  let connection;
  
  try {
    // First, connect without specifying database
    console.log('Connecting to MySQL server...');
    connection = await mysql.createConnection(initialConfig);
    
    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'portal_db';
    console.log(`Creating database ${dbName} if it doesn't exist...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    
    // Close the initial connection
    await connection.end();
    
    // Connect to the specific database
    console.log(`Connecting to database ${dbName}...`);
    connection = await mysql.createConnection(dbConfig);
    
    console.log('Database setup completed successfully');
    return connection;
    
  } catch (error) {
    console.error('Database setup failed:', error);
    if (connection) {
      await connection.end();
    }
    throw error;
  }
};

const createTables = async () => {
  let connection;
  
  try {
    connection = await setupDatabase();
    
    // Create users table
    console.log('Creating users table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin') DEFAULT 'user',
        status ENUM('active', 'blocked') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_role (role),
        INDEX idx_status (status)
      )
    `);
    console.log('✅ Users table created');
    
    // Create projects table
    console.log('Creating projects table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        owner_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_owner (owner_id),
        INDEX idx_created (created_at)
      )
    `);
    console.log('✅ Projects table created');
    
    // Create tasks table
    console.log('Creating tasks table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        project_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status ENUM('new', 'in_progress', 'done') DEFAULT 'new',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        INDEX idx_project (project_id),
        INDEX idx_status (status),
        INDEX idx_created (created_at)
      )
    `);
    console.log('✅ Tasks table created');
    
    // Create audit_logs table
    console.log('Creating audit_logs table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        actor_user_id INT,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id INT,
        result ENUM('success', 'fail') DEFAULT 'success',
        ip VARCHAR(45),
        user_agent TEXT,
        details JSON,
        INDEX idx_actor (actor_user_id),
        INDEX idx_action (action),
        INDEX idx_entity (entity_type, entity_id),
        INDEX idx_ts (ts),
        INDEX idx_ip (ip)
      )
    `);
    console.log('✅ Audit logs table created');
    
    console.log('🎉 All tables created successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Run migration if called directly
if (require.main === module) {
  createTables()
    .then(() => {
      console.log('✅ Database migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database migration failed:', error);
      process.exit(1);
    });
}

module.exports = { createTables, setupDatabase };