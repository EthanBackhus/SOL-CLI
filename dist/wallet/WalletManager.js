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
exports.WalletManager = void 0;
const wallet_1 = require("./wallet");
const dbHandler_1 = require("../database/dbHandler");
const walletGenerator_1 = require("./walletGenerator");
const config_1 = require("../helpers/config");
const logger_1 = __importDefault(require("../helpers/logger"));
const spl_token_1 = require("@solana/spl-token");
const web3_js_1 = require("@solana/web3.js");
const helpers_1 = require("../helpers/helpers");
const dbUpdateObj_1 = require("../helpers/dbUpdateObj");
const threadManager_1 = require("../threading/threadManager");
const grafCA = "9EL3CHVQS3nwUFhyVT7AGbttRsbJ5UE8Qjnw5ZAtkUhr";
const solBuyPerOrder = 0.00001;
class WalletManager {
    constructor(encryptionKey) {
        this.dbHandler = new dbHandler_1.DBHandler(encryptionKey);
        this.wallets = [];
        this.adminWallet = new wallet_1.Wallet(0, config_1.ADMIN_WALLET_PUBLIC_KEY, config_1.ADMIN_WALLET_SECRET_KEY, 0, 0, wallet_1.WalletType.Admin);
        this.connection = new web3_js_1.Connection(config_1.main_endpoint, "confirmed");
        this.threadManager = null;
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            this.wallets = yield this.dbHandler.getAllWallets();
            yield this.updateAdminWalletBalance();
            yield this.initializeThreadManager();
        });
    }
    initializeThreadManager() {
        return __awaiter(this, void 0, void 0, function* () {
            var walletKeypairs = yield (0, helpers_1.createKeypairsFromWallets)(this.wallets);
            this.threadManager = new threadManager_1.threadManager(walletKeypairs, grafCA, solBuyPerOrder);
        });
    }
    generateNewWallets(numWalletsToGenerate) {
        return __awaiter(this, void 0, void 0, function* () {
            for (let i = 0; i < numWalletsToGenerate; i++) {
                var newKp = (0, walletGenerator_1.generateKeypair)();
                const newWallet = new wallet_1.Wallet(0, newKp.publicKeyString, newKp.secretKeyToString, 0, 0, wallet_1.WalletType.Hodl);
                logger_1.default.info("New wallet generated: ", newWallet);
                yield this.dbHandler.insertWallet(newWallet);
            }
        });
    }
    transferSOLToAllWallets(adminWalletSecretKey, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            var totalCost = amount * this.wallets.length;
            if (totalCost >= 1) {
                logger_1.default.info("Total cost would exceed 1 SOL. Exiting...");
                return;
            }
            //TEMP
            const walletExceptForFirstTwo = this.wallets.slice(2);
            for (const wallet of walletExceptForFirstTwo) {
                yield this.transferSOL(adminWalletSecretKey, this.adminWallet.solBalance, wallet.publicKey, amount);
            }
            logger_1.default.info('All transfers completed.');
        });
    }
    transferSOL(payerSecretKey, payerSolBalance, payeeAddress, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            // get proper data
            const payee = new web3_js_1.PublicKey(payeeAddress);
            var payerWallet = yield (0, helpers_1.createKeypairFromStringBase58)(payerSecretKey);
            const lamports = amount * web3_js_1.LAMPORTS_PER_SOL;
            const transaction = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.transfer({
                fromPubkey: payerWallet.publicKey,
                toPubkey: payee,
                lamports
            }));
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
                const signature = yield (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [payerWallet]);
                logger_1.default.info(`Sol transfer to ${payeeAddress} is successful with signature ${signature}`);
                //this.updateWalletBalances(payerWallet.publicKey.toString(), payeeAddress, amount, estimatedFee);
                // This also seems to be broken too
                //this.updateWalletBalances(payerWallet.publicKey.toString(), payeeAddress, amount, 0);
            }
            catch (error) {
                logger_1.default.info('Transaction failed: ', error);
            }
        });
    }
    updateWalletBalances(payerAddress, payeeAddress, transactionAmount, estimatedFee) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const payerWallet = this.wallets.find(x => x.publicKey == payerAddress);
                const payeeWallet = this.wallets.find(x => x.publicKey == payeeAddress);
                if (payerWallet == null || payeeWallet == null) {
                    throw new Error("Payer or Payee wallet not found");
                }
                payerWallet.solBalance -= transactionAmount;
                payerWallet.solBalance -= estimatedFee;
                payeeWallet.solBalance += transactionAmount;
                console.log("wallet balances updated");
            }
            catch (error) {
                console.error("Wallet not found: ", error);
            }
        });
    }
    fetchBalances() {
        return __awaiter(this, void 0, void 0, function* () {
            const walletPublicKeys = this.wallets.map(x => new web3_js_1.PublicKey(x.publicKey));
            const accountInfos = yield this.connection.getMultipleAccountsInfo(walletPublicKeys);
            // Extract and log balances
            accountInfos.forEach((accountInfo, index) => {
                if (accountInfo) {
                    console.log(`Wallet ${this.wallets[index].publicKey} has ${accountInfo.lamports / web3_js_1.LAMPORTS_PER_SOL} SOL`);
                }
                else {
                    console.log(`Wallet ${this.wallets[index].publicKey} does not exist`);
                }
            });
            // return the data
            return accountInfos;
        });
    }
    fetchBalancesAndUpdate() {
        return __awaiter(this, void 0, void 0, function* () {
            const walletPublicKeys = this.wallets.map(x => new web3_js_1.PublicKey(x.publicKey));
            const accountInfos = yield this.connection.getMultipleAccountsInfo(walletPublicKeys);
            // Create an array of DbUpdateObj
            const dbUpdateObjs = accountInfos.map((accountInfo, index) => {
                const walletPublicKey = walletPublicKeys[index];
                return new dbUpdateObj_1.DbUpdateObj(walletPublicKey, accountInfo || null); // Handle null cases
            });
            // Log balances for debugging
            dbUpdateObjs.forEach((dbUpdateObj) => {
                if (dbUpdateObj.accountInfo) {
                    logger_1.default.info(`Wallet ${dbUpdateObj.pubKey.toString()} has ${dbUpdateObj.accountInfo.lamports / web3_js_1.LAMPORTS_PER_SOL} SOL`);
                }
                else {
                    logger_1.default.info(`Wallet ${dbUpdateObj.pubKey.toString()} does not exist`);
                }
            });
            // Return the array of DbUpdateObj instances
            return dbUpdateObjs;
        });
    }
    updateEntireDbWithSolBalances() {
        return __awaiter(this, void 0, void 0, function* () {
            const dbUpdateObjs = yield this.fetchBalancesAndUpdate();
            // create a batch query update
            const updateQueries = dbUpdateObjs.map(x => {
                const publicKey = x.pubKey;
                const lamports = x.accountInfo.lamports;
                return `UPDATE wallets SET solBalance = ${lamports} WHERE publicKey = '${publicKey}'`;
            }).join('; ');
            // TODO: FIX
            // !IMP ENABLE IF TRYING TO SAVE MANUALLY
            //console.log(updateQueries);
            yield this.dbHandler.updateDbWithQuery(updateQueries);
            //await this.dbHandler.updateDbWithDbObj(dbUpdateObjs);
        });
    }
    estimateTransactionFee(transaction, connection) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Serialize the transaction to get its size
                const serializedTransaction = transaction.serialize();
                const transactionSize = serializedTransaction.length;
                // Estimate the fee based on the transaction size
                const feeCalculator = yield connection.getFeeForMessage(transaction.compileMessage());
                const lamportsPerSignature = feeCalculator.value;
                // Calculate the total fee
                // Approximate number of instructions or signatures (using 128 bytes per signature is a rough estimate)
                const numberOfSignatures = Math.ceil(transactionSize / 128);
                const totalFee = lamportsPerSignature * numberOfSignatures;
                return totalFee;
            }
            catch (error) {
                console.error('Error estimating transaction fee:', error);
                throw error;
            }
        });
    }
    updateSingularDbEntryWithSolBalance(walletToUpdatePublicKeyString) {
        return __awaiter(this, void 0, void 0, function* () {
            const walletPubKey = new web3_js_1.PublicKey(walletToUpdatePublicKeyString);
            const walletAccountInfo = yield this.connection.getAccountInfo(walletPubKey);
            const solBalanceToUpdate = walletAccountInfo.lamports;
            yield this.dbHandler.updateSolBalanceOfWallet(walletToUpdatePublicKeyString, solBalanceToUpdate);
        });
    }
    generateNewTable() {
        return __awaiter(this, void 0, void 0, function* () {
            this.dbHandler.createWalletsTable();
        });
    }
    updateAdminWalletBalance() {
        return __awaiter(this, void 0, void 0, function* () {
            const adminWalletPubKey = new web3_js_1.PublicKey(config_1.ADMIN_WALLET_PUBLIC_KEY);
            this.adminWallet.solBalance = yield this.connection.getBalance(adminWalletPubKey);
            // Step 2: Get wSOL balance
            // wSOL Mint address (mainnet)
            const WSOL_MINT_ADDRESS = new web3_js_1.PublicKey('So11111111111111111111111111111111111111112');
            // Get all token accounts owned by the main account
            const tokenAccounts = yield this.connection.getParsedTokenAccountsByOwner(adminWalletPubKey, {
                programId: spl_token_1.TOKEN_PROGRAM_ID,
            });
            let wsolBalance = 0;
            // Loop through the token accounts to find the one holding wSOL
            for (const { pubkey, account } of tokenAccounts.value) {
                const parsedAccountInfo = account.data.parsed.info;
                const mintAddress = new web3_js_1.PublicKey(parsedAccountInfo.mint);
                if (mintAddress.equals(WSOL_MINT_ADDRESS)) {
                    wsolBalance = parsedAccountInfo.tokenAmount.uiAmount;
                    break;
                }
            }
        });
    }
    test() {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
}
exports.WalletManager = WalletManager;
//# sourceMappingURL=WalletManager.js.map