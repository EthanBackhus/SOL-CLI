import { Worker } from 'worker_threads';
import path from 'path';
import { Wallet } from '../wallet/wallet';
import { Keypair } from '@solana/web3.js';
import logger from "../helpers/logger.js";
import getPoolIdByPair from '../Pool/query_pool';

interface WorkerData
{
  CA: string;
  solPerOrder: number;
  walletKeypair: Keypair;
  poolIdPair: string;
}

export class ThreadManager
{
  private maxThreads: number;
  private idleThreads: Worker[];
  public walletKeypairs: Keypair[];
  public CA: string;
  public solBuyPerOrder: number;
  public poolIdPair: string;

  constructor(walletKeypairs: Keypair[], solBuyPerOrder: number, CA: string) {
    this.maxThreads = 10;
    this.idleThreads = [];

    this.walletKeypairs = walletKeypairs;
    this.CA = CA;
    this.solBuyPerOrder = solBuyPerOrder;
  }

  async initialize(): Promise<void> {
    var targetPool = await getPoolIdByPair(this.CA);   // THIS MIGHT BE ABLE TO BE AUTOMATED, INVESTIGATE

    if (targetPool === null)
    {
      logger.info("Pool not found or raydium is not supported for this token. Exiting...");
      throw new Error("Pool not found or raydium is not supported for this token. Exiting...");
    }
    this.poolIdPair = targetPool;
  }

  async createWorker(data: WorkerData): Promise<any> {

    return new Promise((resolve, reject) => {
      const workerPath = path.join(__dirname, 'volSwapThread.js'); // Replace with your worker script path

      const worker = new Worker(workerPath, { workerData: data });

      worker.on('message', (result) => {
        console.log("worker message!");
        resolve(result);
      });

      worker.on('error', (error) => {
        reject(error);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });

      this.idleThreads.push(worker);
    });
  }

  async runTask(data: WorkerData): Promise<any> {
    console.log("running task...");
    if (this.idleThreads.length > 0) 
    {
      const worker = this.idleThreads.pop()!;
      worker.postMessage(data);
      return new Promise((resolve, reject) => {
        worker.once('message', (result) => {
          this.idleThreads.push(worker);
          resolve(result);
        });
        worker.once('error', reject);
      });
    } else {
      // Create a new worker if there are no idle threads
      return this.createWorker(data);
    }
  }



}


