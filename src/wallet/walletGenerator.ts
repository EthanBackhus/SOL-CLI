//const solanaWeb3 = require('@solana/web3.js');
//const bs58 = require('bs58');

import { PublicKey, Keypair } from "@solana/web3.js";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

export function generateKeypair() {
    // Generate a new random keypair
    const keypair = Keypair.generate();
  
    // Get the secret key (private key) and public key
    const secretKey = keypair.secretKey;
    const publicKey = keypair.publicKey;
    const publicKeyString = publicKey.toString();
    const secretKeyEncoded = bs58.encode(secretKey);
    const secretKeyToString = Buffer.from(secretKey).toString('hex');
  
    //console.log('Public Key:', publicKey.toString());
    //console.log('Secret Key:', Buffer.from(secretKey).toString('hex'));
    //console.log("Secret Key Encoded: ", secretKeyEncoded.toString());
  
    return { publicKey, secretKey, secretKeyEncoded, secretKeyToString, publicKeyString };
}


/*
export function generateKeypair()
{
    // Generate a new random keypair
    const keypair = solanaWeb3.Keypair.generate();

    // Get the secret key (private key) and public key
    const secretKey = keypair.secretKey;
    const publicKey = keypair.publicKey.toString();
    const secretKeyEncoded = bs58.encode(secretKey);

    console.log('Public Key:', publicKey);
    console.log('Secret Key:', Buffer.from(secretKey).toString('hex'));
    console.log("Secret Key Encoded: ", secretKeyEncoded.toString());

    return {publicKey, secretKey, secretKeyEncoded};       
}

module.exports = generateKeypair;


// Generate a new random keypair
const keypair = solanaWeb3.Keypair.generate();

// Get the secret key (private key) and public key
const secretKey = keypair.secretKey;
const publicKey = keypair.publicKey.toString();
const secretKeyEncoded = bs58.encode(secretKey);

console.log('Public Key:', publicKey);
console.log('Secret Key:', Buffer.from(secretKey).toString('hex'));
console.log("Secret Key Encoded: ", secretKeyEncoded.toString());

*/