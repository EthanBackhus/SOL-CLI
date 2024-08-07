const {ComputeBudgetProgram, TransactionMessage, VersionedTransaction, PublicKey} = require("@solana/web3.js");
const {Liquidity, Percent, Token, TOKEN_PROGRAM_ID, TokenAmount} = require("@raydium-io/raydium-sdk");

const { parentPort, workerData } = require('worker_threads');
const { connection, wallet } = require("../../helpers/config.js");
const { simple_executeAndConfirm,} = require("../../Transactions/simple_tx_executor");
const {jito_executeAndConfirm,} = require("../../Transactions/jito_tips_tx_executor");
const { buy, get_buy_transaction } = require("../dex/raydium/buy_helper");
const { sell, get_sell_transaction } = require("../dex/raydium/sell_helper");
const { getDecimals,getTokenMetadata,checkTx,} = require("../helpers/util.js");
const { getPoolIdByPair } = require("./query_pool.js");
const { program } = require("commander");
const { loadOrCreateKeypair_wallet, checkTx } = require("../../helpers/util");
const {getAssociatedTokenAddress, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction} = require("@solana/spl-token");
const { Decimal } = require("decimal.js");
const { swapForVolume } = require("../../Pool/swap.js");
import logger from "../helpers/logger.js";


boostVolumeOnce(workerData)
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
export async function boostVolumeOnce(data) 
{
  logger.info(`Boosting volume..., buying and selling ${data.tokenAddress} in one transaction...`);

  try {
    const { confirmed, signature } = await swapForVolume(data.tokenAddress, data.solPerOrder, data.CA, data.poolIdPair);
    await error_handling(signature, confirmed); // potentially fix???
  } catch (e) {
    logger.info(e);
    logger.info("Trying to send the transaction again...");
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

/**
 * Swaps tokens for volume, buying and selling a token in one transaction.
 * @param {string} tokenAddr - The address of the token to swap.
 * @param {number} sol_per_order - The price of SOL per order.
 * @returns {Promise<{confirmed: boolean, txid: string}>} - The confirmation status and transaction ID.
 */
async function swapForVolume(tokenAddr, sol_per_order, payerKeypair, CA, poolIdPair)
{
  const buy_instruction = await swap("buy", tokenAddr, sol_per_order, -1, payerKeypair, "volume");
  const sell_instruction = await swap("sell", tokenAddr, -1, 100, payerKeypair, "volume");
  const latestBlockhash = await connection.getLatestBlockhash();

  const messageV0 = new TransactionMessage({
    payerKey: payerKeypair.publicKey,
    recentBlockhash: latestBlockhash.blockhash,
    instructions: [
      ...[
        ComputeBudgetProgram.setComputeUnitLimit({
          units: 90000,
        }),
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 90000,
        }),
      ],
      ...sell_instruction.instructions,
      ...buy_instruction.instructions,
    ],
  });

  const transaction = new VersionedTransaction(messageV0.compileToV0Message());
  transaction.sign([payerKeypair, ...buy_instruction.signers, ...sell_instruction.signers,]);
  let signature = null,
    confirmed = null;

  try {
    const res = simple_executeAndConfirm(transaction,payerKeypair,latestBlockhash);
    signature = res.signature;
    confirmed = res.confirmed;
  } catch (e) {
    logger.info(e);
    return { confirmed: confirmed, txid: e.signature };
  }
  return { confirmed: confirmed, txid: signature };
}

/**
 * Performs a swap operation.
 * @param {string} side - The side of the swap operation ("buy" or "sell").
 * @param {string} tokenAddr - The address of the token involved in the swap.
 * @param {number} buy_AmountOfSol - The amount of SOL to buy (only applicable for "buy" side).
 * @param {number} sell_PercentageOfToken - The percentage of the token to sell (only applicable for "sell" side).
 * @param {object} payerWallet - The payer's wallet object.
 * @returns {Promise<void>} - A promise that resolves when the swap operation is completed.
 */
async function swap(side, tokenAddr, buy_AmountOfSol, sell_PercentageOfToken, payerWallet, usage, CA, poolIdPair)
{
  const tokenAddress = tokenAddr;
  const tokenAccount = new PublicKey(tokenAddress);
  const mintAta = await getAssociatedTokenAddress(tokenAccount, payerWallet.publicKey);
  const quoteAta = await getAssociatedTokenAddressSync(Token.WSOL.mint, payerWallet.publicKey);

  if (side === "buy") {
    // buy - use sol to swap to the token

    //const { tokenName, tokenSymbol } = await getTokenMetadata(tokenAddress);
    const outputToken = new Token(TOKEN_PROGRAM_ID, tokenAccount, await getDecimals(tokenAccount));
    const inputToken = DEFAULT_TOKEN.WSOL; // SOL
    const amountOfSol = new Decimal(buy_AmountOfSol);
    const inputTokenAmount = new TokenAmount(inputToken, new BN(amountOfSol.mul(10 ** inputToken.decimals).toFixed(0)));
    const slippage = new Percent(3, 100);   // replace with slippage parameter

    const input = {
      outputToken,
      poolIdPair,
      inputTokenAmount,
      slippage,
      ataIn: quoteAta,
      ataOut: mintAta,
      side,
      usage,
      payerWallet
    };

    if (usage == "volume") {
      return await swapOnlyAmm(input);
    }

    swapOnlyAmmHelper(input);
  } else {

    // sell
    const { tokenName, tokenSymbol } = await getTokenMetadata(tokenAddress);
    const inputToken = new Token(TOKEN_PROGRAM_ID, tokenAccount, await getDecimals(tokenAccount), tokenSymbol, tokenName);
    const outputToken = DEFAULT_TOKEN.WSOL; // SOL
    const targetPool = await getPoolIdByPair(tokenAddress);

    if (targetPool === null) {
      logger.info("Pool not found or raydium is not supported for this token. Exiting...");
      return;
    }

    const balanceOfToken = await getSPLTokenBalance(connection, tokenAccount, payerWallet.publicKey);
    const percentage = sell_PercentageOfToken / 100;
    const amount = new Decimal(percentage * balanceOfToken);
    const slippage = new Percent(3, 100);
    const inputTokenAmount = new TokenAmount(inputToken, new BN(amount.mul(10 ** inputToken.decimals).toFixed(0)));

    const input = {
      outputToken,
      sell_PercentageOfToken,
      targetPool,
      inputTokenAmount,
      slippage,
      payerWallet: payerWallet,
      ataIn: mintAta,
      ataOut: quoteAta,
      side,
      usage,
      tokenAddress: tokenAddress
    };
    if (usage == "volume") {
      return await swapOnlyAmm(input);
    }
    swapOnlyAmmHelper(input);
  }
}


/**
 * Performs a swap operation using an Automated Market Maker (AMM) pool in Raydium.
 * @param {Object} input - The input parameters for the swap operation.
 * @returns {Object} - The transaction IDs of the executed swap operation.
 */
async function swapOnlyAmm(input) 
{
  // -------- pre-action: get pool info --------\
  const poolKeys = await formatAmmKeysById_swap(new PublicKey(input.targetPool));
  assert(poolKeys, "cannot find the target pool");
  const poolInfo = await Liquidity.fetchInfo({connection: connection,poolKeys: poolKeys,});

  // -------- step 1: coumpute amount out --------
  const { amountOut, minAmountOut } = Liquidity.computeAmountOut({
    poolKeys: poolKeys,
    poolInfo: poolInfo,
    amountIn: input.inputTokenAmount,
    currencyOut: input.outputToken,
    slippage: input.slippage,
  });

  // -------- step 2: create instructions by SDK function --------
  const { innerTransaction } = await Liquidity.makeSwapFixedInInstruction(
    {
      poolKeys: poolKeys,
      userKeys: {
        tokenAccountIn: input.ataIn,
        tokenAccountOut: input.ataOut,
        owner: input.payerWallet.publicKey,
      },
      amountIn: input.inputTokenAmount.raw,
      minAmountOut: minAmountOut.raw,
    },
    poolKeys.version
  );

  if (input.usage == "volume") return innerTransaction;
  let latestBlockhash = await connection.getLatestBlockhash();
  const messageV0 = new TransactionMessage({
    payerKey: input.payerWallet.publicKey,
    recentBlockhash: latestBlockhash.blockhash,
    instructions: [  
      ...[
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 3052900,
        }),
        ComputeBudgetProgram.setComputeUnitLimit({
          units: 3127500,
        }),
      ],
      ...(input.side === "buy"
        ? [
            createAssociatedTokenAccountIdempotentInstruction(
              input.payerWallet.publicKey,
              input.ataOut,
              input.payerWallet.publicKey,
              input.outputToken.mint
            ),
          ]
        : []),
      ...innerTransaction.instructions,
    ],
  }).compileToV0Message();

  const transaction = new VersionedTransaction(messageV0);
  transaction.sign([input.payerWallet, ...innerTransaction.signers]);
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
      attempts++;
      try {
          const res = await jito_executeAndConfirm(transaction, input.payerWallet, latestBlockhash, jito_fee);
          const signature = res.signature;
          const confirmed = res.confirmed;

          if (signature) {
              return { txid: signature };
          } else {
              logger.info("jito fee transaction failed");
              logger.info(`Retry attempt ${attempts}`);
          }
      } catch (e) {
          logger.info(e);
          if (e.signature) {
              return { txid: e.signature };
          }
      }
      latestBlockhash = await connection.getLatestBlockhash();
  }

  logger.info("Transaction failed after maximum retry attempts");
  return { txid: null };
}

