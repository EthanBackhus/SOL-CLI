import {Wallet, WalletType} from "./wallet";
import {DBHandler} from "../database/dbHandler";
import {generateKeypair} from "./walletGenerator";
import { main_endpoint, ADMIN_WALLET_PUBLIC_KEY, ADMIN_WALLET_SECRET_KEY, ADMIN_WALLET_SECRET_KEY_ENCODED } from "../helpers/config";
import { AccountInfo } from "@solana/web3.js";
import logger from "../helpers/logger";
import { TOKEN_PROGRAM_ID, AccountLayout } from "@solana/spl-token";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, sendAndConfirmRawTransaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { createKeyPairFromStringsBase64, createKeyPairFromStringsHex, createKeypairFromStringBase58, extractLamports } from "../helpers/helpers";
import { DbUpdateObj } from "../helpers/dbUpdateObj";


export class WalletManager {
    public wallets: Wallet[];
    public dbHandler: DBHandler;
    public connection: Connection;
    public adminWallet: Wallet;

    constructor(encryptionKey: string){
        this.dbHandler = new DBHandler(encryptionKey);
        this.wallets = [];
        this.adminWallet = new Wallet(0, ADMIN_WALLET_PUBLIC_KEY, ADMIN_WALLET_SECRET_KEY, 0, 0, WalletType.Admin);
        this.connection = new Connection(main_endpoint, "confirmed");
    }

    async initialize(): Promise<void> {
        this.wallets = await this.dbHandler.getAllWallets();
        await this.updateAdminWalletBalance();
    }

    async generateNewWallets(numWalletsToGenerate: number)
    {
        for(let i = 0; i < numWalletsToGenerate; i++)
        {
            var newKp = generateKeypair();
            const newWallet = new Wallet(0, newKp.publicKeyString, newKp.secretKeyToString, 0, 0, WalletType.Hodl);
            var newWalletLog = newWallet;
            newWalletLog.secretKey = "***";
            logger.info("New wallet generated: ", newWalletLog);
            await this.dbHandler.insertWallet(newWallet);
        }
    }

    async transferSOLToAllWallets(adminWalletSecretKey: string, amount: number): Promise<void> {
        var totalCost = amount * this.wallets.length;
        if(totalCost >= 1)
        {
            logger.info("Total cost would exceed 1 SOL. Exiting...");
            return;
        }
        //TEMP
        const walletExceptForFirstTwo = this.wallets.slice(2);

        for (const wallet of walletExceptForFirstTwo) {
            await this.transferSOL(adminWalletSecretKey, this.adminWallet.solBalance, wallet.publicKey, amount);
        }
        logger.info('All transfers completed.');
    }


