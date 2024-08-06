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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const web3_js_1 = require("@solana/web3.js");
const src_1 = require("../../src");
const nodewallet_1 = __importDefault(require("@coral-xyz/anchor/dist/cjs/nodewallet"));
const anchor_1 = require("@coral-xyz/anchor");
const util_1 = require("../util");
const KEYS_FOLDER = __dirname + "/.keys";
s;
const SLIPPAGE_BASIS_POINTS = 100n;
//create token example:
//https://solscan.io/tx/bok9NgPeoJPtYQHoDqJZyRDmY88tHbPcAk1CJJsKV3XEhHpaTZhUCG3mA9EQNXcaUfNSgfPkuVbEsKMp6H7D9NY
//devnet faucet
//https://faucet.solana.com/
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    dotenv_1.default.config();
    if (!process.env.HELIUS_RPC_URL) {
        console.error("Please set HELIUS_RPC_URL in .env file");
        console.error("Example: HELIUS_RPC_URL=https://mainnet.helius-rpc.com/?api-key=<your api key>");
        console.error("Get one at: https://www.helius.dev");
        return;
    }
    let connection = new web3_js_1.Connection(process.env.HELIUS_RPC_URL || "");
    let wallet = new nodewallet_1.default(new web3_js_1.Keypair()); //note this is not used
    const provider = new anchor_1.AnchorProvider(connection, wallet, {
        commitment: "finalized",
    });
    const testAccount = (0, util_1.getOrCreateKeypair)(KEYS_FOLDER, "test-account");
    const mint = (0, util_1.getOrCreateKeypair)(KEYS_FOLDER, "mint");
    yield (0, util_1.printSOLBalance)(connection, testAccount.publicKey, "Test Account keypair");
    let sdk = new src_1.PumpFunSDK(provider);
    let globalAccount = yield sdk.getGlobalAccount();
    console.log(globalAccount);
    let currentSolBalance = yield connection.getBalance(testAccount.publicKey);
    if (currentSolBalance == 0) {
        console.log("Please send some SOL to the test-account:", testAccount.publicKey.toBase58());
        return;
    }
    console.log(yield sdk.getGlobalAccount());
    //Check if mint already exists
    let boundingCurveAccount = yield sdk.getBondingCurveAccount(mint.publicKey);
    if (!boundingCurveAccount) {
        let tokenMetadata = {
            name: "TST-7",
            symbol: "TST-7",
            description: "TST-7: This is a test token",
            file: yield fs_1.default.openAsBlob("example/basic/random.png"),
        };
        let createResults = yield sdk.createAndBuy(testAccount, mint, tokenMetadata, BigInt(0.0001 * web3_js_1.LAMPORTS_PER_SOL), SLIPPAGE_BASIS_POINTS, {
            unitLimit: 250000,
            unitPrice: 250000,
        });
        if (createResults.success) {
            console.log("Success:", `https://pump.fun/${mint.publicKey.toBase58()}`);
            boundingCurveAccount = yield sdk.getBondingCurveAccount(mint.publicKey);
            console.log("Bonding curve after create and buy", boundingCurveAccount);
            (0, util_1.printSPLBalance)(connection, mint.publicKey, testAccount.publicKey);
        }
    }
    else {
        console.log("boundingCurveAccount", boundingCurveAccount);
        console.log("Success:", `https://pump.fun/${mint.publicKey.toBase58()}`);
        (0, util_1.printSPLBalance)(connection, mint.publicKey, testAccount.publicKey);
    }
    if (boundingCurveAccount) {
        //buy 0.0001 SOL worth of tokens
        let buyResults = yield sdk.buy(testAccount, mint.publicKey, BigInt(0.0001 * web3_js_1.LAMPORTS_PER_SOL), SLIPPAGE_BASIS_POINTS, {
            unitLimit: 250000,
            unitPrice: 250000,
        });
        if (buyResults.success) {
            (0, util_1.printSPLBalance)(connection, mint.publicKey, testAccount.publicKey);
            console.log("Bonding curve after buy", yield sdk.getBondingCurveAccount(mint.publicKey));
        }
        else {
            console.log("Buy failed");
        }
        //sell all tokens
        let currentSPLBalance = yield (0, util_1.getSPLBalance)(connection, mint.publicKey, testAccount.publicKey);
        console.log("currentSPLBalance", currentSPLBalance);
        if (currentSPLBalance) {
            let sellResults = yield sdk.sell(testAccount, mint.publicKey, BigInt(currentSPLBalance * Math.pow(10, src_1.DEFAULT_DECIMALS)), SLIPPAGE_BASIS_POINTS, {
                unitLimit: 250000,
                unitPrice: 250000,
            });
            if (sellResults.success) {
                yield (0, util_1.printSOLBalance)(connection, testAccount.publicKey, "Test Account keypair");
                (0, util_1.printSPLBalance)(connection, mint.publicKey, testAccount.publicKey, "After SPL sell all");
                console.log("Bonding curve after sell", yield sdk.getBondingCurveAccount(mint.publicKey));
            }
            else {
                console.log("Sell failed");
            }
        }
    }
});
main();
//# sourceMappingURL=index.js.map