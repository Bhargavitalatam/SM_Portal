'use strict';

const request = require('supertest');
const app = require('../src/app');
const jwt = require('jsonwebtoken');
const { User, Grant } = require('../src/models');

jest.mock('../src/models', () => {
  return {
    User: {
      findByPk: jest.fn(),
    },
    Role: {},
    UserRole: {},
    Grant: {
      findAll: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
    },
    Application: {},
    sequelize: {}
  };
});

describe('Grant Endpoints', () => {
  const secret = process.env.JWT_SECRET || 'default_secret';
  const grantorToken = jwt.sign({ userId: 'grantor-1', roles: ['GRANTOR'] }, secret);
  const otherGrantorToken = jwt.sign({ userId: 'grantor-2', roles: ['GRANTOR'] }, secret);
  const adminToken = jwt.sign({ userId: 'admin-1', roles: ['ADMIN'] }, secret);
  const granteeToken = jwt.sign({ userId: 'grantee-1', roles: ['GRANTEE'] }, secret);

  beforeEach(() => {
    jest.clearAllMocks();
    User.findByPk.mockImplementation((id) => {
      if (id === 'grantor-1') return Promise.resolve({ id: 'grantor-1', roles: [{ name: 'GRANTOR' }] });
      if (id === 'grantor-2') return Promise.resolve({ id: 'grantor-2', roles: [{ name: 'GRANTOR' }] });
      if (id === 'admin-1') return Promise.resolve({ id: 'admin-1', roles: [{ name: 'ADMIN' }] });
      if (id === 'grantee-1') return Promise.resolve({ id: 'grantee-1', roles: [{ name: 'GRANTEE' }] });
      return Promise.resolve(null);
    });
  });

  describe('POST /api/grants', () => {
    it('should allow GRANTOR to create a new grant', async () => {
      const mockGrant = {
        id: 'g1',
        title: 'Tech Grant',
        description: 'Tech development funding',
        amount: 15000,
        grantor_id: 'grantor-1'
      };
      Grant.create.mockResolvedValue(mockGrant);

      const res = await request(app)
        .post('/api/grants')
        .set('Authorization', `Bearer ${grantorToken}`)
        .send({
          title: 'Tech Grant',
          description: 'Tech development funding',
          amount: 15000
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toEqual(mockGrant);
      expect(Grant.create).toHaveBeenCalledWith({
        title: 'Tech Grant',
        description: 'Tech development funding',
        amount: 15000,
        grantor_id: 'grantor-1'
      });
    });

    it('should return 400 validation error for invalid grant amount', async () => {
      const res = await request(app)
        .post('/api/grants')
        .set('Authorization', `Bearer ${grantorToken}`)
        .send({
          title: 'Invalid Grant',
          amount: -100
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Validation Error');
    });

    it('should return 400 validation error for missing title', async () => {
      const res = await request(app)
        .post('/api/grants')
        .set('Authorization', `Bearer ${grantorToken}`)
        .send({
          amount: 1000
        });

      expect(res.statusCode).toEqual(400);
    });
  });

  describe('GET /api/grants', () => {
    it('should return all grants for authenticated user', async () => {
      Grant.findAll.mockResolvedValue([
        { id: 'g1', title: 'Grant 1', amount: 1000 },
        { id: 'g2', title: 'Grant 2', amount: 2000 },
      ]);

      const res = await request(app)
        .get('/api/grants')
        .set('Authorization', `Bearer ${granteeToken}`);

      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBeTruthy();
      expect(res.body.length).toEqual(2);
    });
  });

  describe('GET /api/grants/:id', () => {
    it('should return grant details for a valid ID', async () => {
      const mockGrant = { id: 'g1', title: 'Grant 1', amount: 1000 };
      Grant.findByPk.mockResolvedValue(mockGrant);

      const res = await request(app)
        .get('/api/grants/g1')
        .set('Authorization', `Bearer ${granteeToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(mockGrant);
    });

    it('should return 404 if grant is not found', async () => {
      Grant.findByPk.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/grants/non-existent')
        .set('Authorization', `Bearer ${granteeToken}`);

      expect(res.statusCode).toEqual(404);
    });
  });

  describe('PUT /api/grants/:id', () => {
    it('should allow owner GRANTOR to update grant', async () => {
      const mockGrant = {
        id: 'g1',
        title: 'Old Title',
        grantor_id: 'grantor-1',
        save: jest.fn().mockResolvedValue(true)
      };

      Grant.findByPk.mockResolvedValue(mockGrant);

      const res = await request(app)
        .put('/api/grants/g1')
        .set('Authorization', `Bearer ${grantorToken}`)
        .send({ title: 'New Title' });

      expect(res.statusCode).toEqual(200);
      expect(mockGrant.title).toEqual('New Title');
      expect(mockGrant.save).toHaveBeenCalled();
    });

    it('should allow ADMIN to update any grant', async () => {
      const mockGrant = {
        id: 'g1',
        title: 'Old Title',
        grantor_id: 'grantor-1',
        save: jest.fn().mockResolvedValue(true)
      };

      Grant.findByPk.mockResolvedValue(mockGrant);

      const res = await request(app)
        .put('/api/grants/g1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Admin Updated Title' });

      expect(res.statusCode).toEqual(200);
      expect(mockGrant.title).toEqual('Admin Updated Title');
    });

    it('should forbid non-owner GRANTOR from updating grant', async () => {
      const mockGrant = {
        id: 'g1',
        title: 'Old Title',
        grantor_id: 'grantor-1',
      };

      Grant.findByPk.mockResolvedValue(mockGrant);

      const res = await request(app)
        .put('/api/grants/g1')
        .set('Authorization', `Bearer ${otherGrantorToken}`)
        .send({ title: 'Hacked Title' });

      expect(res.statusCode).toEqual(403);
    });

    it('should return 404 if updating non-existent grant', async () => {
      Grant.findByPk.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/grants/non-existent')
        .set('Authorization', `Bearer ${grantorToken}`)
        .send({ title: 'New Title' });

      expect(res.statusCode).toEqual(404);
    });
  });

  describe('DELETE /api/grants/:id', () => {
    it('should allow owner GRANTOR to delete grant', async () => {
      const mockGrant = {
        id: 'g1',
        grantor_id: 'grantor-1',
        destroy: jest.fn().mockResolvedValue(true)
      };
      Grant.findByPk.mockResolvedValue(mockGrant);

      const res = await request(app)
        .delete('/api/grants/g1')
        .set('Authorization', `Bearer ${grantorToken}`);

      expect(res.statusCode).toEqual(200);
      expect(mockGrant.destroy).toHaveBeenCalled();
    });

    it('should allow ADMIN to delete any grant', async () => {
      const mockGrant = {
        id: 'g1',
        grantor_id: 'grantor-1',
        destroy: jest.fn().mockResolvedValue(true)
      };
      Grant.findByPk.mockResolvedValue(mockGrant);

      const res = await request(app)
        .delete('/api/grants/g1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(mockGrant.destroy).toHaveBeenCalled();
    });

    it('should forbid non-owner GRANTOR from deleting grant', async () => {
      const mockGrant = {
        id: 'g1',
        grantor_id: 'grantor-1',
        destroy: jest.fn()
      };
      Grant.findByPk.mockResolvedValue(mockGrant);

      const res = await request(app)
        .delete('/api/grants/g1')
        .set('Authorization', `Bearer ${otherGrantorToken}`);

      expect(res.statusCode).toEqual(403);
      expect(mockGrant.destroy).not.toHaveBeenCalled();
    });

    it('should return 404 if deleting non-existent grant', async () => {
      Grant.findByPk.mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/grants/non-existent')
        .set('Authorization', `Bearer ${grantorToken}`);

      expect(res.statusCode).toEqual(404);
    });
  });
});
