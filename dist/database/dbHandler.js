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
exports.DBHandler = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
const wallet_1 = require("../wallet/wallet");
const logger_1 = __importDefault(require("../helpers/logger"));
class DBHandler {
    constructor(encryptionKey) {
        this._pool = promise_1.default.createPool({
            host: 'localhost',
            user: 'ethanbackhus',
            password: 'Skyrim2014$250067862500', // TODO: change this to encryptionKey????
            database: 'ethanbackhus'
        });
        this._encryptionKey = encryptionKey; // passing encryption key in as a object parameter
    }
    /**
    * Inserts a wallet into the db
    * @async
    * @function insertWallet
    * @param {Wallet} wallet - The wallet to be inserted into the db
    * @returns {Promise<void>}
    */
    insertWallet(wallet) {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = yield this._pool.getConnection();
            try {
                const [results] = yield connection.execute(`
              INSERT INTO wallets (publicKey, secretKey, solBalance, wSolBalance, walletType)
              VALUES (?, AES_ENCRYPT(?, ?), ?, ?, ?)
          `, [wallet.publicKey, wallet.secretKey, this._encryptionKey, wallet.solBalance, wallet.wSolBalance, wallet.walletType]);
                logger_1.default.info("Wallet inserted successfully");
            }
            catch (error) {
                logger_1.default.info('Error inserting wallet:', error);
            }
            finally {
                connection.release();
            }
        });
    }
    /**
    * Deletes a wallet in the DB
    * @async
    * @function deleteWallet
    * @param {string} publicKey - The publicKey of the wallet to be deleted
    * @returns {Promise<void>}
    */
    deleteWallet(publicKey) {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = yield this._pool.getConnection();
            try {
                const [results] = yield connection.execute(`
          DELETE FROM wallets
          WHERE publicKey = ?
        `, [publicKey]);
                console.log('Wallet deleted successfully:', results);
            }
            catch (error) {
                console.error('Error deleting wallet:', error);
            }
            finally {
                connection.release();
            }
        });
    }
    /**
    * Deletes a wallet in the DB by Id
    * @async
    * @function deleteWallet
    * @param {string} walletId - The publicKey of the wallet to be deleted
    * @returns {Promise<void>}
    */
    deleteWalletById(walletId) {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = yield this._pool.getConnection();
            try {
                const [results] = yield connection.execute(`
            DELETE FROM wallets
            WHERE walletId = ?
          `, [walletId]);
                console.log('Wallet deleted successfully:', results);
            }
            catch (error) {
                console.error('Error deleting wallet:', error);
            }
            finally {
                connection.release();
            }
        });
    }
    /**
    * Modifies a wallet stored in the db
    * @async
    * @function modifyWallet
    * @param {number} walletId - the Wallet id
    * @param {Partial<Wallet>} updates - the fields of the wallet to be updated
    * @returns {Promise<void>}
    */
    modifyWallet(walletId, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = yield this._pool.getConnection();
            try {
                const updateKeys = Object.keys(updates);
                const updateValues = Object.values(updates);
                const updateSetters = updateKeys.map((key, index) => key === 'secretKey' ? `${key} = AES_ENCRYPT(?, '${this._encryptionKey}')` : `${key} = ?`).join(', ');
                const [results] = yield connection.execute(`
              UPDATE wallets
              SET ${updateSetters}
              WHERE walletId = ?
          `, [...updateValues, walletId]);
                console.log('Wallet updated successfully:', results);
            }
            catch (error) {
                console.error('Error updating wallet:', error);
            }
            finally {
                connection.release();
            }
        });
    }
    modifyWalletsInRange(fromWalletId, toWalletId, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = yield this._pool.getConnection();
            try {
                const updateKeys = Object.keys(updates);
                const updateValues = Object.values(updates);
                const updateSetters = updateKeys.map((key, index) => key === 'secretKey' ? `${key} = AES_ENCRYPT(?, '${this._encryptionKey}')` : `${key} = ?`).join(', ');
                const query = `
                UPDATE wallets
                SET ${updateSetters}
                WHERE walletId BETWEEN ? AND ?
            `;
                const [results] = yield connection.execute(query, [...updateValues, fromWalletId, toWalletId]);
                console.log('Wallets updated successfully: ', results);
            }
            catch (error) {
                console.error('Error updating wallets: ', error);
            }
            finally {
                connection.release();
            }
        });
    }
    updateDatabase(wallets_1) {
        return __awaiter(this, arguments, void 0, function* (wallets, batchSize = 1000) {
            const connection = yield this._pool.getConnection();
            try {
                // Split wallets into batches
                for (let i = 0; i < wallets.length; i += batchSize) {
                    const batch = wallets.slice(i, i + batchSize);
                    // Build the query for this batch
                    const updateQueries = batch.map(wallet => {
                        const updateKeys = ['solBalance', 'wSolBalance', 'walletType']; // Add any other fields to be updated
                        const updateSetters = updateKeys.map(key => key === 'secretKey'
                            ? `${key} = AES_ENCRYPT(?, '${this._encryptionKey}')`
                            : `${key} = ?`).join(', ');
                        return {
                            query: `
                            UPDATE wallets
                            SET ${updateSetters}
                            WHERE walletId = ?
                        `,
                            params: [...updateKeys.map(key => wallet[key]), wallet.walletId]
                        };
                    });
                    // Execute all queries in this batch
                    yield Promise.all(updateQueries.map((_a) => __awaiter(this, [_a], void 0, function* ({ query, params }) {
                        yield connection.execute(query, params);
                    })));
                }
                console.log('All wallets updated successfully');
            }
            catch (error) {
                console.error('Error updating wallets:', error);
            }
            finally {
                connection.release();
            }
        });
    }
    getWalletById(walletId) {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = yield this._pool.getConnection();
            try {
                const [rows] = yield connection.execute(`
              SELECT publicKey, AES_DECRYPT(secretKey, ?) AS secretKey, solBalance, wSolBalance, walletType
              FROM wallets
              WHERE walletId = ?
          `, [this._encryptionKey, walletId]);
                if (rows.length > 0) {
                    const row = rows[0];
                    return {
                        walletId: row.walletId,
                        publicKey: row.publicKey,
                        secretKey: row.secretKey.toString(), // Convert Buffer to string
                        solBalance: row.solBalance,
                        wSolBalance: row.wSolBalance,
                        walletType: row.walletType
                    };
                }
                else {
                    return null;
                }
            }
            catch (error) {
                console.error('Error retrieving wallet:', error);
                return null;
            }
            finally {
                connection.release();
            }
        });
    }
    getWalletByPublicKey(publicKey) {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = yield this._pool.getConnection();
            try {
                // Execute the SELECT query to retrieve the wallet by public key
                console.log("wtf", this._encryptionKey);
                const [rows] = yield connection.execute(`
              SELECT walletId, publicKey, AES_DECRYPT(secretKey, ?) AS secretKey, solBalance, wSolBalance, walletType
              FROM wallets
              WHERE publicKey = ?
            `, [this._encryptionKey, publicKey]);
                // Check if the wallet was found
                if (rows[0] != null) {
                    console.log("wallet found");
                    const walletInfo = rows[0];
                    console.log(walletInfo);
                    const foundWallet = new wallet_1.Wallet(walletInfo.walletId, walletInfo.publicKey, walletInfo.secretKey.toString(), walletInfo.solBalance, walletInfo.wSolBalance, walletInfo.walletType);
                    return foundWallet;
                }
                else {
                    console.log("wallet not found");
                    return null; // No wallet found with the given public key
                }
            }
            catch (error) {
                console.error('Error executing query:', error);
                throw error;
            }
            finally {
                // Close the database connection
                yield connection.release();
            }
        });
    }
    updateSolBalanceOfWallet(publicKey, updatedSolBalance) {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = yield this._pool.getConnection();
            const [result] = yield connection.execute('UPDATE wallets SET solBalance = ? WHERE publicKey = ?', [updatedSolBalance, publicKey]);
            if (result[0] == null) {
                console.log('Wallet not found');
            }
            else {
                console.log('Wallet updated successfully');
            }
        });
    }
    getAllWallets() {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = yield this._pool.getConnection();
            try {
                const [rows] = yield connection.execute(`
              SELECT walletId, publicKey, AES_DECRYPT(secretKey, ?) AS secretKey, solBalance, wSolBalance, walletType
              FROM wallets
          `, [this._encryptionKey]);
                const wallets = rows.map((row) => ({
                    walletId: row.walletId,
                    publicKey: row.publicKey,
                    secretKey: row.secretKey.toString(), // Convert Buffer to string
                    solBalance: row.solBalance,
                    wSolBalance: row.wSolBalance,
                    walletType: row.walletType
                }));
                return wallets;
            }
            catch (error) {
                console.error('Error retrieving wallets:', error);
                return [];
            }
            finally {
                connection.release();
            }
        });
    }
    getWalletsInRange(startId, endId) {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = yield this._pool.getConnection();
            try {
                const [rows] = yield connection.execute(`
              SELECT walletId, publicKey, AES_DECRYPT(secretKey, ?) AS secretKey, solBalance, wSolBalance, walletType
              FROM wallets
              WHERE walletId BETWEEN ? AND ?
          `, [this._encryptionKey, startId, endId]);
                const wallets = rows.map((row) => ({
                    walletId: row.walletId,
                    publicKey: row.publicKey,
                    secretKey: row.secretKey.toString(), // Convert Buffer to string
                    solBalance: row.solBalance,
                    wSolBalance: row.wSolBalance,
                    walletType: row.walletType
                }));
                return wallets;
            }
            catch (error) {
                console.error('Error retrieving wallets:', error);
                return [];
            }
            finally {
                connection.release();
            }
        });
    }
    updateDbWithQuery(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = yield this._pool.getConnection();
            try {
                const [results] = yield connection.execute(query);
                logger_1.default.info("Db updated successfully");
            }
            catch (error) {
                logger_1.default.error("Error updating DB: ", error);
            }
        });
    }
    updateDbWithDbObj(dbUpdateObjs) {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = yield this._pool.getConnection();
            try {
                for (const x of dbUpdateObjs) {
                    const pubKey = x.pubKey;
                    const lamports = x.accountInfo.lamports;
                    const query = `UPDATE wallets SET solBalance = ? WHERE publicKey = ?`;
                    const [result] = yield connection.execute(query, [lamports, pubKey]);
                }
                logger_1.default.info("Db updated successfully");
            }
            catch (error) {
                logger_1.default.error("Error updating DB: ", error);
            }
        });
    }
    // ONE TIME USE
    createWalletsTable() {
        return __awaiter(this, void 0, void 0, function* () {
            const dbConnection = yield this._pool.getConnection();
            try {
                const [results] = yield dbConnection.execute(`
              CREATE TABLE wallets (
                  walletId INT AUTO_INCREMENT PRIMARY KEY,
                  publicKey VARCHAR(255),
                  secretKey VARBINARY(255),
                  solBalance FLOAT,
                  wSolBalance FLOAT,
                  walletType ENUM('admin', 'hodl', 'volSmall', 'volLarge') NOT NULL,
                  UNIQUE INDEX unique_walletId (walletId)
              )
          `);
                console.log('Wallets table created successfully');
            }
            catch (error) {
                console.error('Error creating wallets table:', error);
            }
            finally {
                dbConnection.release();
            }
        });
    }
}
exports.DBHandler = DBHandler;
//# sourceMappingURL=dbHandler.js.map