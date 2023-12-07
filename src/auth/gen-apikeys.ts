const { scryptSync, randomBytes, timingSafeEqual } = require('crypto');


export function generateKey(size=32, format="base64") {
    const buffer = randomBytes(size)
    return buffer.toString(format)
}

