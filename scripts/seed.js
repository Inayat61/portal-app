const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'portal_user',
  password: process.env.DB_PASSWORD || 'portal_password',
  database: process.env.DB_NAME || 'portal_db'
};

const seedData = async () => {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database for seeding');
    
    // Clear existing data (in reverse order due to foreign keys)
    console.log('Clearing existing data...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('TRUNCATE TABLE audit_logs');
    await connection.query('TRUNCATE TABLE tasks');
    await connection.query('TRUNCATE TABLE projects');
    await connection.query('TRUNCATE TABLE users');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Existing data cleared');
    
    // Hash passwords
    console.log('Creating user accounts...');
    const adminPassword = await bcrypt.hash('admin123', 12);
    const userPassword = await bcrypt.hash('user123', 12);
    const user2Password = await bcrypt.hash('user456', 12);
    
    // Insert users
    const [adminResult] = await connection.query(`
      INSERT INTO users (email, password_hash, role, status) VALUES 
      ('admin@portal.com', ?, 'admin', 'active')
    `, [adminPassword]);
    
    const [userResult] = await connection.query(`
      INSERT INTO users (email, password_hash, role, status) VALUES 
      ('user@portal.com', ?, 'user', 'active'),
      ('user2@portal.com', ?, 'user', 'active')
    `, [userPassword, user2Password]);
    
    const adminId = adminResult.insertId;
    const userId = userResult.insertId;
    const user2Id = userId + 1;
    
    console.log('✅ Users created:', { adminId, userId, user2Id });
    
    // Insert projects
    console.log('Creating projects...');
    const [projectResult] = await connection.query(`
      INSERT INTO projects (name, description, owner_id) VALUES 
      ('E-commerce Platform', 'Building a modern e-commerce solution with React and Node.js', ?),
      ('Mobile App Development', 'Creating a cross-platform mobile app using React Native', ?),
      ('Data Analytics Dashboard', 'Developing analytics dashboard for business insights', ?)
    `, [userId, userId, user2Id]);
    
    const project1Id = projectResult.insertId;
    const project2Id = project1Id + 1;
    const project3Id = project1Id + 2;
    
    console.log('✅ Projects created:', { project1Id, project2Id, project3Id });
    
    // Insert tasks
    console.log('Creating tasks...');
    await connection.query(`
      INSERT INTO tasks (project_id, title, description, status) VALUES 
      (?, 'Setup Database Schema', 'Design and implement the database schema for the e-commerce platform', 'done'),
      (?, 'Implement User Authentication', 'Create login/logout functionality with JWT tokens', 'in_progress'),
      (?, 'Build Product Catalog', 'Develop product listing and detail pages', 'new'),
      (?, 'Payment Integration', 'Integrate Stripe payment gateway', 'new'),
      (?, 'Mobile UI Design', 'Design the user interface for mobile screens', 'in_progress'),
      (?, 'Push Notifications', 'Implement push notification system', 'new'),
      (?, 'Data Collection Setup', 'Configure data collection from various sources', 'done'),
      (?, 'Chart Components', 'Create reusable chart components using D3.js', 'in_progress'),
      (?, 'User Dashboard', 'Build user-specific analytics dashboard', 'new')
    `, [
      project1Id, project1Id, project1Id, project1Id,
      project2Id, project2Id,
      project3Id, project3Id, project3Id
    ]);
    
    console.log('✅ Tasks created');
    
    // Insert some initial audit logs
    console.log('Creating initial audit logs...');
    await connection.query(`
      INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, result, ip) VALUES 
      (?, 'login.success', 'user', ?, 'success', '127.0.0.1'),
      (?, 'project.view', 'project', ?, 'success', '127.0.0.1'),
      (?, 'login.success', 'user', ?, 'success', '127.0.0.1')
    `, [adminId, adminId, userId, project1Id, user2Id, user2Id]);
    
    console.log('✅ Initial audit logs created');
    
    // Display seed information
    console.log('\n🎉 SEED DATA SUMMARY 🎉');
    console.log('========================');
    console.log('👤 Admin Account:');
    console.log('   📧 Email: admin@portal.com');
    console.log('   🔑 Password: admin123');
    console.log('   👑 Role: admin');
    console.log('');
    console.log('👥 User Accounts:');
    console.log('   📧 Email: user@portal.com');
    console.log('   🔑 Password: user123');
    console.log('   👤 Role: user');
    console.log('');
    console.log('   📧 Email: user2@portal.com');
    console.log('   🔑 Password: user456');
    console.log('   👤 Role: user');
    console.log('');
    console.log('📊 Data Created:');
    console.log('   📁 Projects: 3 projects created');
    console.log('   ✅ Tasks: 9 tasks created');
    console.log('   📝 Audit Logs: Initial logs created');
    console.log('========================\n');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Run seeding if called directly
if (require.main === module) {
  seedData()
    .then(() => {
      console.log('✅ Database seeded successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedData };