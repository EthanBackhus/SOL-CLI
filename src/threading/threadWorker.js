const { convertCompilerOptionsFromJson } = require('typescript');
const { parentPort, workerData } = require('worker_threads');
const { connection, wallet } = require("../../helpers/config.js");
const { simple_executeAndConfirm,} = require("../../Transactions/simple_tx_executor");
const {jito_executeAndConfirm,} = require("../../Transactions/jito_tips_tx_executor");
const { buy, get_buy_transaction } = require("../dex/raydium/buy_helper");
const { sell, get_sell_transaction } = require("../dex/raydium/sell_helper");
const { program } = require("commander");
const { loadOrCreateKeypair_wallet, checkTx } = require("../../helpers/util");
const {ComputeBudgetProgram,TransactionMessage,VersionedTransaction,} = require("@solana/web3.js");
const { swapForVolume } = require("../../Pool/swap.js");
import logger from "../helpers/logger";



// Simulate a long-running asynchronous operation
async function longRunningTask(data) {
  // Replace with your actual long-running task
  console.log("simulating long running task...");
  for(let i = 0; i < 3; i++)
  {
    console.log(`counter ${i}`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  
  return data * 2;
}


boost_vol_once(workerData)
  .then((result) => {
    parentPort.postMessage(result);
  })
  .catch((error) => {
    parentPort.postMessage({ error });
  });


/**
 * Boosts the volume by buying and selling a token in one transaction.
 * @async
 * @function boost_volume
 * @returns {Promise<void>}
 */
export async function boost_vol_once(data) {
  logger.info(`Boosting volume..., buying and selling ${data.tokenAddress} in one transaction...`);

  try {
    const { confirmed, signature } = await swapForVolume(data.tokenAddress, data.solPerOrder);
    await error_handling(signature, confirmed); // potentially fix???
  } catch (e) {
    logger.info(e);
    logger.info("Trying to send the transaction again...");
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}


/**
 * Boosts the volume by buying and selling a token in one transaction.
 * @async
 * @function boost_volume
 * @returns {Promise<void>}
 */
export async function boost_volume() {
  while (true) {
    console.log(
      `Boosting volume..., buying and selling ${tokenAddress} in one transaction...`
    );
    try {
      const { confirmed, signature } = await swapForVolume(
        tokenAddress,
        solPerOrder
      );
      await error_handling(signature, confirmed);
    } catch (e) {
      console.log(e);
      console.log("trying to send the transaction again...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      continue;
    }
  }
}



/**
 * Handles error for a transaction.
 * @param {string} signature - The transaction signature.
 * @param {boolean} confirmed - Indicates if the transaction is confirmed.
 * @returns {Promise<void>} - A promise that resolves when the error handling is complete.
 */
export async function error_handling(signature, confirmed) {
  if (confirmed) {
    logger.info(`https://solscan.io/tx/${signature}?cluster=mainnet`);
    return;
  }
  const response = await checkTx(signature);
  if (response) {
    logger.info(`https://solscan.io/tx/${signature}?cluster=mainnet`);
  } else {
    logger.info("Transaction failed");
    logger.info("Trying to send the transaction again");
  }
}