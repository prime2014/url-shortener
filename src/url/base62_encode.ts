var { v4 } = require("uuid");
const crypto = require("crypto")


export function generateHexUuid(): string {
  // Generate a version 4 UUID in hex form
  return v4().replace(/-/g, '');
}


export class Base62Converter {
    private base62String: string;
    private minLength: number;
    private maxLength: number;

    constructor() {
        this.base62String = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        this.minLength = 4;
        this.maxLength = 8;
    }

    private async generateRandomBytesAsync(size: number): Promise<Buffer> {
        return new Promise((resolve, reject) => {
          crypto.randomBytes(size, (err, buf) => {
            if (err) reject(err);
            else resolve(buf);
          });
        });
    }

    private async toBase62Async(length: number): Promise<string> {
        const hash_str: string[] = [];
    
        const generateBase62Char = async (i: number): Promise<void> => {
          if (i >= length) return;
    
          const byteBuffer = await this.generateRandomBytesAsync(50);
          const base62Char = this.base62String[byteBuffer[0] % 62];
    
          hash_str.push(base62Char);
    
          await generateBase62Char(i + 1);

        };
        await generateBase62Char(0);

        return hash_str.reverse().join("");

    }


    async getBase62Parallel(): Promise<string> {
        const randomLength = 8;
        const encoded = await this.toBase62Async(randomLength);
        return encoded;
    }


}


const encoder = new Base62Converter()

encoder.getBase62Parallel().then(resp=> resp)


