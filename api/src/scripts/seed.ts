import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Client } from '../models/Client';
import { License } from '../models/License';
import { Contract } from '../models/Contract';
import { UserRole } from '../types';
import { config } from '../config';

const seedDatabase = async () => {
  try {
    console.log('🌱 Seeding database...');

    // Connect to database
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Client.deleteMany({});
    await License.deleteMany({});
    await Contract.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create users
    const hashedPassword = await bcrypt.hash('password123', 10);

    const agent = new User({
      email: 'agent@advancia.com',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Agent',
      role: UserRole.AGENT
    });

    const consultant = new User({
      email: 'consultant@advancia.com',
      password: hashedPassword,
      firstName: 'Jane',
      lastName: 'Consultant',
      role: UserRole.CONSULTANT
    });

    const admin = new User({
      email: 'admin@advancia.com',
      password: hashedPassword,
      firstName: 'Bob',
      lastName: 'Admin',
      role: UserRole.ADMIN
    });

    await agent.save();
    await consultant.save();
    await admin.save();
    console.log('👥 Created users (agent, consultant, admin)');

    // Create clients
    const client1 = new Client({
      name: 'Acme Corporation',
      email: 'contact@acme.com',
      phone: '+1-555-0100',
      address: '123 Business St, New York, NY'
    });

    const client2 = new Client({
      name: 'TechStart Inc',
      email: 'info@techstart.com',
      phone: '+1-555-0200',
      address: '456 Innovation Ave, San Francisco, CA'
    });

    const client3 = new Client({
      name: 'Global Solutions Ltd',
      email: 'contact@globalsolutions.com',
      phone: '+1-555-0300',
      address: '789 Enterprise Blvd, London, UK'
    });

    await client1.save();
    await client2.save();
    await client3.save();
    console.log('🏢 Created 3 clients');

    // Create licenses with various expiry dates
    const today = new Date();
    
    // License expiring in 15 days
    const license1 = new License({
      client: client1._id,
      name: 'Enterprise Software License',
      description: 'Full enterprise suite access',
      startDate: new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000),
      isActive: true,
      assignedBy: agent._id
    });

    // License expiring in 10 days
    const license2 = new License({
      client: client2._id,
      name: 'Premium Support License',
      description: '24/7 premium support access',
      startDate: new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000),
      isActive: true,
      assignedBy: agent._id
    });

    // License expiring in 6 days (critical)
    const license3 = new License({
      client: client3._id,
      name: 'Developer Tools License',
      description: 'Development environment access',
      startDate: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000),
      isActive: true,
      assignedBy: agent._id
    });

    await license1.save();
    await license2.save();
    await license3.save();
    console.log('📜 Created 3 licenses (expiring in 15, 10, and 6 days)');

    // Create contracts with various expiry dates
    // Contract expiring in 15 days
    const contract1 = new Contract({
      client: client1._id,
      title: 'Annual Maintenance Contract',
      description: 'System maintenance and updates',
      startDate: new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000),
      value: 50000,
      isActive: true,
      managedBy: consultant._id
    });

    // Contract expiring in 10 days
    const contract2 = new Contract({
      client: client2._id,
      title: 'Consulting Services Agreement',
      description: 'Strategic consulting services',
      startDate: new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000),
      value: 100000,
      isActive: true,
      managedBy: consultant._id
    });

    // Contract expiring in 6 days (critical)
    const contract3 = new Contract({
      client: client3._id,
      title: 'Support Services Contract',
      description: 'Dedicated support team',
      startDate: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(today.getTime() + 6 * 24 * 60 * 60 * 1000),
      value: 75000,
      isActive: true,
      managedBy: consultant._id
    });

    await contract1.save();
    await contract2.save();
    await contract3.save();
    console.log('📄 Created 3 contracts (expiring in 15, 10, and 6 days)');

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📝 Test Credentials:');
    console.log('   Agent:      agent@advancia.com / password123');
    console.log('   Consultant: consultant@advancia.com / password123');
    console.log('   Admin:      admin@advancia.com / password123');
    console.log('\n🔔 Expiry Schedule:');
    console.log('   - 3 licenses expiring in 15, 10, and 6 days');
    console.log('   - 3 contracts expiring in 15, 10, and 6 days');
    console.log('\n💡 Run the expiry checker job to test notifications');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
