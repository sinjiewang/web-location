import crypto from 'crypto';

export default function createCredentials(username, secret, expiry=86400) {
  const timestamp = Math.floor(Date.now() / 1000) + expiry; // Current time + expiry
  const usernameWithExpiry = `${timestamp}:${username}`;
  const hmac = crypto.createHmac('sha1', secret)

  hmac.update(usernameWithExpiry);

  const password = hmac.digest('base64'); // Password generated with HMAC-SHA1

  return {
    username: usernameWithExpiry,
    credential: password,
  };
}