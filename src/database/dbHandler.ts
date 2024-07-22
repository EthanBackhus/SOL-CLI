import  { generateKeypair } from "../wallet/walletGenerator";
import mysql from 'mysql2/promise';
import { Wallet } from "../wallet/wallet";

export class DBHandler {
    private pool: mysql.Pool;

    constructor() {
        this.pool = mysql.createPool({
            host: 'localhost',
            user: 'ethanbackhus',
            password: 'Skyrim2014$250067862500',
            database: 'ethanbackhus'
        });
    }

    /**
    * Inserts a wallet into the db
    * @async
    * @function insertWallet
    * @param {Wallet} wallet - The wallet to be inserted into the db
    * @returns {Promise<void>}
    */
    async insertWallet(wallet: Wallet): Promise<void> {
      const connection = await this.pool.getConnection();
      try {
        const [results] = await connection.execute(`
          INSERT INTO wallets (publicKey, secretKey, solBalance, wSolBalance)
          VALUES (?, ?, ?, ?)
        `, [wallet.publicKey, wallet.secretKey, wallet.solBalance, wallet.wSolBalance]);
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
      const connection = await this.pool.getConnection();
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
      const connection = await this.pool.getConnection();
      try {
        const updateKeys = Object.keys(updates);
        const updateValues = Object.values(updates);
        const updateSetters = updateKeys.map((key, index) => `${key} = ?`).join(', ');
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
      
    
    async createWalletsTable() {
      const dbConnection = await this.pool.getConnection();
      try {
          const [results] = await dbConnection.execute(`
              CREATE TABLE wallets (
                  walletId INT AUTO_INCREMENT PRIMARY KEY,
                  publicKey VARCHAR(255),
                  secreteKey VARCHAR(255),
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
    
      //async getWalletById(walletId: number): Promise<Wallet | null> {
      //  // Implementation for getting a wallet by ID
      //}
    
      // Other methods as needed
}