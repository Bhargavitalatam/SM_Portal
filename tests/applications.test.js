'use strict';

const request = require('supertest');
const app = require('../src/app');
const jwt = require('jsonwebtoken');
const { User, Grant, Application } = require('../src/models');

jest.mock('../src/models', () => {
  return {
    User: {
      findByPk: jest.fn(),
    },
    Role: {},
    UserRole: {},
    Grant: {
      findByPk: jest.fn(),
    },
    Application: {
      create: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      findByPk: jest.fn(),
    },
    sequelize: {}
  };
});

describe('Applications Endpoints', () => {
  const secret = process.env.JWT_SECRET || 'default_secret';
  const granteeToken = jwt.sign({ userId: 'grantee-1', roles: ['GRANTEE'] }, secret);
  const otherGranteeToken = jwt.sign({ userId: 'grantee-2', roles: ['GRANTEE'] }, secret);
  const grantorToken = jwt.sign({ userId: 'grantor-1', roles: ['GRANTOR'] }, secret);
  const otherGrantorToken = jwt.sign({ userId: 'grantor-2', roles: ['GRANTOR'] }, secret);
  const adminToken = jwt.sign({ userId: 'admin-1', roles: ['ADMIN'] }, secret);

  beforeEach(() => {
    jest.clearAllMocks();
    User.findByPk.mockImplementation((id) => {
      if (id === 'grantee-1') return Promise.resolve({ id: 'grantee-1', roles: [{ name: 'GRANTEE' }] });
      if (id === 'grantee-2') return Promise.resolve({ id: 'grantee-2', roles: [{ name: 'GRANTEE' }] });
      if (id === 'grantor-1') return Promise.resolve({ id: 'grantor-1', roles: [{ name: 'GRANTOR' }] });
      if (id === 'grantor-2') return Promise.resolve({ id: 'grantor-2', roles: [{ name: 'GRANTOR' }] });
      if (id === 'admin-1') return Promise.resolve({ id: 'admin-1', roles: [{ name: 'ADMIN' }] });
      return Promise.resolve(null);
    });
  });

  describe('POST /api/grants/:id/apply', () => {
    it('should allow GRANTEE to apply for grant successfully', async () => {
      Grant.findByPk.mockResolvedValue({ id: 'g1', title: 'Grant 1' });
      Application.findOne.mockResolvedValue(null);
      Application.create.mockResolvedValue({
        id: 'app-1',
        grant_id: 'g1',
        grantee_id: 'grantee-1',
        proposal: 'Great project proposal',
        status: 'submitted'
      });

      const res = await request(app)
        .post('/api/grants/g1/apply')
        .set('Authorization', `Bearer ${granteeToken}`)
        .send({ proposal: 'Great project proposal' });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id', 'app-1');
      expect(Application.create).toHaveBeenCalledWith({
        grant_id: 'g1',
        grantee_id: 'grantee-1',
        proposal: 'Great project proposal',
        status: 'submitted'
      });
    });

    it('should return 400 validation error if proposal is empty', async () => {
      const res = await request(app)
        .post('/api/grants/g1/apply')
        .set('Authorization', `Bearer ${granteeToken}`)
        .send({ proposal: '   ' });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Validation Error');
    });

    it('should return 404 if grant is not found', async () => {
      Grant.findByPk.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/grants/non-existent/apply')
        .set('Authorization', `Bearer ${granteeToken}`)
        .send({ proposal: 'Some proposal' });

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('error', 'Not Found');
    });

    it('should return 409 conflict if user already applied to this grant', async () => {
      Grant.findByPk.mockResolvedValue({ id: 'g1', title: 'Grant 1' });
      Application.findOne.mockResolvedValue({ id: 'existing-app' });

      const res = await request(app)
        .post('/api/grants/g1/apply')
        .set('Authorization', `Bearer ${granteeToken}`)
        .send({ proposal: 'Duplicate proposal' });

      expect(res.statusCode).toEqual(409);
      expect(res.body).toHaveProperty('error', 'Conflict');
    });
  });

  describe('GET /api/grants/:id/applications', () => {
    it('should allow owning GRANTOR to list applications', async () => {
      Grant.findByPk.mockResolvedValue({ id: 'g1', grantor_id: 'grantor-1' });
      Application.findAll.mockResolvedValue([{ id: 'app-1', proposal: 'Prop 1' }]);

      const res = await request(app)
        .get('/api/grants/g1/applications')
        .set('Authorization', `Bearer ${grantorToken}`);

      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBeTruthy();
      expect(res.body.length).toEqual(1);
    });

    it('should allow ADMIN to list applications for any grant', async () => {
      Grant.findByPk.mockResolvedValue({ id: 'g1', grantor_id: 'grantor-1' });
      Application.findAll.mockResolvedValue([{ id: 'app-1', proposal: 'Prop 1' }]);

      const res = await request(app)
        .get('/api/grants/g1/applications')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
    });

    it('should forbid non-owning GRANTOR from listing applications', async () => {
      Grant.findByPk.mockResolvedValue({ id: 'g1', grantor_id: 'grantor-1' });

      const res = await request(app)
        .get('/api/grants/g1/applications')
        .set('Authorization', `Bearer ${otherGrantorToken}`);

      expect(res.statusCode).toEqual(403);
    });

    it('should return 404 if grant is not found', async () => {
      Grant.findByPk.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/grants/non-existent/applications')
        .set('Authorization', `Bearer ${grantorToken}`);

      expect(res.statusCode).toEqual(404);
    });
  });

  describe('GET /api/applications/:appId', () => {
    it('should allow grantee owner to view application', async () => {
      const mockApp = {
        id: 'app-1',
        grantee_id: 'grantee-1',
        grant: { grantor_id: 'grantor-1' }
      };
      Application.findByPk.mockResolvedValue(mockApp);

      const res = await request(app)
        .get('/api/applications/app-1')
        .set('Authorization', `Bearer ${granteeToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(mockApp);
    });

    it('should allow grantor owner to view application', async () => {
      const mockApp = {
        id: 'app-1',
        grantee_id: 'grantee-1',
        grant: { grantor_id: 'grantor-1' }
      };
      Application.findByPk.mockResolvedValue(mockApp);

      const res = await request(app)
        .get('/api/applications/app-1')
        .set('Authorization', `Bearer ${grantorToken}`);

      expect(res.statusCode).toEqual(200);
    });

    it('should allow ADMIN to view application', async () => {
      const mockApp = {
        id: 'app-1',
        grantee_id: 'grantee-1',
        grant: { grantor_id: 'grantor-1' }
      };
      Application.findByPk.mockResolvedValue(mockApp);

      const res = await request(app)
        .get('/api/applications/app-1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
    });

    it('should forbid other grantee from viewing application', async () => {
      const mockApp = {
        id: 'app-1',
        grantee_id: 'grantee-1',
        grant: { grantor_id: 'grantor-1' }
      };
      Application.findByPk.mockResolvedValue(mockApp);

      const res = await request(app)
        .get('/api/applications/app-1')
        .set('Authorization', `Bearer ${otherGranteeToken}`);

      expect(res.statusCode).toEqual(403);
    });

    it('should return 404 if application is not found', async () => {
      Application.findByPk.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/applications/non-existent')
        .set('Authorization', `Bearer ${granteeToken}`);

      expect(res.statusCode).toEqual(404);
    });
  });

  describe('PATCH /api/applications/:appId/status', () => {
    it('should allow grantor owner to update application status', async () => {
      const mockApp = {
        id: 'app-1',
        status: 'submitted',
        grant: { grantor_id: 'grantor-1' },
        save: jest.fn().mockResolvedValue(true)
      };
      Application.findByPk.mockResolvedValue(mockApp);

      const res = await request(app)
        .patch('/api/applications/app-1/status')
        .set('Authorization', `Bearer ${grantorToken}`)
        .send({ status: 'approved' });

      expect(res.statusCode).toEqual(200);
      expect(mockApp.status).toEqual('approved');
      expect(mockApp.save).toHaveBeenCalled();
    });

    it('should allow ADMIN to update application status', async () => {
      const mockApp = {
        id: 'app-1',
        status: 'submitted',
        grant: { grantor_id: 'grantor-1' },
        save: jest.fn().mockResolvedValue(true)
      };
      Application.findByPk.mockResolvedValue(mockApp);

      const res = await request(app)
        .patch('/api/applications/app-1/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'rejected' });

      expect(res.statusCode).toEqual(200);
      expect(mockApp.status).toEqual('rejected');
    });

    it('should return 400 validation error for invalid status value', async () => {
      const res = await request(app)
        .patch('/api/applications/app-1/status')
        .set('Authorization', `Bearer ${grantorToken}`)
        .send({ status: 'COMPLETED_AWESOME' });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Validation Error');
    });

    it('should forbid other users from updating application status', async () => {
      const mockApp = {
        id: 'app-1',
        status: 'submitted',
        grant: { grantor_id: 'grantor-1' }
      };
      Application.findByPk.mockResolvedValue(mockApp);

      const res = await request(app)
        .patch('/api/applications/app-1/status')
        .set('Authorization', `Bearer ${otherGrantorToken}`)
        .send({ status: 'under_review' });

      expect(res.statusCode).toEqual(403);
    });

    it('should return 404 if application is not found', async () => {
      Application.findByPk.mockResolvedValue(null);

      const res = await request(app)
        .patch('/api/applications/non-existent/status')
        .set('Authorization', `Bearer ${grantorToken}`)
        .send({ status: 'approved' });

      expect(res.statusCode).toEqual(404);
    });
  });
});
