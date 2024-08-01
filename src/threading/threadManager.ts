import cluster from 'cluster';
import os from 'os';
import logger from "../helpers/logger";
import path from 'path';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { Keypair } from '@solana/web3.js';
import { log } from 'winston';

// 


class threadManager {
    private wallets: Keypair[];
    private tokenAddress: string;
    private solPerOrder: number;
    private workers: Worker[];
  
    constructor(wallets: Keypair[], tokenAddress: string, solPerOrder: number) {
      this.wallets = wallets;
      this.tokenAddress = tokenAddress;
      this.solPerOrder = solPerOrder;
      this.workers = [];
    }
  
    createWorker(walletSubset: any[]) {
      const worker = new Worker(path.resolve(__dirname, './threadWorker.ts'), {
        workerData: {
          wallets: walletSubset,
          tokenAddress: this.tokenAddress,
          solPerOrder: this.solPerOrder
        }
      });
  
      worker.on('message', (message) => {
        logger.info(`Worker message: ${message}`);
        if (message === 'done') {
          worker.terminate();
        }
      });
  
      worker.on('error', (error) => {
        console.error(`Worker error: ${error.message}`);
      });
  
      worker.on('exit', (code) => {
        if (code !== 0) {
          console.error(`Worker stopped with exit code ${code}`);
        }
      });
  
      this.workers.push(worker);
    }
  
    async start() {
      const walletChunks = this.chunkWallets(this.wallets, Math.ceil(this.wallets.length / 10)); // Adjust the chunk size as needed
  
      for (const walletSubset of walletChunks) {
        this.createWorker(walletSubset);
      }
    }
  
    chunkWallets(wallets: any[], chunkSize: number): any[][] {
      const chunks: any[][] = [];
      for (let i = 0; i < wallets.length; i += chunkSize) {
        chunks.push(wallets.slice(i, i + chunkSize));
      }
      return chunks;
    }
  }