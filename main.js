const { createCipheriv, randomBytes, scrypt } = require("crypto")
const { promisify } = require("util");



async function encryptApiKey() {
    const KEY = "H8lNzApvl4qeOld5c4A7FnoIzJtV6X4i";

    const iv = randomBytes(16)

    const password = "!l=y_%6k)ts@_xxjsf4ahh$z5f$v2zw91eo-r5ft)p4n&l44&("

    const key = await promisify(scrypt)(password, 'salt', 32);

    
    const cipher = createCipheriv('aes-256-ctr', key, iv);

    const textToEncrypt = process.env.API_KEY;

    const encryptedText = key.concat([
        cipher.update(KEY),
        cipher.final()
    ])

    return encryptedText;
}

console.log(encryptApiKey())

