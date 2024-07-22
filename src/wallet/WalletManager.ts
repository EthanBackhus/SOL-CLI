import {Wallet} from "./wallet";
import {DBHandler} from "../database/dbHandler";
import {generateKeypair} from "./walletGenerator";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';

export class WalletManager {
    public wallets: Wallet[];
    public dbHandler: DBHandler;
    public connection: Connection;

    constructor(encryptionKey: string){
        this.dbHandler = new DBHandler(encryptionKey);
        this.wallets = [];
        this.connection = new Connection(MAINNET_ENDPOINT);
    }

    async initialize(): Promise<void> {
        this.wallets = await this.dbHandler.getAllWallets();
    }

    async generateWallets(numWalletsToGenerate: number)
    {
        for(let i = 0; i < numWalletsToGenerate; i++)
        {
            var newKp = generateKeypair();
            var newWallet = new Wallet(0, newKp.publicKeyString, newKp.secretKeyToString, 0, 0);
            console.log("new wallet generated: ", newWallet);
            this.dbHandler.insertWallet(newWallet);
            console.log("new wallet inserted into db");
        }
    }

    async transferSOL(fromKp: Keypair, toAddress: string, amount: number): Promise<void>
    {

    }

    async generateNewTable(): Promise<void> {
        this.dbHandler.createWalletsTable();
    }



}