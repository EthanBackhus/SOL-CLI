"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractLamports = extractLamports;
exports.createKeyPairFromStringsBase64 = createKeyPairFromStringsBase64;
exports.createKeyPairFromStringsHex = createKeyPairFromStringsHex;
exports.createKeypairFromStringBase58 = createKeypairFromStringBase58;
exports.createKpFromBs58 = createKpFromBs58;
exports.createKeypairsFromWallets = createKeypairsFromWallets;
const bytes_1 = require("@coral-xyz/anchor/dist/cjs/utils/bytes");
const web3_js_1 = require("@solana/web3.js");
// move this to helpers.ts
function extractLamports(buffer) {
    // Solanace account balance is stored in the first 8 bytes of the account data
    return buffer.readBigUInt64BE(0); // use BigInt for 64-bit integers
}
function createKeyPairFromStringsBase64(secretKeyString) {
    return __awaiter(this, void 0, void 0, function* () {
        //decode secret key into Uint8Array
        const secretKeyArray = Uint8Array.from(Buffer.from(secretKeyString, 'base64'));
        //create and return keypair
        return web3_js_1.Keypair.fromSecretKey(secretKeyArray);
    });
}
function createKeyPairFromStringsHex(secretKeyString) {
    //decode secret key into Uint8Array
    const secretKeyArray = Uint8Array.from(Buffer.from(secretKeyString, 'hex'));
    //create and return keypair
    return web3_js_1.Keypair.fromSecretKey(secretKeyArray);
}
function createKeypairFromStringBase58(secretKeyString) {
    return __awaiter(this, void 0, void 0, function* () {
        const secretKey = bytes_1.bs58.decode(secretKeyString);
        const keypair = web3_js_1.Keypair.fromSecretKey(secretKey);
        return keypair;
    });
}
function createKpFromBs58(secretKeyString) {
    const secretKey = bytes_1.bs58.decode(secretKeyString);
    const keypair = web3_js_1.Keypair.fromSecretKey(secretKey);
    return keypair;
}
function createKeypairsFromWallets(wallets) {
    return __awaiter(this, void 0, void 0, function* () {
        var keypairs = [];
        wallets.forEach(x => {
            var kp = createKeyPairFromStringsHex(x.secretKey);
            keypairs.push(kp);
        });
        return keypairs;
    });
}
//# sourceMappingURL=helpers.js.map