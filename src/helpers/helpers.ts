import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import {Keypair} from "@solana/web3.js"


// move this to helpers.ts
export function extractLamports(buffer: Buffer): BigInt {
    // Solanace account balance is stored in the first 8 bytes of the account data
    return buffer.readBigUInt64BE(0); // use BigInt for 64-bit integers
}

export async function createKeyPairFromStringsBase64(secretKeyString: string): Promise<Keypair>
{
    //decode secret key into Uint8Array
    const secretKeyArray = Uint8Array.from(Buffer.from(secretKeyString, 'base64'));

    //create and return keypair
    return Keypair.fromSecretKey(secretKeyArray);
}

export async function createKeyPairFromStringsHex(secretKeyString: string): Promise<Keypair>
{
    //decode secret key into Uint8Array
    const secretKeyArray = Uint8Array.from(Buffer.from(secretKeyString, 'hex'));

    //create and return keypair
    return Keypair.fromSecretKey(secretKeyArray);
}

export async function createKeypairFromStringBase58(secretKeyString: string): Promise<Keypair> {
    const secretKey = bs58.decode(secretKeyString);
    const keypair = Keypair.fromSecretKey(secretKey);
    return keypair;
}

