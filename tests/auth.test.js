'use strict';

let registeredDeserializer = null;
let registeredStrategyVerify = null;

// Mock passport and passport-github2 BEFORE requiring the app or config
jest.mock('passport', () => {
  return {
    initialize: jest.fn(() => (req, res, next) => next()),
    use: jest.fn(),
    serializeUser: jest.fn(),
    deserializeUser: jest.fn((fn) => {
      registeredDeserializer = fn;
    }),
    authenticate: jest.fn((strategy, options, callback) => {
      if (typeof callback === 'function') {
        return (req, res) => {
          if (global.mockOAuthSuccess) {
            callback(null, global.mockOAuthUser);
          } else if (global.mockOAuthErrorObj) {
            callback(global.mockOAuthErrorObj, null);
          } else {
            callback(null, null);
          }
        };
      }
      return (req, res, next) => {
        res.status(200).send({ message: 'mocked redirect to github' });
      };
    }),
  };
});

jest.mock('passport-github2', () => {
  return {
    Strategy: jest.fn().mockImplementation(function (options, verify) {
      this.name = 'github';
      registeredStrategyVerify = verify;
    })
  };
});

const request = require('supertest');
const app = require('../src/app');
const { User, Role, UserRole } = require('../src/models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

jest.mock('../src/models', () => {
  const mockUser = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Test User',
    email: 'test@example.com',
    password_hash: '$2a$12$eImiTXuWVxfM37uY4JANjO5E/w9O',
    toJSON: function() {
      return { id: this.id, name: this.name, email: this.email };
    }
  };

  const mockRole = {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'GRANTEE'
  };

  return {
    User: {
      findOne: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
      scope: jest.fn().mockReturnThis(),
    },
    Role: {
      findOne: jest.fn(),
      create: jest.fn(),
    },
    UserRole: {
      create: jest.fn(),
      findOne: jest.fn(),
    },
    Grant: {},
    Application: {},
    sequelize: {
      sync: jest.fn(),
    }
  };
});

jest.mock('bcryptjs');

