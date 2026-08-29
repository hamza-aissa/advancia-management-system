import { describe, expect, it } from 'vitest';
import { buildClientScope } from '../controllers/clientController';
import { UserRole } from '../types';
import { createClientSchema } from '../routes/clients';

describe('client access scoping', () => {
  it('scopes an agent to assignedAgent', () => {
    expect(buildClientScope({ id: 'agent-id', email: 'a@test.dev', role: UserRole.AGENT }))
      .toEqual({ assignedAgent: 'agent-id' });
  });

  it('scopes a consultant to assignedConsultant', () => {
    expect(buildClientScope({ id: 'consultant-id', email: 'c@test.dev', role: UserRole.CONSULTANT }))
      .toEqual({ assignedConsultant: 'consultant-id' });
  });

  it('allows admins to query across assignments', () => {
    expect(buildClientScope({ id: 'admin-id', email: 'admin@test.dev', role: UserRole.ADMIN }))
      .toEqual({});
  });

  it('requires valid role assignments when creating a client', () => {
    const result = createClientSchema.safeParse({
      name: 'Example Client',
      email: 'client@example.com',
      assignedAgent: 'not-an-id',
      assignedConsultant: 'also-not-an-id'
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors).toMatchObject({
        assignedAgent: expect.any(Array),
        assignedConsultant: expect.any(Array)
      });
    }
  });
});
