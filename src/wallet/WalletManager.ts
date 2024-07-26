import {Wallet, WalletType} from "./wallet";
import {DBHandler} from "../database/dbHandler";
import {generateKeypair} from "./walletGenerator";
import { main_endpoint } from "../helpers/config";
import { AccountInfo } from "@solana/web3.js";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, sendAndConfirmRawTransaction, sendAndConfirmTransaction } from '@solana/web3.js';

export class WalletManager {
    public wallets: Wallet[];
    public dbHandler: DBHandler;
    public connection: Connection;

    constructor(encryptionKey: string){
        this.dbHandler = new DBHandler(encryptionKey);
        this.wallets = [];
        this.connection = new Connection(main_endpoint, "confirmed");
    }

    async initialize(): Promise<void> {
        this.wallets = await this.dbHandler.getAllWallets();
    }

    async generateNewWallets(numWalletsToGenerate: number)
    {
        for(let i = 0; i < numWalletsToGenerate; i++)
        {
            var newKp = generateKeypair();
            var newWallet = new Wallet(0, newKp.publicKeyString, newKp.secretKeyToString, 0, 0, WalletType.Hodl);
            console.log("new wallet generated: ", newWallet);
            this.dbHandler.insertWallet(newWallet);
            console.log("new wallet inserted into db");
        }
    }

    async transferSOLToAllWallets(adminWalletSecretKey: string, amount: number): Promise<void> {
        var totalCost = amount * this.wallets.length;
        if(totalCost >= 0.5)
        {
            console.log("Total cost would exceed 0.5 SOL. Exiting...");
            return;
        }

        for (const wallet of this.wallets) {
            try {
                // Fix the 999 (for error checking)
                await this.transferSOL(adminWalletSecretKey, 999, wallet.publicKey, amount);
                console.log(`Transfer to ${wallet.publicKey} completed successfully.`);
            } catch (error) {
                console.error(`Transfer to ${wallet.publicKey} failed:`, error);
            }
        }
        console.log('All transfers completed.');
    }


    async transferSOL(payerSecretKey: string, payerSolBalance: number, payeeAddress: string, amount: number): Promise<void>
    {
        // get proper data
        const payee = new PublicKey(payeeAddress);
        var payerWallet = await this.createKeyPairFromStrings(payerSecretKey);

        const lamports = amount * LAMPORTS_PER_SOL;

        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: payerWallet.publicKey,
                toPubkey: payee,
                lamports
            })
        )

        const estimatedFee = await this.estimateTransactionFee(transaction, this.connection);
        if(payerSolBalance <= estimatedFee)
        {
            console.log("not enough sol for transaction");
            return;
        }
        console.log(`Estimated transaction fee: ${estimatedFee} lamports`);

        try {
            const signature = await sendAndConfirmTransaction(this.connection, transaction, [payerWallet]);
            console.log(`Sol transfer from ${payerWallet.publicKey} to ${payeeAddress} is successful with signature ${signature}`);
            this.updateWalletBalances(payerWallet.publicKey.toString(), payeeAddress, amount, estimatedFee);
            // update the DB with the correct amount of sol to the wallet
            
        } catch(error) {
            console.error('Transaction failed: ', error);
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

    // FIX THIS
    async updateEntireDbWithSolBalances(): Promise<void> {

        var accounts = await this.fetchBalances();

        // create a batch query update
        const updateQueries = accounts.map(x => {
            const publicKey = x.owner.toBase58();           // is this right?
            const lamports = this.extractLamports(x.data);

            return `UPDATE wallets SET solBalance = ${lamports} WHERE publicKey = '${publicKey}'`;
        }).join('; ');

        try {
            // PASS THIS TO DB HANDLER TO EXECUTE
            //await this.dbHandler.execute(updateQueries);
            console.log('Balances updated successfully.');
          } catch (error) {
            console.error('Error updating balances:', error);
          }
    }

    async updateSingularDbEntryWithSolBalance(walletToUpdatePublicKeyString: string): Promise<void> {
        const walletPubKey = new PublicKey(walletToUpdatePublicKeyString);
        const walletAccountInfo = await this.connection.getAccountInfo(walletPubKey);
        const solBalanceToUpdate = walletAccountInfo.lamports;
        await this.dbHandler.updateSolBalanceOfWallet(walletToUpdatePublicKeyString, solBalanceToUpdate);
    }

    // move this to helpers.ts
    extractLamports(buffer: Buffer): BigInt {
        // Solanace account balance is stored in the first 8 bytes of the account data
        return buffer.readBigUInt64BE(0); // use BigInt for 64-bit integers
    }

    async createKeyPairFromStrings(secretKeyString: string): Promise<Keypair>
    {
        //decode secret key into Uint8Array
        const secretKeyArray = Uint8Array.from(Buffer.from(secretKeyString, 'base64'));

        //create and return keypair
        return Keypair.fromSecretKey(secretKeyArray);
    }

    async generateNewTable(): Promise<void> {
        this.dbHandler.createWalletsTable();
    }



}