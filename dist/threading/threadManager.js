"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.threadManager = void 0;
const logger_1 = __importDefault(require("../helpers/logger"));
const path_1 = __importDefault(require("path"));
const worker_threads_1 = require("worker_threads");
// 
const filepath = path_1.default.resolve(__dirname, './threadWorker.ts');
console.log(filepath);
class threadManager {
    constructor(wallets, tokenAddress, solPerOrder) {
        this.wallets = wallets;
        this.tokenAddress = tokenAddress;
        this.solPerOrder = solPerOrder;
        this.workers = [];
    }
    createWorkers(numThreadsToGenerate) {
        logger_1.default.info(`Generate ${numThreadsToGenerate} threads...`);
        // generate number of workers specified
        for (let i = 0; i < numThreadsToGenerate; i++) {
            const worker = new worker_threads_1.Worker('./threadWorker.ts', {
                workerData: {
                    tokenAddress: this.tokenAddress,
                    solPerOrder: this.solPerOrder
                }
            });
            worker.on('message', (message) => {
                logger_1.default.info(`Worker message: ${message}`);
                if (message === 'done') {
                    worker.terminate();
                }
            });
            worker.on('error', (error) => {
                logger_1.default.error(`Worker error: ${error.message}`);
            });
            worker.on('exit', (code) => {
                if (code !== 0) {
                    logger_1.default.error(`Worker stopped with exit code ${code}`);
                }
            });
            this.workers.push(worker);
        }
    }
}
exports.threadManager = threadManager;
var tm = new threadManager(null, "test", 0.00001);
tm.createWorkers(4);
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
//# sourceMappingURL=threadManager.js.map