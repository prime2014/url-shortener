var { v4 } = require("uuid");
const crypto = require("crypto")


function generateHexUuid() {
  // Generate a version 4 UUID in hex form
  return v4().replace(/-/g, '');
}


class Base62Converter {
    base62String;
    minLength;
    maxLength;

    constructor() {
        this.base62String = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        this.minLength = 4;
        this.maxLength = 8;
    }

    async generateRandomBytesAsync(size) {
        return new Promise((resolve, reject) => {
          crypto.randomBytes(size, (err, buf) => {
            if (err) reject(err);
            else resolve(buf);
          });
        });
    }

    async toBase62Async(length) {
        const hash_str = [];
    
        const generateBase62Char = async (i) => {
          if (i >= length) return;
    
          const byteBuffer = await this.generateRandomBytesAsync(50);
          const base62Char = this.base62String[byteBuffer[0] % 62];
    
          hash_str.push(base62Char);
    
          await generateBase62Char(i + 1);

        };
        await generateBase62Char(0);

        return hash_str.reverse().join("");

    }


    async getBase62Parallel() {
        const randomLength = 8;
        const encoded = await this.toBase62Async(randomLength);
        return encoded;
    }


}




// const encoder = new Base62Converter()

// encoder.getBase62Parallel().then(resp=> resp)


module.exports = {
  Base62Converter
}