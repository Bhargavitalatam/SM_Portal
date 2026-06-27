'use strict';

const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const { User, Role, UserRole } = require('../models');

const {
  OAUTH_CLIENT_ID,
  OAUTH_CLIENT_SECRET,
  OAUTH_CALLBACK_URL,
} = process.env;

/**
 * Configure Passport with GitHub OAuth 2.0 strategy.
 * On successful auth, either find or create a user, then assign GRANTEE role by default.
 */
passport.use(
  new GitHubStrategy(
    {
      clientID: OAUTH_CLIENT_ID || 'dummy_client_id',
      clientSecret: OAUTH_CLIENT_SECRET || 'dummy_client_secret',
      callbackURL: OAUTH_CALLBACK_URL || 'http://localhost:3000/api/auth/github/callback',
      scope: ['user:email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email =
          (profile.emails && profile.emails[0] && profile.emails[0].value) ||
          `${profile.username}@github.noreply`;

        // Check if user already exists
        let user = await User.findOne({
          where: { oauth_provider: 'github', oauth_id: profile.id.toString() },
        });

        if (!user) {
          // Also check by email
          user = await User.findOne({ where: { email } });

          if (user) {
            // Link existing account to GitHub OAuth
            user.oauth_provider = 'github';
            user.oauth_id = profile.id.toString();
            await user.save();
          } else {
            // Create new user
            user = await User.create({
              name: profile.displayName || profile.username,
              email,
              oauth_provider: 'github',
              oauth_id: profile.id.toString(),
            });

            // Assign default GRANTEE role
            const granteeRole = await Role.findOne({ where: { name: 'GRANTEE' } });
            if (granteeRole) {
              await UserRole.create({ user_id: user.id, role_id: granteeRole.id });
            }
          }
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
