import  { generateKeypair } from "../wallet/walletGenerator";
import mysql, { OkPacket, ResultSetHeader } from 'mysql2/promise';
import { Wallet } from "../wallet/wallet";
import logger from "../helpers/logger";

export class DBHandler {
    private _pool: mysql.Pool;
    private _encryptionKey: string;

    constructor(encryptionKey: string) {
        this._pool = mysql.createPool({
            host: 'localhost',
            user: 'ethanbackhus',
            password: 'Skyrim2014$250067862500',    // TODO: change this to encryptionKey????
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
              INSERT INTO wallets (publicKey, secretKey, solBalance, wSolBalance, walletType)
              VALUES (?, AES_ENCRYPT(?, ?), ?, ?, ?)
          `, [wallet.publicKey, wallet.secretKey, this._encryptionKey, wallet.solBalance, wallet.wSolBalance, wallet.walletType]);
          logger.info("Wallet inserted successfully");
      } catch (error) {
          logger.info('Error inserting wallet:', error);
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
    * Modifies a wallet stored in the db
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

    async modifyWalletsInRange(fromWalletId: number, toWalletId: number, updates: Partial<Wallet>): Promise<void> {
        const connection = await this._pool.getConnection();
        try{
            const updateKeys = Object.keys(updates);
            const updateValues = Object.values(updates);
            const updateSetters = updateKeys.map((key, index) => 
                key === 'secretKey' ? `${key} = AES_ENCRYPT(?, '${this._encryptionKey}')` : `${key} = ?`
            ).join(', ');

            const query = `
                UPDATE wallets
                SET ${updateSetters}
                WHERE walletId BETWEEN ? AND ?
            `;
            const [results] = await connection.execute(query, [...updateValues, fromWalletId, toWalletId]);
            console.log('Wallets updated successfully: ', results);
        } catch (error) {
            console.error('Error updating wallets: ', error);
        } finally {
            connection.release();
        }
    }

    async updateDatabase(wallets: Wallet[], batchSize: number = 1000): Promise<void> {
        const connection = await this._pool.getConnection();
        try {
            // Split wallets into batches
            for (let i = 0; i < wallets.length; i += batchSize) {
                const batch = wallets.slice(i, i + batchSize);
                
                // Build the query for this batch
                const updateQueries = batch.map(wallet => {
                    const updateKeys = ['solBalance', 'wSolBalance', 'walletType']; // Add any other fields to be updated
                    const updateSetters = updateKeys.map(key => key === 'secretKey' 
                        ? `${key} = AES_ENCRYPT(?, '${this._encryptionKey}')` 
                        : `${key} = ?`
                    ).join(', ');
                    
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
                await Promise.all(updateQueries.map(async ({ query, params }) => {
                    await connection.execute(query, params);
                }));
            }
    
            console.log('All wallets updated successfully');
        } catch (error) {
            console.error('Error updating wallets:', error);
        } finally {
            connection.release();
        }
    }

    async getWalletById(walletId: number): Promise<Wallet | null> {
      const connection = await this._pool.getConnection();
      try {
          const [rows]: [any[], any] = await connection.execute(`
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

    async getWalletByPublicKey(publicKey: string): Promise<Wallet> {
        const connection = await this._pool.getConnection();

        try {
            // Execute the SELECT query to retrieve the wallet by public key
            console.log("wtf", this._encryptionKey);
            const [rows] = await connection.execute(`
              SELECT walletId, publicKey, AES_DECRYPT(secretKey, ?) AS secretKey, solBalance, wSolBalance, walletType
              FROM wallets
              WHERE publicKey = ?
            `, [this._encryptionKey, publicKey]);

            // Check if the wallet was found
            if (rows[0] != null) {  
                console.log("wallet found");
                const walletInfo = rows[0];
                console.log(walletInfo);
                const foundWallet = new Wallet(walletInfo.walletId, walletInfo.publicKey, walletInfo.secretKey.toString(), walletInfo.solBalance, walletInfo.wSolBalance, walletInfo.walletType);
                return foundWallet;
            } else {
                console.log("wallet not found");
                return null; // No wallet found with the given public key
            }
            
        } catch (error) {
            console.error('Error executing query:', error);
            throw error;
        } finally {
            // Close the database connection
            await connection.release();
        }
    }

    async updateSolBalanceOfWallet(publicKey: string, updatedSolBalance: number): Promise<void> {
        const connection = await this._pool.getConnection();
        
        const [result] = await connection.execute(
            'UPDATE wallets SET solBalance = ? WHERE publicKey = ?',
            [updatedSolBalance, publicKey]
          );
        
        if (result[0] == null) {
          console.log('Wallet not found');
        } else {
          console.log('Wallet updated successfully');
        }
    }

    async getAllWallets(): Promise<Wallet[]> {
      const connection = await this._pool.getConnection();
      try {
          const [rows]: [any[], any] = await connection.execute(`
              SELECT walletId, publicKey, AES_DECRYPT(secretKey, ?) AS secretKey, solBalance, wSolBalance, walletType
              FROM wallets
          `, [this._encryptionKey]);

          const wallets: Wallet[] = rows.map((row: any) => ({
              walletId: row.walletId,
              publicKey: row.publicKey,
              secretKey: row.secretKey.toString(), // Convert Buffer to string
              solBalance: row.solBalance,
              wSolBalance: row.wSolBalance,
              walletType: row.walletType
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
              SELECT walletId, publicKey, AES_DECRYPT(secretKey, ?) AS secretKey, solBalance, wSolBalance, walletType
              FROM wallets
              WHERE walletId BETWEEN ? AND ?
          `, [this._encryptionKey, startId, endId]);

          const wallets: Wallet[] = rows.map((row: any) => ({
              walletId: row.walletId,
              publicKey: row.publicKey,
              secretKey: row.secretKey.toString(), // Convert Buffer to string
              solBalance: row.solBalance,
              wSolBalance: row.wSolBalance,
              walletType: row.walletType
          }));

          return wallets;
      } catch (error) {
          console.error('Error retrieving wallets:', error);
          return [];
      } finally {
          connection.release();
      }
    }

    async updateDbWithQuery(query: string): Promise<void> {
        const connection = await this._pool.getConnection();
        try{
            const [results] = await connection.execute(query);
            console.log("Db updated successfully");
        }
        catch(error) {
            console.error("Error updating DB: ", error);
        }
    }

    // ONE TIME USE
      
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
                  walletType ENUM('admin', 'hodl', 'volSmall', 'volLarge') NOT NULL,
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