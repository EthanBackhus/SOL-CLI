import cluster from 'cluster';
import os from 'os';
import logger from "../helpers/logger";
import path from 'path';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { Keypair } from '@solana/web3.js';
import { log } from 'winston';
import {Wallet} from "../wallet/wallet";

// 

interface WorkerData {
  task: string; // Name of the task to execute
  data?: any; // Optional data for the task
}

export class ThreadManager {
  private workers: Worker[] = [];

  constructor(){
    
  }

  async createWorker(task: string, data?: any) {
    const worker = new Worker(path.join(__dirname, 'threadWorker.js'), { workerData: { task, data } });
    this.workers.push(worker);

    return new Promise((resolve, reject) => {
      worker.once('message', (result) => {
        resolve(result);
      });

      worker.once('error', (error) => {
        reject(error);
      });
    });
  }

}
/*
if (!isMainThread) {
  const { task } = workerData as WorkerData;
  task().then(result => parentPort?.postMessage(result));
}
*/

async function myTask() {
  // Simulate some long-running task
  await new Promise(resolve => setTimeout(resolve, 1000));
  return 'Task completed';
}


var tm = new ThreadManager();



//tm.createWorkers(4);






/*
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
    */