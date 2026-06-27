'use strict';

const request = require('supertest');
const app = require('../src/app');
const jwt = require('jsonwebtoken');
const { User, Role } = require('../src/models');

jest.mock('../src/models', () => {
  return {
    User: {
      findByPk: jest.fn(),
    },
    Role: {},
    UserRole: {},
    Grant: {
      findAll: jest.fn(),
      create: jest.fn(),
    },
    Application: {},
    sequelize: {}
  };
});

describe('RBAC Middleware & Protected Routes', () => {
  const secret = process.env.JWT_SECRET || 'default_secret';

  const granteeToken = jwt.sign({ userId: 'grantee-id', roles: ['GRANTEE'] }, secret);
  const grantorToken = jwt.sign({ userId: 'grantor-id', roles: ['GRANTOR'] }, secret);
  const adminToken = jwt.sign({ userId: 'admin-id', roles: ['ADMIN'] }, secret);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 Unauthorized if no token is provided', async () => {
    const res = await request(app).get('/api/grants');
    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('error', 'Unauthorized');
  });

  it('should return 401 Unauthorized if token is invalid', async () => {
    const res = await request(app)
      .get('/api/grants')
      .set('Authorization', 'Bearer invalid_token_string');
    expect(res.statusCode).toEqual(401);
  });

  it('should return 403 Forbidden when GRANTEE attempts GRANTOR action', async () => {
    User.findByPk.mockResolvedValue({
      id: 'grantee-id',
      roles: [{ name: 'GRANTEE' }]
    });

    const res = await request(app)
      .post('/api/grants')
      .set('Authorization', `Bearer ${granteeToken}`)
      .send({
        title: 'Tech Innovation Grant',
        amount: 50000,
        description: 'Funding for open source projects'
      });

    expect(res.statusCode).toEqual(403);
    expect(res.body).toHaveProperty('error', 'Forbidden');
  });

  it('should allow GRANTOR to access POST /api/grants endpoint', async () => {
    User.findByPk.mockResolvedValue({
      id: 'grantor-id',
      roles: [{ name: 'GRANTOR' }]
    });

    const { Grant } = require('../src/models');
    Grant.create.mockResolvedValue({
      id: 'grant-1',
      title: 'Tech Innovation Grant',
      amount: 50000,
      grantor_id: 'grantor-id'
    });

    const res = await request(app)
      .post('/api/grants')
      .set('Authorization', `Bearer ${grantorToken}`)
      .send({
        title: 'Tech Innovation Grant',
        amount: 50000,
        description: 'Funding for open source projects'
      });

    expect(res.statusCode).toEqual(201);
  });
});
