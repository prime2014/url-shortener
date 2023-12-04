var { v4 } = require("uuid");
const crypto = require("crypto")


export class Base62Converter {
    private uuid;
    private base62String: string;
    private maxBase62Length: number;

    constructor() {
        this.uuid = v4();
        this.base62String = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        this.maxBase62Length = 8;
    }

    private async generateRandomBytesAsync(size: number): Promise<Buffer> {
        return new Promise((resolve, reject) => {
          crypto.randomBytes(size, (err, buf) => {
            if (err) reject(err);
            else resolve(buf);
          });
        });
    }

    private async toBase62Async(deci: number): Promise<string> {
        const hash_str: string[] = [];
    
        const generateBase62Char = async (i: number): Promise<void> => {
          if (i >= this.maxBase62Length) return;
    
          const byteBuffer = await this.generateRandomBytesAsync(1);
          const base62Char = this.base62String[byteBuffer[0] % 62];
    
          hash_str.push(base62Char);
    
          await generateBase62Char(i + 1);

        };
        await generateBase62Char(0);

        return hash_str.reverse().join("");

    }


    async getBase62Parallel(): Promise<string> {
        const mydec = this.uuidToDec();
        const encoded = await this.toBase62Async(mydec);
        return encoded;
    }

    private uuidToDec(): number {
        return parseInt(this.uuid, 16)
    }



    private toBase62(deci: number) {
        let hash_str: string = "";

        while (deci > 0 && hash_str.length < this.maxBase62Length) {
            hash_str += this.base62String[deci % 62];
            deci = Math.floor(deci / 62);
        }

        return hash_str.split("").reverse().join("");
    }

    async getBase62() {
        let mydec = this.uuidToDec()
        let encoded = this.toBase62(mydec)
        return encoded
    }
}


const encoder = new Base62Converter()

encoder.getBase62Parallel().then(resp=> console.log(resp))


