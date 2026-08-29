import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Client } from '../models/Client';
import { License } from '../models/License';
import { Contract } from '../models/Contract';
import { RenewalActivity } from '../models/RenewalActivity';
import { NotificationLog } from '../models/NotificationLog';
import { ClientStatus, UserRole } from '../types';
import { config } from '../config';

const DAY_MS = 24 * 60 * 60 * 1000;
const today = new Date();
today.setUTCHours(0, 0, 0, 0);
const daysFromToday = (days: number) => new Date(today.getTime() + days * DAY_MS);

const seedDatabase = async () => {
  try {
    console.log('🌱 Seeding Advancia demo database...');
    await mongoose.connect(config.mongoUri);

    // Reset dependent collections first so reruns never leave stale demo history.
    await Promise.all([
      RenewalActivity.deleteMany({}),
      NotificationLog.deleteMany({})
    ]);
    await Promise.all([License.deleteMany({}), Contract.deleteMany({})]);
    await Promise.all([Client.deleteMany({}), User.deleteMany({})]);

    const password = await bcrypt.hash('password123', 10);
    const [agent, consultant, admin] = await User.create([
      { email: 'agent@advancia.com', password, firstName: 'Amine', lastName: 'Ben Salem', role: UserRole.AGENT },
      { email: 'consultant@advancia.com', password, firstName: 'Sarra', lastName: 'Mansouri', role: UserRole.CONSULTANT },
      { email: 'admin@advancia.com', password, firstName: 'Leila', lastName: 'Trabelsi', role: UserRole.ADMIN }
    ]);

    const [atlas, carthage, medina, olive, nexus, horizon, bluewave, unassigned] = await Client.create([
      {
        name: 'Atlas Distribution', email: 'contact@atlas-demo.tn', phone: '+216 71 100 110',
        address: 'Charguia 1, Tunis', assignedAgent: agent._id, assignedConsultant: consultant._id,
        status: ClientStatus.AT_RISK, notes: 'Priority renewal account.', lastContactAt: daysFromToday(-4)
      },
      {
        name: 'Carthage Industries', email: 'admin@carthage-demo.tn', phone: '+216 71 200 220',
        address: 'Ben Arous, Tunis', assignedAgent: agent._id, assignedConsultant: consultant._id,
        status: ClientStatus.AT_RISK, notes: 'Procurement approval still pending.', lastContactAt: daysFromToday(-8)
      },
      {
        name: 'Medina Retail Group', email: 'operations@medina-demo.tn', phone: '+216 70 300 330',
        address: 'Lac 1, Tunis', assignedAgent: agent._id, assignedConsultant: consultant._id,
        status: ClientStatus.ACTIVE, lastContactAt: daysFromToday(-2)
      },
      {
        name: 'Olive Tech Solutions', email: 'hello@olive-demo.tn', phone: '+216 74 400 440',
        address: 'Sfax', assignedAgent: agent._id, assignedConsultant: consultant._id,
        status: ClientStatus.ACTIVE, lastContactAt: daysFromToday(-1)
      },
      {
        name: 'Nexus Services', email: 'contact@nexus-demo.tn', phone: '+216 73 500 550',
        address: 'Sousse', assignedAgent: agent._id, assignedConsultant: consultant._id,
        status: ClientStatus.INACTIVE, notes: 'Renewal declined after budget review.', lastContactAt: daysFromToday(-12)
      },
      {
        name: 'Horizon Logistics', email: 'office@horizon-demo.tn', phone: '+216 72 600 660',
        address: 'Bizerte', assignedAgent: agent._id, assignedConsultant: consultant._id,
        status: ClientStatus.ACTIVE, lastContactAt: daysFromToday(-6)
      },
      {
        name: 'Bluewave Hospitality', email: 'it@bluewave-demo.tn', phone: '+216 75 700 770',
        address: 'Djerba', assignedAgent: agent._id, assignedConsultant: consultant._id,
        status: ClientStatus.ACTIVE, lastContactAt: daysFromToday(-3)
      },
      {
        name: 'Northstar Manufacturing', email: 'contact@northstar-demo.tn', phone: '+216 71 800 880',
        address: 'Mghira, Tunis', status: ClientStatus.AT_RISK,
        notes: 'New account awaiting assignment by an administrator.'
      }
    ]);

    const licenses = await License.create([
      {
        client: atlas._id, name: 'Microsoft 365 Business', description: '45 business user seats',
        startDate: daysFromToday(-370), expiryDate: daysFromToday(-5), value: 16200, quantity: 45,
        assignedBy: agent._id, isActive: true, renewalStatus: 'not_contacted'
      },
      {
        client: carthage._id, name: 'Endpoint Security Suite', description: 'Managed endpoint protection',
        startDate: daysFromToday(-360), expiryDate: daysFromToday(4), value: 9800, quantity: 80,
        assignedBy: agent._id, isActive: true, renewalStatus: 'waiting',
        nextFollowUpAt: daysFromToday(-2), lastActionAt: daysFromToday(-8)
      },
      {
        client: medina._id, name: 'Retail POS Licences', description: 'Point-of-sale licences for 12 stores',
        startDate: daysFromToday(-355), expiryDate: daysFromToday(8), value: 24000, quantity: 36,
        assignedBy: agent._id, isActive: true, renewalStatus: 'contacted', lastActionAt: daysFromToday(-2)
      },
      {
        client: horizon._id, name: 'Fleet Tracking Platform', description: 'Annual vehicle tracking access',
        startDate: daysFromToday(-350), expiryDate: daysFromToday(13), value: 18600, quantity: 25,
        assignedBy: agent._id, isActive: true, renewalStatus: 'not_contacted'
      },
      {
        client: olive._id, name: 'Cloud Development Tools', description: 'Developer toolchain subscription',
        startDate: daysFromToday(-20), expiryDate: daysFromToday(345), value: 7200, quantity: 12,
        assignedBy: agent._id, isActive: true, renewalStatus: 'renewed', lastActionAt: daysFromToday(-20),
        renewalHistory: [{ previousStartDate: daysFromToday(-386), previousExpiryDate: daysFromToday(-21),
          newStartDate: daysFromToday(-20), newExpiryDate: daysFromToday(345),
          renewedAt: daysFromToday(-20), renewedBy: agent._id, value: 7200 }]
      },
      {
        client: nexus._id, name: 'Collaboration Platform', description: 'Team workspace subscription',
        startDate: daysFromToday(-365), expiryDate: daysFromToday(-12), value: 5400, quantity: 20,
        assignedBy: agent._id, isActive: false, renewalStatus: 'declined', lastActionAt: daysFromToday(-12),
        declineReason: 'Client consolidated collaboration tools with its parent company.'
      },
      {
        client: unassigned._id, name: 'Manufacturing Design Suite', description: 'Awaiting an agent owner',
        startDate: daysFromToday(-350), expiryDate: daysFromToday(6), value: 12000, quantity: 8,
        isActive: true, renewalStatus: 'not_contacted'
      }
    ]);

    const contracts = await Contract.create([
      {
        client: atlas._id, title: 'Infrastructure Support Agreement', description: 'Annual infrastructure support',
        startDate: daysFromToday(-370), expiryDate: daysFromToday(-3), value: 48000,
        managedBy: consultant._id, isActive: true, renewalStatus: 'not_contacted'
      },
      {
        client: carthage._id, title: 'ERP Maintenance Contract', description: 'Corrective and preventive ERP maintenance',
        startDate: daysFromToday(-360), expiryDate: daysFromToday(6), value: 72000,
        managedBy: consultant._id, isActive: true, renewalStatus: 'contacted', lastActionAt: daysFromToday(-1)
      },
      {
        client: medina._id, title: 'Retail Systems Support', description: 'Support coverage for all retail locations',
        startDate: daysFromToday(-355), expiryDate: daysFromToday(10), value: 58000,
        managedBy: consultant._id, isActive: true, renewalStatus: 'waiting',
        nextFollowUpAt: daysFromToday(2), lastActionAt: daysFromToday(-2)
      },
      {
        client: bluewave._id, title: 'Hospitality Technology Advisory', description: 'Technology advisory retainer',
        startDate: daysFromToday(-350), expiryDate: daysFromToday(15), value: 36000,
        managedBy: consultant._id, isActive: true, renewalStatus: 'not_contacted'
      },
      {
        client: olive._id, title: 'Cloud Operations Retainer', description: 'Cloud operations and cost optimisation',
        startDate: daysFromToday(-30), expiryDate: daysFromToday(335), value: 64000,
        managedBy: consultant._id, isActive: true, renewalStatus: 'renewed', lastActionAt: daysFromToday(-30),
        renewalHistory: [{ previousStartDate: daysFromToday(-396), previousExpiryDate: daysFromToday(-31),
          newStartDate: daysFromToday(-30), newExpiryDate: daysFromToday(335),
          renewedAt: daysFromToday(-30), renewedBy: consultant._id, value: 64000 }]
      },
      {
        client: nexus._id, title: 'Managed Services Agreement', description: 'Managed operations service',
        startDate: daysFromToday(-365), expiryDate: daysFromToday(-9), value: 42000,
        managedBy: consultant._id, isActive: false, renewalStatus: 'declined', lastActionAt: daysFromToday(-9),
        declineReason: 'The client moved the service in-house.'
      },
      {
        client: unassigned._id, title: 'Factory Systems Support', description: 'Awaiting a consultant owner',
        startDate: daysFromToday(-350), expiryDate: daysFromToday(10), value: 51000,
        isActive: true, renewalStatus: 'not_contacted'
      }
    ]);

    const activities = [
      { itemType: 'license', itemId: licenses[1]._id, action: 'contacted', performedBy: agent._id,
        note: 'Renewal options sent to the client.', createdAt: daysFromToday(-8) },
      { itemType: 'license', itemId: licenses[1]._id, action: 'follow_up_scheduled', performedBy: agent._id,
        note: 'Follow-up is overdue and needs action.', createdAt: daysFromToday(-8) },
      { itemType: 'license', itemId: licenses[2]._id, action: 'contacted', performedBy: agent._id,
        note: 'Client confirmed receipt of the renewal proposal.', createdAt: daysFromToday(-2) },
      { itemType: 'license', itemId: licenses[4]._id, action: 'renewed', performedBy: agent._id,
        note: 'Renewed for twelve months.', createdAt: daysFromToday(-20) },
      { itemType: 'license', itemId: licenses[5]._id, action: 'declined', performedBy: agent._id,
        note: 'Loss reason recorded after client confirmation.', createdAt: daysFromToday(-12) },
      { itemType: 'contract', itemId: contracts[1]._id, action: 'contacted', performedBy: consultant._id,
        note: 'Renewal meeting completed.', createdAt: daysFromToday(-1) },
      { itemType: 'contract', itemId: contracts[2]._id, action: 'follow_up_scheduled', performedBy: consultant._id,
        note: 'Decision follow-up scheduled.', createdAt: daysFromToday(-2) },
      { itemType: 'contract', itemId: contracts[4]._id, action: 'renewed', performedBy: consultant._id,
        note: 'Renewed for another annual term.', createdAt: daysFromToday(-30) },
      { itemType: 'contract', itemId: contracts[5]._id, action: 'declined', performedBy: consultant._id,
        note: 'Loss reason recorded after final follow-up.', createdAt: daysFromToday(-9) }
    ];
    await RenewalActivity.insertMany(activities);

    console.log(`✅ Seeded ${await Client.countDocuments()} clients, ${licenses.length} licences, ${contracts.length} contracts`);
    console.log('   Coverage: expired, critical, urgent, upcoming, safe, overdue, contacted, waiting, renewed, declined, unassigned client');
    console.log('\nDemo credentials (password: password123)');
    console.log('   agent@advancia.com');
    console.log('   consultant@advancia.com');
    console.log('   admin@advancia.com');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

void seedDatabase();
