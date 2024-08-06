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
const web3_js_1 = require("@solana/web3.js");
const src_1 = require("../../src");
const nodewallet_1 = __importDefault(require("@coral-xyz/anchor/dist/cjs/nodewallet"));
const anchor_1 = require("@coral-xyz/anchor");
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
    let sdk = new src_1.PumpFunSDK(provider);
    let createEvent = sdk.addEventListener("createEvent", (event) => {
        console.log("createEvent", event);
    });
    console.log("createEvent", createEvent);
    let tradeEvent = sdk.addEventListener("tradeEvent", (event) => {
        console.log("tradeEvent", event);
    });
    console.log("tradeEvent", tradeEvent);
    let completeEvent = sdk.addEventListener("completeEvent", (event) => {
        console.log("completeEvent", event);
    });
    console.log("completeEvent", completeEvent);
});
main();
//# sourceMappingURL=index.js.map