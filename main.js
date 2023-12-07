const { scryptSync, randomBytes, timingSafeEqual } = require('crypto');


function generateKeys(size=32, format="base64") {
    const buffer = randomBytes(size)
    return buffer.toString(format)
}


console.log(generateKeys())