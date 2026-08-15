const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
// Ensure secret key is exactly 32 bytes (256 bits)
const getSecretKey = () => {
  const secret = process.env.AES_SECRET_KEY;
  if (!secret) throw new Error("FATAL: AES_SECRET_KEY is missing in environment variables.");
  return crypto.scryptSync(secret, 'whatsapp_salt', 32);
};

/**
 * Encrypts a phone number using AES-256-GCM
 * @param {string} text - Raw phone number (e.g. "+201012345678")
 * @returns {string} Encrypted string format: iv:authTag:encryptedData
 */
function encryptPhoneNumber(text) {
  if (!text) return '';
  const key = getSecretKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text.trim(), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a phone number using AES-256-GCM
 * @param {string} encryptedText - Format: iv:authTag:encryptedData
 * @returns {string} Raw phone number
 */
function decryptPhoneNumber(encryptedText) {
  if (!encryptedText) return '';
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return '';

    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getSecretKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt phone number:', error.message);
    return '';
  }
}

/**
 * Normalizes phone numbers to standard numeric string (e.g. "01202843931" -> "201202843931")
 */
function normalizePhoneNumber(phone) {
  if (!phone) return '';
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('01') && clean.length === 11) {
    clean = '2' + clean;
  } else if (clean.startsWith('1') && clean.length === 10) {
    clean = '20' + clean;
  }
  return clean;
}

/**
 * Sanitizes phone numbers into WhatsApp format JID (e.g., 201012345678@s.whatsapp.net)
 */
function formatWhatsAppJid(phone) {
  if (!phone) return '';
  const clean = normalizePhoneNumber(phone);
  return `${clean}@s.whatsapp.net`;
}

module.exports = {
  encryptPhoneNumber,
  decryptPhoneNumber,
  normalizePhoneNumber,
  formatWhatsAppJid
};
