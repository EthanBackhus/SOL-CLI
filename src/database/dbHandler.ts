import  { generateKeypair } from "../wallet/walletGenerator";

var data = generateKeypair();

console.log(data.publicKey.toString);