describe('Auth Endpoints & Passport Strategy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({
        id: 'user-uuid',
        name: 'John Doe',
        email: 'john@example.com',
        toJSON: () => ({ id: 'user-uuid', name: 'John Doe', email: 'john@example.com' })
      });
      Role.findOne.mockResolvedValue({ id: 'role-uuid', name: 'GRANTEE' });
      UserRole.create.mockResolvedValue({});
      bcrypt.hash.mockResolvedValue('hashed_password');

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'Password123'
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.email).toEqual('john@example.com');
    });

    it('should return 400 for invalid email or weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Doe',
          email: 'invalid-email',
          password: '123'
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Validation Error');
    });

    it('should return 409 if user already exists', async () => {
      User.findOne.mockResolvedValue({ id: 'existing-id' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          password: 'Password123'
        });

      expect(res.statusCode).toEqual(409);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should log in successfully and return access token', async () => {
      const mockUserObj = {
        id: 'user-uuid',
        email: 'john@example.com',
        password_hash: 'hashed_password'
      };

      User.scope.mockImplementation(() => ({
        findOne: jest.fn().mockResolvedValue(mockUserObj)
      }));

      bcrypt.compare.mockResolvedValue(true);

      User.findByPk.mockResolvedValue({
        id: 'user-uuid',
        roles: [{ name: 'GRANTEE' }]
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'Password123'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('accessToken');
    });

    it('should return 401 for invalid credentials (user not found)', async () => {
      User.scope.mockImplementation(() => ({
        findOne: jest.fn().mockResolvedValue(null)
      }));

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'WrongPassword123'
        });

      expect(res.statusCode).toEqual(401);
    });

    it('should return 400 if user account has no password hash (OAuth user)', async () => {
      User.scope.mockImplementation(() => ({
        findOne: jest.fn().mockResolvedValue({
          id: 'user-uuid',
          email: 'john@example.com',
          password_hash: null
        })
      }));

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'Password123'
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('uses OAuth login');
    });

    it('should return 401 if bcrypt comparison fails', async () => {
      User.scope.mockImplementation(() => ({
        findOne: jest.fn().mockResolvedValue({
          id: 'user-uuid',
          email: 'john@example.com',
          password_hash: 'hashed_password'
        })
      }));

      bcrypt.compare.mockResolvedValue(false);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@example.com',
          password: 'WrongPassword123'
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toContain('Invalid email or password');
    });
  });

  describe('GET /api/auth/github', () => {
    it('should redirect or initiate GitHub OAuth flow', async () => {
      const res = await request(app).get('/api/auth/github');
      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toContain('mocked redirect to github');
    });
  });

  describe('GET /api/auth/github/callback', () => {
    afterEach(() => {
      global.mockOAuthSuccess = false;
      global.mockOAuthUser = null;
      global.mockOAuthErrorObj = null;
    });

    it('should successfully handle OAuth callback and return access token', async () => {
      const mockUserObj = { id: 'user-oauth-1', email: 'git@example.com' };
      global.mockOAuthSuccess = true;
      global.mockOAuthUser = mockUserObj;

      User.findByPk.mockResolvedValue({
        id: 'user-oauth-1',
        roles: [{ name: 'GRANTEE' }]
      });

      const res = await request(app).get('/api/auth/github/callback');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('accessToken');
    });

    it('should return 401 if OAuth authentication fails', async () => {
      global.mockOAuthSuccess = false;
      global.mockOAuthErrorObj = new Error('OAuth rejected');

      const res = await request(app).get('/api/auth/github/callback');

      expect(res.statusCode).toEqual(401);
      expect(res.body.error).toEqual('Unauthorized');
    });

    it('should return 500 if token generation fails', async () => {
      const mockUserObj = { id: 'user-oauth-1', email: 'git@example.com' };
      global.mockOAuthSuccess = true;
      global.mockOAuthUser = mockUserObj;

      User.findByPk.mockRejectedValue(new Error('DB error during role fetch'));

      const res = await request(app).get('/api/auth/github/callback');

      expect(res.statusCode).toEqual(500);
      expect(res.body.error).toEqual('Server Error');
    });
  });

  describe('GitHub Strategy Verify Callback', () => {
    it('should find existing user by github oauth details', async () => {
      const profile = { id: '12345', displayName: 'Git User', emails: [{ value: 'git@example.com' }] };
      const mockUserObj = { id: 'user-oauth-1', email: 'git@example.com', name: 'Git User' };
      User.findOne.mockResolvedValue(mockUserObj);

      const done = jest.fn();
      await registeredStrategyVerify('access-token', 'refresh-token', profile, done);

      expect(User.findOne).toHaveBeenCalledWith({
        where: { oauth_provider: 'github', oauth_id: '12345' }
      });
      expect(done).toHaveBeenCalledWith(null, mockUserObj);
    });

    it('should link existing user by email if oauth user not found but email matches', async () => {
      const profile = { id: '12345', username: 'gituser', emails: [] };
      User.findOne
        .mockResolvedValueOnce(null) // by oauth details
        .mockResolvedValueOnce({
          id: 'user-email-1',
          email: 'gituser@github.noreply',
          save: jest.fn().mockResolvedValue(true)
        }); // by email

      const done = jest.fn();
      await registeredStrategyVerify('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalled();
      const linkedUser = done.mock.calls[0][1];
      expect(linkedUser.oauth_provider).toEqual('github');
      expect(linkedUser.oauth_id).toEqual('12345');
    });

    it('should create new user if user is not found by oauth details or email', async () => {
      const profile = { id: '12345', username: 'gituser', emails: [] };
      User.findOne
        .mockResolvedValueOnce(null) // oauth
        .mockResolvedValueOnce(null); // email
      User.create.mockResolvedValue({ id: 'new-oauth-user', name: 'gituser', email: 'gituser@github.noreply' });
      Role.findOne.mockResolvedValue({ id: 'role-grantee', name: 'GRANTEE' });
      UserRole.create.mockResolvedValue({});

      const done = jest.fn();
      await registeredStrategyVerify('access-token', 'refresh-token', profile, done);

      expect(User.create).toHaveBeenCalled();
      expect(UserRole.create).toHaveBeenCalled();
      expect(done).toHaveBeenCalledWith(null, expect.any(Object));
    });

    it('should call done with error if strategy verify throws an exception', async () => {
      const profile = { id: '12345', username: 'gituser', emails: [] };
      User.findOne.mockRejectedValue(new Error('DB Error'));

      const done = jest.fn();
      await registeredStrategyVerify('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(expect.any(Error), null);
    });
  });

  describe('Passport Deserialize User', () => {
    it('should deserialize user successfully', async () => {
      const mockUserObj = { id: 'user-1', name: 'User One' };
      User.findByPk.mockResolvedValue(mockUserObj);

      const done = jest.fn();
      await registeredDeserializer('user-1', done);

      expect(User.findByPk).toHaveBeenCalledWith('user-1');
      expect(done).toHaveBeenCalledWith(null, mockUserObj);
    });

    it('should call done with error if deserialization fails', async () => {
      User.findByPk.mockRejectedValue(new Error('Deserialize Error'));

      const done = jest.fn();
      await registeredDeserializer('user-1', done);

      expect(done).toHaveBeenCalledWith(expect.any(Error), null);
    });
  });
});
