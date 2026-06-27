'use strict';

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User, Role, UserRole } = require('../src/models');

const ROLES = ['ADMIN', 'GRANTOR', 'GRANTEE'];

async function seed() {
  try {
    console.log('[Seed] Starting database seeding...');

    // Sync all models (create tables if they don't exist)
    await sequelize.sync({ alter: false });

    // ── Seed Roles ──────────────────────────────────────────────────────────
    const roleInstances = {};
    for (const roleName of ROLES) {
      const [role] = await Role.findOrCreate({
        where: { name: roleName },
        defaults: { name: roleName },
      });
      roleInstances[roleName] = role;
      console.log(`[Seed] Role "${roleName}" ensured.`);
    }

    // ── Seed Default Admin User ─────────────────────────────────────────────
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@grantportal.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

    let adminUser = await User.scope('withPassword').findOne({
      where: { email: adminEmail },
    });

    if (!adminUser) {
      const password_hash = await bcrypt.hash(adminPassword, 12);
      adminUser = await User.create({
        name: 'System Administrator',
        email: adminEmail,
        password_hash,
      });
      console.log(`[Seed] Admin user created: ${adminEmail}`);
    } else {
      console.log(`[Seed] Admin user already exists: ${adminEmail}`);
    }

    // Assign ADMIN role to admin user
    const existingAdminRole = await UserRole.findOne({
      where: { user_id: adminUser.id, role_id: roleInstances['ADMIN'].id },
    });

    if (!existingAdminRole) {
      await UserRole.create({
        user_id: adminUser.id,
        role_id: roleInstances['ADMIN'].id,
      });
      console.log(`[Seed] ADMIN role assigned to admin user.`);
    }

    console.log('[Seed] Database seeding completed successfully.');
  } catch (err) {
    console.error('[Seed] Error during seeding:', err);
    throw err;
  }
}

// Run seed if called directly
if (require.main === module) {
  seed()
    .then(() => {
      console.log('[Seed] Done. Exiting.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed] Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { seed };
