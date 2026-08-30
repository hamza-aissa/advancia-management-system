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
import { LicenseOffer } from '../models/LicenseOffer';
import { ContractType } from '../models/ContractType';

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
    await Promise.all([LicenseOffer.deleteMany({}), ContractType.deleteMany({})]);
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
        status: ClientStatus.AT_RISK, notes: 'Compte prioritaire pour le renouvellement.', lastContactAt: daysFromToday(-4)
      },
      {
        name: 'Carthage Industries', email: 'admin@carthage-demo.tn', phone: '+216 71 200 220',
        address: 'Ben Arous, Tunis', assignedAgent: agent._id, assignedConsultant: consultant._id,
        status: ClientStatus.AT_RISK, notes: 'Validation du service achats encore en attente.', lastContactAt: daysFromToday(-8)
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
        status: ClientStatus.INACTIVE, notes: 'Renouvellement refusé après révision du budget.', lastContactAt: daysFromToday(-12)
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
        notes: 'Nouveau compte en attente d’affectation par un administrateur.'
      }
    ]);

    const offers = await LicenseOffer.create([
      { name: 'Microsoft 365 Business', description: 'Abonnement bureautique par utilisateur', unitPrice: 360 },
      { name: 'Protection des terminaux', description: 'Protection administrée par terminal', unitPrice: 122.5 },
      { name: 'Licences caisse et point de vente', description: 'Licence annuelle par point de vente', unitPrice: 666.667 },
      { name: 'Suivi de flotte', description: 'Accès annuel par véhicule', unitPrice: 744 },
      { name: 'Outils de développement cloud', description: 'Abonnement annuel par développeur', unitPrice: 600 },
      { name: 'Plateforme collaborative', description: 'Espace collaboratif par utilisateur', unitPrice: 270 },
      { name: 'Suite de conception industrielle', description: 'Licence annuelle par poste', unitPrice: 1500 }
    ]);
    const contractTypes = await ContractType.create([
      { name: 'Support infrastructure', description: 'Contrat annuel de support infrastructure' },
      { name: 'Maintenance ERP', description: 'Maintenance corrective et préventive' },
      { name: 'Support systèmes de vente', description: 'Support des systèmes des points de vente' },
      { name: 'Conseil technologique', description: 'Accompagnement et conseil technologique' },
      { name: 'Exploitation cloud', description: 'Exploitation et optimisation des coûts cloud' },
      { name: 'Services managés', description: 'Prise en charge des opérations techniques' },
      { name: 'Support systèmes industriels', description: 'Support des systèmes de production' }
    ]);

    const licenses = await License.create([
      {
        client: atlas._id, offer: offers[0]._id, name: offers[0].name, description: '45 utilisateurs',
        startDate: daysFromToday(-370), expiryDate: daysFromToday(-5), value: 16200, quantity: 45,
        assignedBy: agent._id, isActive: true, renewalStatus: 'not_contacted'
      },
      {
        client: carthage._id, offer: offers[1]._id, name: offers[1].name, description: offers[1].description,
        startDate: daysFromToday(-360), expiryDate: daysFromToday(4), value: 9800, quantity: 80,
        assignedBy: agent._id, isActive: true, renewalStatus: 'waiting',
        nextFollowUpAt: daysFromToday(-2), lastActionAt: daysFromToday(-8)
      },
      {
        client: medina._id, offer: offers[2]._id, name: offers[2].name, description: 'Licences pour 12 magasins',
        startDate: daysFromToday(-355), expiryDate: daysFromToday(8), value: 24000, quantity: 36,
        assignedBy: agent._id, isActive: true, renewalStatus: 'contacted', lastActionAt: daysFromToday(-2)
      },
      {
        client: horizon._id, offer: offers[3]._id, name: offers[3].name, description: offers[3].description,
        startDate: daysFromToday(-350), expiryDate: daysFromToday(13), value: 18600, quantity: 25,
        assignedBy: agent._id, isActive: true, renewalStatus: 'not_contacted'
      },
      {
        client: olive._id, offer: offers[4]._id, name: offers[4].name, description: offers[4].description,
        startDate: daysFromToday(-20), expiryDate: daysFromToday(345), value: 7200, quantity: 12,
        assignedBy: agent._id, isActive: true, renewalStatus: 'renewed', lastActionAt: daysFromToday(-20),
        renewalHistory: [{ previousStartDate: daysFromToday(-386), previousExpiryDate: daysFromToday(-21),
          newStartDate: daysFromToday(-20), newExpiryDate: daysFromToday(345),
          renewedAt: daysFromToday(-20), renewedBy: agent._id, value: 7200 }]
      },
      {
        client: nexus._id, offer: offers[5]._id, name: offers[5].name, description: offers[5].description,
        startDate: daysFromToday(-365), expiryDate: daysFromToday(-12), value: 5400, quantity: 20,
        assignedBy: agent._id, isActive: false, renewalStatus: 'declined', lastActionAt: daysFromToday(-12),
        declineReason: 'Le client a regroupé ses outils collaboratifs avec ceux de sa société mère.'
      },
      {
        client: unassigned._id, offer: offers[6]._id, name: offers[6].name, description: offers[6].description,
        startDate: daysFromToday(-350), expiryDate: daysFromToday(6), value: 12000, quantity: 8,
        isActive: true, renewalStatus: 'not_contacted'
      }
    ]);

    const contracts = await Contract.create([
      {
        client: atlas._id, contractType: contractTypes[0]._id, title: contractTypes[0].name, description: contractTypes[0].description,
        startDate: daysFromToday(-370), expiryDate: daysFromToday(-3), value: 48000,
        services: [{ name: 'Support infrastructure annuel', quantity: 1, unitPrice: 48000 }],
        managedBy: consultant._id, isActive: true, renewalStatus: 'not_contacted'
      },
      {
        client: carthage._id, contractType: contractTypes[1]._id, title: contractTypes[1].name, description: contractTypes[1].description,
        startDate: daysFromToday(-360), expiryDate: daysFromToday(6), value: 72000,
        services: [{ name: 'Maintenance ERP annuelle', quantity: 1, unitPrice: 72000 }],
        managedBy: consultant._id, isActive: true, renewalStatus: 'contacted', lastActionAt: daysFromToday(-1)
      },
      {
        client: medina._id, contractType: contractTypes[2]._id, title: contractTypes[2].name, description: contractTypes[2].description,
        startDate: daysFromToday(-355), expiryDate: daysFromToday(10), value: 58000,
        services: [{ name: 'Support de 12 points de vente', quantity: 1, unitPrice: 58000 }],
        managedBy: consultant._id, isActive: true, renewalStatus: 'waiting',
        nextFollowUpAt: daysFromToday(2), lastActionAt: daysFromToday(-2)
      },
      {
        client: bluewave._id, contractType: contractTypes[3]._id, title: contractTypes[3].name, description: contractTypes[3].description,
        startDate: daysFromToday(-350), expiryDate: daysFromToday(15), value: 36000,
        services: [{ name: 'Conseil technologique annuel', quantity: 1, unitPrice: 36000 }],
        managedBy: consultant._id, isActive: true, renewalStatus: 'not_contacted'
      },
      {
        client: olive._id, contractType: contractTypes[4]._id, title: contractTypes[4].name, description: contractTypes[4].description,
        startDate: daysFromToday(-30), expiryDate: daysFromToday(335), value: 64000,
        services: [{ name: 'Exploitation cloud annuelle', quantity: 1, unitPrice: 64000 }],
        managedBy: consultant._id, isActive: true, renewalStatus: 'renewed', lastActionAt: daysFromToday(-30),
        renewalHistory: [{ previousStartDate: daysFromToday(-396), previousExpiryDate: daysFromToday(-31),
          newStartDate: daysFromToday(-30), newExpiryDate: daysFromToday(335),
          renewedAt: daysFromToday(-30), renewedBy: consultant._id, value: 64000 }]
      },
      {
        client: nexus._id, contractType: contractTypes[5]._id, title: contractTypes[5].name, description: contractTypes[5].description,
        startDate: daysFromToday(-365), expiryDate: daysFromToday(-9), value: 42000,
        services: [{ name: 'Services managés annuels', quantity: 1, unitPrice: 42000 }],
        managedBy: consultant._id, isActive: false, renewalStatus: 'declined', lastActionAt: daysFromToday(-9),
        declineReason: 'Le client a internalisé le service.'
      },
      {
        client: unassigned._id, contractType: contractTypes[6]._id, title: contractTypes[6].name, description: contractTypes[6].description,
        startDate: daysFromToday(-350), expiryDate: daysFromToday(10), value: 51000,
        services: [{ name: 'Support des systèmes industriels', quantity: 1, unitPrice: 51000 }],
        isActive: true, renewalStatus: 'not_contacted'
      }
    ]);

    const activities = [
      { itemType: 'license', itemId: licenses[1]._id, action: 'contacted', performedBy: agent._id,
        note: 'Options de renouvellement envoyées au client.', createdAt: daysFromToday(-8) },
      { itemType: 'license', itemId: licenses[1]._id, action: 'follow_up_scheduled', performedBy: agent._id,
        note: 'La relance est en retard et nécessite une action.', createdAt: daysFromToday(-8) },
      { itemType: 'license', itemId: licenses[2]._id, action: 'contacted', performedBy: agent._id,
        note: 'Le client a confirmé la réception de la proposition de renouvellement.', createdAt: daysFromToday(-2) },
      { itemType: 'license', itemId: licenses[4]._id, action: 'renewed', performedBy: agent._id,
        note: 'Renouvelé pour douze mois.', createdAt: daysFromToday(-20) },
      { itemType: 'license', itemId: licenses[5]._id, action: 'declined', performedBy: agent._id,
        note: 'Motif de perte enregistré après confirmation du client.', createdAt: daysFromToday(-12) },
      { itemType: 'contract', itemId: contracts[1]._id, action: 'contacted', performedBy: consultant._id,
        note: 'Réunion de renouvellement terminée.', createdAt: daysFromToday(-1) },
      { itemType: 'contract', itemId: contracts[2]._id, action: 'follow_up_scheduled', performedBy: consultant._id,
        note: 'Relance pour décision planifiée.', createdAt: daysFromToday(-2) },
      { itemType: 'contract', itemId: contracts[4]._id, action: 'renewed', performedBy: consultant._id,
        note: 'Renouvelé pour une nouvelle période annuelle.', createdAt: daysFromToday(-30) },
      { itemType: 'contract', itemId: contracts[5]._id, action: 'declined', performedBy: consultant._id,
        note: 'Motif de perte enregistré après la dernière relance.', createdAt: daysFromToday(-9) }
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
