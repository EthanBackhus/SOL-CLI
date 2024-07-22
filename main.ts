import { DBHandler } from "./src/database/dbHandler";
import { PublicKey, Keypair } from "@solana/web3.js";
import { Wallet} from "./src/wallet/wallet";
import { generateKeypair } from "./src/wallet/walletGenerator";



const keyPair = generateKeypair();
let newWallet = new Wallet(123, keyPair.publicKeyString, keyPair.secretKeyToString, 0, 0);

const dbHandler = new DBHandler();
//await dbHandler.insertWallet(newWallet);
dbHandler.deleteWallet("8LzjgN2fxniP1j7CfwHGNS9kFEqr88xRrT7YkMZiHLYG");