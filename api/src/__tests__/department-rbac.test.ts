import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { app } from '../app';
import { config } from '../config';
import { User } from '../models/User';
import { UserRole } from '../types';
import { redactClientForRole } from '../controllers/clientController';
import { License } from '../models/License';

const authenticated = (role: UserRole) => {
  const user = { _id: new Types.ObjectId(), email: `${role}@advancia.test`, role };
  vi.spyOn(User, 'findById').mockReturnValue({ select: vi.fn().mockResolvedValue(user) } as never);
  return jwt.sign({ id: String(user._id), email: user.email, role }, config.jwtSecret);
};

describe('séparation stricte des départements', () => {
  afterEach(() => vi.restoreAllMocks());

  it('interdit toutes les routes contrats à un agent', async () => {
    const response = await request(app)
      .get(`/api/contracts/${new Types.ObjectId()}`)
      .set('Authorization', `Bearer ${authenticated(UserRole.AGENT)}`);
    expect(response.status).toBe(403);
    expect(response.body.error).toMatchObject({ code: 'FORBIDDEN', message: 'Accès interdit pour votre département' });
  });

  it('interdit toutes les routes licences à un consultant', async () => {
    const response = await request(app)
      .get(`/api/licenses/${new Types.ObjectId()}`)
      .set('Authorization', `Bearer ${authenticated(UserRole.CONSULTANT)}`);
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('autorise un Agent à demander l’archivage de sa propre licence', async () => {
    vi.spyOn(License, 'findById').mockResolvedValue(null);
    const response = await request(app)
      .delete(`/api/licenses/${new Types.ObjectId()}`)
      .set('Authorization', `Bearer ${authenticated(UserRole.AGENT)}`);
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('LICENSE_NOT_FOUND');
  });

  it('réserve la gestion des catalogues à l’administrateur', async () => {
    const response = await request(app)
      .post('/api/catalog/license-offers')
      .set('Authorization', `Bearer ${authenticated(UserRole.AGENT)}`)
      .send({ name: 'Offre', unitPrice: 100 });
    expect(response.status).toBe(403);
  });

  it("réserve l'état du cron et son déclenchement à l'administrateur", async () => {
    const response = await request(app)
      .get('/api/notifications/status')
      .set('Authorization', `Bearer ${authenticated(UserRole.AGENT)}`);
    expect(response.status).toBe(403);
  });

  it("retire l'affectation de l'autre département des fiches client", () => {
    const raw = { id: 'client-1', assignedAgent: { email: 'agent@test' }, assignedConsultant: { email: 'consultant@test' } };
    expect(redactClientForRole(raw, UserRole.AGENT)).not.toHaveProperty('assignedConsultant');
    expect(redactClientForRole(raw, UserRole.CONSULTANT)).not.toHaveProperty('assignedAgent');
    expect(redactClientForRole(raw, UserRole.ADMIN)).toEqual(raw);
  });
});