    async transferSOL(payerSecretKey: string, payerSolBalance: number, payeeAddress: string, amount: number): Promise<void>
    {
        // get proper data
        const payee = new PublicKey(payeeAddress);
        var payerWallet = await createKeypairFromStringBase58(payerSecretKey);

        const lamports = amount * LAMPORTS_PER_SOL;

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: payerWallet.publicKey,
                toPubkey: payee,
                lamports
            })
        )
        
        // commenting as Recent blockhash is required for estimating transaction fee
        /*
        const estimatedFee = await this.estimateTransactionFee(transaction, this.connection);
        if(payerSolBalance <= estimatedFee)
        {
            logger.info("not enough sol for transaction");
            return;
        }
        logger.info(`Estimated transaction fee: ${estimatedFee} lamports`);
        */

        try {
            const signature = await sendAndConfirmTransaction(this.connection, transaction, [payerWallet]);
            logger.info(`Sol transfer to ${payeeAddress} is successful with signature ${signature}`);
            //this.updateWalletBalances(payerWallet.publicKey.toString(), payeeAddress, amount, estimatedFee);

            // This also seems to be broken too
            //this.updateWalletBalances(payerWallet.publicKey.toString(), payeeAddress, amount, 0);
        } catch(error) {
           logger.info('Transaction failed: ', error);
        }
    }

    async updateWalletBalances(payerAddress: string, payeeAddress: string, transactionAmount: number, estimatedFee: number): Promise<void> {
        try{
            const payerWallet = this.wallets.find(x => x.publicKey == payerAddress);
            const payeeWallet = this.wallets.find(x => x.publicKey == payeeAddress);

            if(payerWallet == null || payeeWallet == null)
            {
                throw new Error("Payer or Payee wallet not found");
            }

            payerWallet.solBalance -= transactionAmount;
            payerWallet.solBalance -= estimatedFee;
            payeeWallet.solBalance += transactionAmount;
            console.log("wallet balances updated");
        } catch(error){
            console.error("Wallet not found: ", error);
        }
    }

    async fetchBalances(): Promise<AccountInfo<Buffer>[]> {
        const walletPublicKeys = this.wallets.map(x => new PublicKey(x.publicKey));
        const accountInfos = await this.connection.getMultipleAccountsInfo(walletPublicKeys);

        // Extract and log balances
        accountInfos.forEach((accountInfo, index) => {
            if (accountInfo) {
                console.log(`Wallet ${this.wallets[index].publicKey} has ${accountInfo.lamports / LAMPORTS_PER_SOL} SOL`);
            } else {
                console.log(`Wallet ${this.wallets[index].publicKey} does not exist`);
            }
        });

        // return the data
        return accountInfos;
    }

    async fetchBalancesAndUpdate(): Promise<DbUpdateObj[]> {
        const walletPublicKeys = this.wallets.map(x => new PublicKey(x.publicKey));
        const accountInfos = await this.connection.getMultipleAccountsInfo(walletPublicKeys);

        // Create an array of DbUpdateObj
        const dbUpdateObjs = accountInfos.map((accountInfo, index) => {
            const walletPublicKey = walletPublicKeys[index];
            return new DbUpdateObj(walletPublicKey, accountInfo || null); // Handle null cases
        });

        // Log balances for debugging
        dbUpdateObjs.forEach((dbUpdateObj) => {
            if (dbUpdateObj.accountInfo) {
                logger.info(`Wallet ${dbUpdateObj.pubKey.toString()} has ${dbUpdateObj.accountInfo.lamports / LAMPORTS_PER_SOL} SOL`);
            } else {
                logger.info(`Wallet ${dbUpdateObj.pubKey.toString()} does not exist`);
            }
        });

        // Return the array of DbUpdateObj instances
        return dbUpdateObjs;
    }

    async updateEntireDbWithSolBalances(): Promise<void> {
        const dbUpdateObjs = await this.fetchBalancesAndUpdate();

        // create a batch query update
        const updateQueries = dbUpdateObjs.map(x => {
            const publicKey = x.pubKey;
            const lamports = x.accountInfo.lamports;

            return `UPDATE wallets SET solBalance = ${lamports} WHERE publicKey = '${publicKey}'`;
        }).join('; ');

        console.log(updateQueries);
        await this.dbHandler.updateDbWithQuery(updateQueries);
        

        //await this.dbHandler.updateDbWithDbObj(dbUpdateObjs);
    }

    async estimateTransactionFee(transaction: Transaction, connection: Connection): Promise<number> {
        try {
            // Serialize the transaction to get its size
            const serializedTransaction = transaction.serialize();
            const transactionSize = serializedTransaction.length;
    
            // Estimate the fee based on the transaction size
            const feeCalculator = await connection.getFeeForMessage(transaction.compileMessage());
            const lamportsPerSignature = feeCalculator.value;
    
            // Calculate the total fee
            // Approximate number of instructions or signatures (using 128 bytes per signature is a rough estimate)
            const numberOfSignatures = Math.ceil(transactionSize / 128);
            const totalFee = lamportsPerSignature * numberOfSignatures;
    
            return totalFee;
        } catch (error) {
            console.error('Error estimating transaction fee:', error);
            throw error;
        }
    }

    async updateSingularDbEntryWithSolBalance(walletToUpdatePublicKeyString: string): Promise<void> {
        const walletPubKey = new PublicKey(walletToUpdatePublicKeyString);
        const walletAccountInfo = await this.connection.getAccountInfo(walletPubKey);
        const solBalanceToUpdate = walletAccountInfo.lamports;
        await this.dbHandler.updateSolBalanceOfWallet(walletToUpdatePublicKeyString, solBalanceToUpdate);
    }



    async generateNewTable(): Promise<void> {
        this.dbHandler.createWalletsTable();
    }

    async updateAdminWalletBalance(): Promise<void> {
        const adminWalletPubKey = new PublicKey(ADMIN_WALLET_PUBLIC_KEY);
        this.adminWallet.solBalance = await this.connection.getBalance(adminWalletPubKey);

        // Step 2: Get wSOL balance
         // wSOL Mint address (mainnet)
         const WSOL_MINT_ADDRESS = new PublicKey('So11111111111111111111111111111111111111112');


         // Get all token accounts owned by the main account
        const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
            adminWalletPubKey,
           {
             programId: TOKEN_PROGRAM_ID,
           }
         );
       
         let wsolBalance = 0;
       
         // Loop through the token accounts to find the one holding wSOL
         for (const { pubkey, account } of tokenAccounts.value) {
           const parsedAccountInfo = account.data.parsed.info;
           const mintAddress = new PublicKey(parsedAccountInfo.mint);
        
           if (mintAddress.equals(WSOL_MINT_ADDRESS)) {
             wsolBalance = parsedAccountInfo.tokenAmount.uiAmount;
             break;
           }
        }
    }



}