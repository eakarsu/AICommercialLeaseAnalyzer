const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../models');

async function main() {
  if (!['1', 'true'].includes(String(process.env.ALLOW_SCHEMA_MIGRATION || '').toLowerCase())) {
    throw new Error('Refusing admin bootstrap without ALLOW_SCHEMA_MIGRATION=1');
  }

  const email = process.env.PROVISION_ADMIN_EMAIL;
  const password = process.env.PROVISION_ADMIN_PASSWORD;
  if (!email || !password) throw new Error('PROVISION_ADMIN_EMAIL and PROVISION_ADMIN_PASSWORD are required');

  const passwordHash = await bcrypt.hash(password, 10);
  const [user, created] = await User.findOrCreate({
    where: { email },
    defaults: {
      email,
      password: passwordHash,
      name: process.env.PROVISION_ADMIN_NAME || 'Runtime Administrator',
      role: 'admin',
      isVerified: true
    }
  });

  if (!created) {
    await user.update({ password: passwordHash, role: 'admin', isVerified: true });
  }
}

main()
  .then(() => sequelize.close())
  .catch(async (error) => {
    console.error(error.message);
    await sequelize.close().catch(() => {});
    process.exit(1);
  });
