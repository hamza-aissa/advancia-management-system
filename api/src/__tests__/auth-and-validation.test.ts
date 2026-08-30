import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { app } from '../app';
import { User } from '../models/User';
import { UserRole } from '../types';
import { config } from '../config';

const databaseUser = (role: UserRole) => ({
  _id: new Types.ObjectId(),
  email: `${role}@advancia.test`,
  password: bcrypt.hashSync('password123', 4),
  firstName: 'Demo',
  lastName: 'User',
  role
});

describe('authentication boundary and validation', () => {
  afterEach(() => vi.restoreAllMocks());

  it('preserves the unauthenticated health endpoint', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ok');
  });

  it('does not expose public registration', async () => {
    const response = await request(app).post('/api/auth/register').send({});
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('returns stable field-level login validation errors', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: 'bad', password: '' });
    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        fields: { email: expect.any(Array), password: expect.any(Array) }
      }
    });
  });

  it('allows an interactive role to log in and normalizes the response', async () => {
    const user = databaseUser(UserRole.AGENT);
    vi.spyOn(User, 'findOne').mockResolvedValue(user as never);
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email.toUpperCase(), password: 'password123' });
    expect(response.status).toBe(200);
    expect(response.body.data.user).toMatchObject({ email: user.email, role: UserRole.AGENT });
    expect(response.body.data.token).toEqual(expect.any(String));
  });

  it('refuses login for a deactivated collaborator', async () => {
    const user = { ...databaseUser(UserRole.AGENT), active: false };
    vi.spyOn(User, 'findOne').mockResolvedValue(null);
    const response = await request(app).post('/api/auth/login').send({ email: user.email, password: 'password123' });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('lets an Admin create an Agent account through the protected endpoint', async () => {
    const admin = databaseUser(UserRole.ADMIN);
    vi.spyOn(User, 'findById').mockReturnValue({ select: vi.fn().mockResolvedValue(admin) } as never);
    vi.spyOn(User, 'create').mockResolvedValue({
      _id: new Types.ObjectId(), firstName: 'Nouveau', lastName: 'Agent', email: 'nouveau@advancia.test', role: UserRole.AGENT, active: true
    } as never);
    const token = jwt.sign({ id: admin._id.toString(), email: admin.email, role: admin.role }, config.jwtSecret);
    const response = await request(app).post('/api/users').set('Authorization', `Bearer ${token}`).send({
      firstName: 'Nouveau', lastName: 'Agent', email: 'nouveau@advancia.test', password: 'password123', role: UserRole.AGENT
    });
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ email: 'nouveau@advancia.test', role: UserRole.AGENT, active: true });
  });

  it('does not represent executive notification recipients as application accounts', async () => {
    vi.spyOn(User, 'findOne').mockResolvedValue(null);
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'executive@advancia.test', password: 'password123' });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('lets agents reach validated client creation with server-owned assignment', async () => {
    const user = databaseUser(UserRole.AGENT);
    const select = vi.fn().mockResolvedValue(user);
    vi.spyOn(User, 'findById').mockReturnValue({ select } as never);
    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, role: user.role },
      config.jwtSecret
    );
    const response = await request(app)
      .post('/api/clients')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
