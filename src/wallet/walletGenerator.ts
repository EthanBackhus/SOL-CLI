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

// PUB KEY: 5wotKZQU7E64Jj1kGrxfmJoNcunhsfWiqNs6yxnxYkRh
// SECRET KEY: 395b464ae42691a928f1c25f5f3230fa571c8a266d16ad1c4a7fbc9c49be5b0d49791fce1990451a555ea5434ef83d77d3922f967a18c97e5318997d13e1c1cc
// SECRET KEY ENCODED: 29Wdvcw4vnvP7WbwbwQKv8sBWVbnDzgZCBcXDfxW2bKxss3xPtvVLwgvhLzr126diyjUMSDrwJhRJYYGHrjv8HMV
*/