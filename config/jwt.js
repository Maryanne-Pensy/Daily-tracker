const crypto = require('crypto');

// Values that were published in this repo and must never sign real tokens.
const PUBLIC_SECRETS = ['super_secret_daily_tracker_jwt_key_2026', 'change-me'];

function loadSecret() {
  const secret = process.env.JWT_SECRET || '';
  if (secret.length >= 32 && !PUBLIC_SECRETS.includes(secret)) return secret;
  // Stay secure without crashing: sign with a random secret for this run only
  // (everyone has to sign in again after a restart until JWT_SECRET is set).
  console.warn('[Security] JWT_SECRET is missing, too short or publicly known. Using a temporary random secret.');
  console.warn('[Security] Set JWT_SECRET in .env to a long random value, e.g.: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
  return crypto.randomBytes(48).toString('hex');
}

module.exports = { JWT_SECRET: loadSecret() };
