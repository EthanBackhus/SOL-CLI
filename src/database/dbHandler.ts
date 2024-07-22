import  { generateKeypair } from "../wallet/walletGenerator";
import mysql from 'mysql2/promise';
import { Wallet } from "../wallet/wallet";

export class DBHandler {
    private _pool: mysql.Pool;
    private _encryptionKey: string;

    constructor(encryptionKey: string) {
        this._pool = mysql.createPool({
            host: 'localhost',
            user: 'ethanbackhus',
            password: 'Skyrim2014$250067862500',
            database: 'ethanbackhus'
        });
        this._encryptionKey = encryptionKey;  // passing encryption key in as a object parameter
    }

    /**
    * Inserts a wallet into the db
    * @async
    * @function insertWallet
    * @param {Wallet} wallet - The wallet to be inserted into the db
    * @returns {Promise<void>}
    */
    async insertWallet(wallet: Wallet): Promise<void> {
      const connection = await this._pool.getConnection();
      try {
          const [results] = await connection.execute(`
              INSERT INTO wallets (publicKey, secretKey, solBalance, wSolBalance)
              VALUES (?, AES_ENCRYPT(?, ?), ?, ?)
          `, [wallet.publicKey, wallet.secretKey, this._encryptionKey, wallet.solBalance, wallet.wSolBalance]);
          console.log('Wallet inserted successfully:', results);
      } catch (error) {
          console.error('Error inserting wallet:', error);
      } finally {
          connection.release();
      }
    }

    /**
    * Deletes a wallet in the DB
    * @async
    * @function deleteWallet
    * @param {string} publicKey - The publicKey of the wallet to be deleted
    * @returns {Promise<void>}
    */
    async deleteWallet(publicKey: string): Promise<void> {
      const connection = await this._pool.getConnection();
      try {
        const [results] = await connection.execute(`
          DELETE FROM wallets
          WHERE publicKey = ?
        `, [publicKey]);
        console.log('Wallet deleted successfully:', results);
      } catch (error) {
        console.error('Error deleting wallet:', error);
      } finally {
        connection.release();
      }
    }

    /**
    * Modifies a wallet stored in teh db
    * @async
    * @function modifyWallet
    * @param {number} walletId - the Wallet id
    * @param {Partial<Wallet>} updates - the fields of the wallet to be updated
    * @returns {Promise<void>}
    */
    async modifyWallet(walletId: number, updates: Partial<Wallet>): Promise<void> {
      const connection = await this._pool.getConnection();
      try {
          const updateKeys = Object.keys(updates);
          const updateValues = Object.values(updates);
          const updateSetters = updateKeys.map((key, index) => key === 'secretKey' ? `${key} = AES_ENCRYPT(?, '${this._encryptionKey}')` : `${key} = ?`).join(', ');
          const [results] = await connection.execute(`
              UPDATE wallets
              SET ${updateSetters}
              WHERE walletId = ?
          `, [...updateValues, walletId]);
          console.log('Wallet updated successfully:', results);
      } catch (error) {
          console.error('Error updating wallet:', error);
      } finally {
          connection.release();
      }
    }

    async getWalletById(walletId: number): Promise<Wallet | null> {
      const connection = await this._pool.getConnection();
      try {
          const [rows]: [any[], any] = await connection.execute(`
              SELECT publicKey, AES_DECRYPT(secretKey, ?) AS secretKey, solBalance, wSolBalance
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
              };
          } else {
              return null;
          }
      } catch (error) {
          console.error('Error retrieving wallet:', error);
          return null;
      } finally {
          connection.release();
      }
    }

    async getAllWallets(): Promise<Wallet[]> {
      const connection = await this._pool.getConnection();
      try {
          const [rows]: [any[], any] = await connection.execute(`
              SELECT walletId, publicKey, AES_DECRYPT(secretKey, ?) AS secretKey, solBalance, wSolBalance
              FROM wallets
          `, [this._encryptionKey]);

          const wallets: Wallet[] = rows.map((row: any) => ({
              walletId: row.walletId,
              publicKey: row.publicKey,
              secretKey: row.secretKey.toString(), // Convert Buffer to string
              solBalance: row.solBalance,
              wSolBalance: row.wSolBalance,
          }));

          return wallets;
      } catch (error) {
          console.error('Error retrieving wallets:', error);
          return [];
      } finally {
          connection.release();
      }
    }

    async getWalletsInRange(startId: number, endId: number): Promise<Wallet[]> {
      const connection = await this._pool.getConnection();
      try {
          const [rows]: [any[], any] = await connection.execute(`
              SELECT walletId, publicKey, AES_DECRYPT(secretKey, ?) AS secretKey, solBalance, wSolBalance
              FROM wallets
              WHERE walletId BETWEEN ? AND ?
          `, [this._encryptionKey, startId, endId]);

          const wallets: Wallet[] = rows.map((row: any) => ({
              walletId: row.walletId,
              publicKey: row.publicKey,
              secretKey: row.secretKey.toString(), // Convert Buffer to string
              solBalance: row.solBalance,
              wSolBalance: row.wSolBalance,
          }));

          return wallets;
      } catch (error) {
          console.error('Error retrieving wallets:', error);
          return [];
      } finally {
          connection.release();
      }
    }
      


    async createWalletsTable(): Promise<void> {
      const dbConnection = await this._pool.getConnection();
      try {
          const [results] = await dbConnection.execute(`
              CREATE TABLE wallets (
                  walletId INT AUTO_INCREMENT PRIMARY KEY,
                  publicKey VARCHAR(255),
                  secretKey VARBINARY(255),
                  solBalance FLOAT,
                  wSolBalance FLOAT,
                  UNIQUE INDEX unique_walletId (walletId)
              )
          `);
          console.log('Wallets table created successfully');
      } catch (error) {
          console.error('Error creating wallets table:', error);
      } finally {
          dbConnection.release();
      }
    }

}