// Script to create admin user
const bcrypt = require('bcrypt');

async function createAdminUser() {
  // Import modules dynamically
  const { storage } = await import('../server/storage.js');
  
  const adminData = {
    email: 'admin@dropdaily.com',
    password: await bcrypt.hash('DD2025!', 10),
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    isOnboarded: true
  };

  try {
    // Check if admin already exists
    const existingAdmin = await storage.getUserByEmail(adminData.email);
    if (existingAdmin) {
      console.log('❌ Admin user already exists with email:', adminData.email);
      return;
    }

    // Create admin user
    const adminUser = await storage.createUser(adminData);
    console.log('✅ Admin user created successfully:');
    console.log('Email:', adminUser.email);
    console.log('Name:', adminUser.firstName, adminUser.lastName);
    console.log('Role:', adminUser.role);
    console.log('ID:', adminUser.id);
    
    console.log('\n🔑 Login credentials:');
    console.log('Email: admin@dropdaily.com');
    console.log('Password: DD2025!');
    
  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
  }
}

createAdminUser().then(() => {
  console.log('✅ Script completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});