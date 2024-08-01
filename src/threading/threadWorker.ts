const { parentPort, workerData } = require('worker_threads');
const { swapForVolume } = require('../../Pool/swap.js');
const { checkTx } = require('../../helpers/util');

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

(async () => {
  for (const wallet of wallets) {
    await processWallet(wallet);
  }
  parentPort.postMessage('done');
})();
