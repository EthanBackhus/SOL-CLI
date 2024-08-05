import { Worker } from 'worker_threads';
import path from 'path';

interface WorkerData {
  tokenAddress: string;
  solPerOrder: number;
  
}

class ThreadManager {
  private maxThreads: number;
  private idleThreads: Worker[];

  constructor(maxThreads: number) {
    this.maxThreads = maxThreads;
    this.idleThreads = [];
  }

  async createWorker(data: WorkerData): Promise<any> {

    return new Promise((resolve, reject) => {
      const workerPath = path.join(__dirname, 'threadWorker.js'); // Replace with your worker script path

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


