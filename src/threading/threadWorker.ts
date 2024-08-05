/*
const { parentPort, workerData } = require('worker_threads');
const { swapForVolume } = require('../../Pool/swap.js');
const { checkTx } = require('../../helpers/util');
import {ThreadManager } from "./threadManager";

const wallets = workerData.wallets;
const tokenAddress = workerData.tokenAddress;
const solPerOrder = workerData.solPerOrder;


async function error_handling(signature, confirmed) {
  if (confirmed) {
    parentPort.postMessage(`Transaction confirmed: https://solscan.io/tx/${signature}?cluster=mainnet`);
    return;
  }
  const response = await checkTx(signature);
  if (response) {
    parentPort.postMessage(`Transaction confirmed: https://solscan.io/tx/${signature}?cluster=mainnet`);
  } else {
    parentPort.postMessage("Transaction failed. Retrying...");
  }
}

async function processWallet(wallet) {
  try {
    const { confirmed, signature } = await swapForVolume(wallet, tokenAddress, solPerOrder);
    await error_handling(signature, confirmed);
  } catch (e) {
    parentPort.postMessage(`Error: ${e.message}. Retrying...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    await processWallet(wallet);  // Retry on error
  }
}


parentPort.on('message', async (message) => {
  console.log("GOT TO TEST!");
  await testMessageAsync(message)
});


async function testMessageAsync(message: any) {
  // simulate async operation
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log(`Received message from parent:`, message);
}


const tm = new ThreadManager();

async function myTask() {
  // Simulate some long-running task
  await new Promise(resolve => setTimeout(resolve, 1000));
  return 'Task completed';
}

async function main() {

  await tm.startWorkers(4, myTask);
  console.log('All workers started');

  // ... do other work

  await tm.stopWorkers();
  console.log('All workers stopped');
}


main();
*/


