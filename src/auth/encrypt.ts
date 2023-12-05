import { randomBytes, createCipheriv, createDecipheriv } from "crypto";


const algorithm = 'aes-256-cbc'; //Using AES encryption
const key = randomBytes(32);
const iv = randomBytes(16);

export function encrypt(text) {
  let cipher = createCipheriv('aes-256-cbc', Buffer.from(key), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') };
}

// Decrypting text
export function decrypt(text) {
  let iv = Buffer.from(text.iv, 'hex');
  let encryptedText = Buffer.from(text.encryptedData, 'hex');
  let decipher = createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// // Text send to encrypt function
// var hw = encrypt("Welcome to Tutorials Point...")
// console.log(hw)
// console.log(decrypt(hw))