// Promise<ApiPoolInfoV4>
/**
 * Formats AMM keys by ID.
 * @param {string} id - The ID of the AMM.
 * @returns {Object} - The formatted AMM keys.
 * @throws {Error} - If there is an error retrieving the account information.
 */
async function formatAmmKeysById_swap(id) 
{
  const account = await connection.getAccountInfo(id);
  if (account === null) throw Error(" get id info error ");
  const info = LIQUIDITY_STATE_LAYOUT_V4.decode(account.data);

  const marketId = info.marketId;
  const marketAccount_minimal = await connection.getAccountInfo(marketId, {
    commitment: "confirmed",
    dataSlice: {
      offset: MARKET_STATE_LAYOUT_V3.offsetOf("eventQueue"),
      length: 32 * 3,
    },
  });
  
  const marketAccount = await connection.getAccountInfo(marketId);
  if (marketAccount === null || marketAccount_minimal === null)
    throw Error(" get market info error");
  const marketInfo_minimal = MINIMAL_MARKET_STATE_LAYOUT_V3.decode(
    marketAccount_minimal.data
  );
  const marketInfo = MARKET_STATE_LAYOUT_V3.decode(marketAccount.data);
  const lpMint = info.lpMint;
  const lpMintAccount = await connection.getAccountInfo(lpMint);
  if (lpMintAccount === null) throw Error(" get lp mint info error");
  const lpMintInfo = SPL_MINT_LAYOUT.decode(lpMintAccount.data);

  return {
    id,
    baseMint: info.baseMint,
    quoteMint: info.quoteMint,
    lpMint: info.lpMint,
    baseDecimals: info.baseDecimal.toNumber(),
    quoteDecimals: info.quoteDecimal.toNumber(),
    lpDecimals: 5,
    version: 4,
    programId: MAINNET_PROGRAM_ID.AmmV4,
    authority: Liquidity.getAssociatedAuthority({
      programId: MAINNET_PROGRAM_ID.AmmV4,
    }).publicKey,
    openOrders: info.openOrders,
    targetOrders: info.targetOrders,
    baseVault: info.baseVault,
    quoteVault: info.quoteVault,
    marketVersion: 3,
    marketProgramId: info.marketProgramId,
    marketId: info.marketId,
    marketAuthority: Market.getAssociatedAuthority({
      programId: info.marketProgramId,
      marketId: info.marketId,
    }).publicKey,
    marketBaseVault: marketInfo.baseVault,
    marketQuoteVault: marketInfo.quoteVault,
    marketBids: marketInfo_minimal.bids,
    marketAsks: marketInfo_minimal.asks,
    marketEventQueue: marketInfo_minimal.eventQueue,
    withdrawQueue: info.withdrawQueue,
    lpVault: info.lpVault,
    lookupTableAccount: PublicKey.default,
  };
}



/**
 * Performs a swap operation that retries the transaction if it fails.
 *
 * @param {string} side - The side of the swap operation ("buy" or "sell").
 * @param {string} tokenAddr - The address of the token.
 * @param {number} buy_AmountOfSol - The amount of SOL to buy (only applicable for "buy" side).
 * @param {number} sell_PercentageOfToken - The percentage of token to sell (only applicable for "sell" side).
 * @returns {Promise<void>} - A promise that resolves when the swap operation is completed.
 */
async function swapOnlyAmmHelper(input) {
  const { txid } = await swapOnlyAmm(input);
  logger.info("txids:", txid);
  const response = await checkTx(txid);

  if (response) {
    if (input.side === "buy") {
      logger.info(
        `https://dexscreener.com/solana/${input.targetPool}?maker=${payerWallet.publicKey}`
      );
    } else {
      logger.info(
        `https://dexscreener.com/solana/${input.targetPool}?maker=${payerWallet.publicKey}`
      );
    }
    logger.info(`https://solscan.io/tx/${txid}?cluster=mainnet`);
  } else {
    logger.info("Transaction failed");
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



































/*
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

/**
 * Boosts the volume by buying and selling a token in one transaction.
 * @async
 * @function boost_volume
 * @returns {Promise<void>}
 
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
*/