'use strict';

const request = require('supertest');
const app = require('../src/app');
const jwt = require('jsonwebtoken');
const { User, Role, UserRole } = require('../src/models');

jest.mock('../src/models', () => {
  return {
    User: {
      findByPk: jest.fn(),
      findAll: jest.fn(),
    },
    Role: {
      findOne: jest.fn(),
    },
    UserRole: {
      findOne: jest.fn(),
      create: jest.fn(),
      destroy: jest.fn(),
    },
    sequelize: {},
  };
});

describe('User Endpoints', () => {
  const secret = process.env.JWT_SECRET || 'default_secret';
  const adminToken = jwt.sign({ userId: 'admin-1', roles: ['ADMIN'] }, secret);
  const nonAdminToken = jwt.sign({ userId: 'user-1', roles: ['GRANTEE'] }, secret);

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock behavior for authenticate middleware loading the calling user
    User.findByPk.mockImplementation((id, options) => {
      // If we are looking for the token sender
      if (id === 'admin-1') {
        return Promise.resolve({
          id: 'admin-1',
          name: 'Admin User',
          email: 'admin@example.com',
          roles: [{ name: 'ADMIN' }],
        });
      }
      if (id === 'user-1') {
        return Promise.resolve({
          id: 'user-1',
          name: 'Grantee User',
          email: 'grantee@example.com',
          roles: [{ name: 'GRANTEE' }],
        });
      }
      return Promise.resolve(null);
    });
  });

  describe('GET /api/users', () => {
    it('should allow ADMIN to retrieve all users', async () => {
      const mockUsers = [
        { id: '1', name: 'User One', email: 'one@example.com' },
        { id: '2', name: 'User Two', email: 'two@example.com' },
      ];
      User.findAll.mockResolvedValue(mockUsers);

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(mockUsers);
      expect(User.findAll).toHaveBeenCalled();
    });

    it('should deny non-ADMIN users access to retrieve all users', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${nonAdminToken}`);

      expect(res.statusCode).toEqual(403);
    });

    it('should return 500 when database query fails', async () => {
      User.findAll.mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(500);
      expect(res.body).toHaveProperty('error', 'Server Error');
    });
  });

  describe('GET /api/users/:userId', () => {
    it('should return user details for valid ID', async () => {
      const mockUser = {
        id: 'user-2',
        name: 'Target User',
        email: 'target@example.com',
        roles: [],
      };

      // Mock implementation to return different user when target user ID is queried
      User.findByPk.mockImplementation((id, options) => {
        if (id === 'admin-1') {
          return Promise.resolve({ id: 'admin-1', roles: [{ name: 'ADMIN' }] });
        }
        if (id === 'user-2') {
          return Promise.resolve(mockUser);
        }
        return Promise.resolve(null);
      });

      const res = await request(app)
        .get('/api/users/user-2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(mockUser);
    });

    it('should return 404 if user is not found', async () => {
      User.findByPk.mockImplementation((id, options) => {
        if (id === 'admin-1') {
          return Promise.resolve({ id: 'admin-1', roles: [{ name: 'ADMIN' }] });
        }
        return Promise.resolve(null); // target user is null
      });

      const res = await request(app)
        .get('/api/users/non-existent')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('error', 'Not Found');
    });

    it('should return 500 if database fails', async () => {
      User.findByPk.mockImplementation((id, options) => {
        if (id === 'admin-1') {
          return Promise.resolve({ id: 'admin-1', roles: [{ name: 'ADMIN' }] });
        }
        return Promise.reject(new Error('Query failed'));
      });

      const res = await request(app)
        .get('/api/users/some-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(500);
    });
  });

  describe('POST /api/users/:userId/roles', () => {
    it('should assign a role successfully', async () => {
      const mockTargetUser = { id: 'user-2', name: 'User Two' };
      const mockUpdatedUser = {
        id: 'user-2',
        name: 'User Two',
        roles: [{ name: 'GRANTOR' }],
      };

      User.findByPk.mockImplementation((id, options) => {
        if (id === 'admin-1') {
          return Promise.resolve({ id: 'admin-1', roles: [{ name: 'ADMIN' }] });
        }
        if (id === 'user-2') {
          // If options includes roles, it's the second query for updated user
          if (options && options.include) {
            return Promise.resolve(mockUpdatedUser);
          }
          return Promise.resolve(mockTargetUser);
        }
        return Promise.resolve(null);
      });

      Role.findOne.mockResolvedValue({ id: 'role-grantor', name: 'GRANTOR' });
      UserRole.findOne.mockResolvedValue(null); // not already assigned
      UserRole.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/users/user-2/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roleName: 'GRANTOR' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toContain('GRANTOR');
      expect(res.body.user).toEqual(mockUpdatedUser);
    });

    it('should return 400 for validation errors (missing roleName)', async () => {
      const res = await request(app)
        .post('/api/users/user-2/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toEqual('Validation Error');
    });

    it('should return 400 for validation errors (invalid roleName)', async () => {
      const res = await request(app)
        .post('/api/users/user-2/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roleName: 'SUPERMAN' });

      expect(res.statusCode).toEqual(400);
    });

    it('should return 404 if target user does not exist', async () => {
      User.findByPk.mockImplementation((id, options) => {
        if (id === 'admin-1') {
          return Promise.resolve({ id: 'admin-1', roles: [{ name: 'ADMIN' }] });
        }
        return Promise.resolve(null); // target user doesn't exist
      });

      const res = await request(app)
        .post('/api/users/non-existent/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roleName: 'GRANTOR' });

      expect(res.statusCode).toEqual(404);
      expect(res.body.error).toEqual('Not Found');
    });

    it('should return 400 if role is not found in database', async () => {
      User.findByPk.mockImplementation((id, options) => {
        if (id === 'admin-1') {
          return Promise.resolve({ id: 'admin-1', roles: [{ name: 'ADMIN' }] });
        }
        return Promise.resolve({ id: 'user-2', name: 'User Two' });
      });

      Role.findOne.mockResolvedValue(null); // role not found in database (unexpected, but covered in service)

      const res = await request(app)
        .post('/api/users/user-2/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roleName: 'GRANTOR' });

      expect(res.statusCode).toEqual(400);
    });

    it('should return 409 if role is already assigned to the user', async () => {
      User.findByPk.mockImplementation((id, options) => {
        if (id === 'admin-1') {
          return Promise.resolve({ id: 'admin-1', roles: [{ name: 'ADMIN' }] });
        }
        return Promise.resolve({ id: 'user-2', name: 'User Two' });
      });

      Role.findOne.mockResolvedValue({ id: 'role-grantor', name: 'GRANTOR' });
      UserRole.findOne.mockResolvedValue({ user_id: 'user-2', role_id: 'role-grantor' }); // already exists

      const res = await request(app)
        .post('/api/users/user-2/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roleName: 'GRANTOR' });

      expect(res.statusCode).toEqual(409);
      expect(res.body.error).toEqual('Conflict');
    });
  });

  describe('DELETE /api/users/:userId/roles/:roleName', () => {
    it('should remove a role successfully', async () => {
      User.findByPk.mockImplementation((id, options) => {
        if (id === 'admin-1') {
          return Promise.resolve({ id: 'admin-1', roles: [{ name: 'ADMIN' }] });
        }
        return Promise.resolve({ id: 'user-2', name: 'User Two' });
      });

      Role.findOne.mockResolvedValue({ id: 'role-grantor', name: 'GRANTOR' });
      UserRole.destroy.mockResolvedValue(1); // 1 row deleted

      const res = await request(app)
        .delete('/api/users/user-2/roles/GRANTOR')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toContain('removed');
    });

    it('should return 404 if user not found for deletion', async () => {
      User.findByPk.mockImplementation((id, options) => {
        if (id === 'admin-1') {
          return Promise.resolve({ id: 'admin-1', roles: [{ name: 'ADMIN' }] });
        }
        return Promise.resolve(null); // target user null
      });

      const res = await request(app)
        .delete('/api/users/non-existent/roles/GRANTOR')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(404);
    });

    it('should return 400 if role is invalid', async () => {
      User.findByPk.mockImplementation((id, options) => {
        if (id === 'admin-1') {
          return Promise.resolve({ id: 'admin-1', roles: [{ name: 'ADMIN' }] });
        }
        return Promise.resolve({ id: 'user-2', name: 'User Two' });
      });

      Role.findOne.mockResolvedValue(null); // role not found

      const res = await request(app)
        .delete('/api/users/user-2/roles/INVALID_ROLE')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(400);
    });

    it('should return 404 if user does not possess that role', async () => {
      User.findByPk.mockImplementation((id, options) => {
        if (id === 'admin-1') {
          return Promise.resolve({ id: 'admin-1', roles: [{ name: 'ADMIN' }] });
        }
        return Promise.resolve({ id: 'user-2', name: 'User Two' });
      });

      Role.findOne.mockResolvedValue({ id: 'role-grantor', name: 'GRANTOR' });
      UserRole.destroy.mockResolvedValue(0); // 0 rows deleted (role wasn't assigned)

      const res = await request(app)
        .delete('/api/users/user-2/roles/GRANTOR')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toContain('does not have');
    });
  });
});
