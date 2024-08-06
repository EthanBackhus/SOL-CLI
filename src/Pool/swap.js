/*
import assert from "assert";
import { Liquidity, Percent, Token, TOKEN_PROGRAM_ID, TokenAmount } from "@raydium-io/raydium-sdk";
import { PublicKey, TransactionMessage, ComputeBudgetProgram, VersionedTransaction, LAMPORTS_PER_SOL, Keypair } from "@solana/web3.js";
import { Decimal } from "decimal.js";
import { BN } from "@project-serum/anchor";
import { getSPLTokenBalance } from "../helpers/check_balance.js";
import { connection, DEFAULT_TOKEN, makeTxVersion, RAYDIUM_MAINNET_API, _ENDPOINT, wallet, jito_fee } from "../helpers/config.js";
import { getDecimals, getTokenMetadata, checkTx } from "../helpers/util.js";
import { getPoolId, getPoolIdByPair } from "./query_pool.js";
import { getAssociatedTokenAddress, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction, createCloseAccountInstruction } from "@solana/spl-token";
import { mint } from "@metaplex-foundation/mpl-candy-machine";
import { formatAmmKeysById_swap } from "./formatAmmKeysById.js";
import { simple_executeAndConfirm } from "../Transactions/simple_tx_executor.js";
import { jito_executeAndConfirm } from "../Transactions/jito_tips_tx_executor.js";
import logger from "../helpers/logger.js";
*/



const assert = require("assert");
const {  Liquidity, Percent,  Token, TOKEN_PROGRAM_ID,  TokenAmount,} = require("@raydium-io/raydium-sdk");
const { PublicKey, TransactionMessage, ComputeBudgetProgram,VersionedTransaction,LAMPORTS_PER_SOL} = require("@solana/web3.js");
const { Decimal } = require("decimal.js");
const { BN } = require("@project-serum/anchor");
const { getSPLTokenBalance } = require("../helpers/check_balance.js");
const { connection, DEFAULT_TOKEN,makeTxVersion,RAYDIUM_MAINNET_API,_ENDPOINT, wallet, jito_fee} = require("../helpers/config.js");
const { getDecimals,getTokenMetadata,checkTx,} = require("../helpers/util.js");
const { getPoolId, getPoolIdByPair } = require("./query_pool.js");
const {getAssociatedTokenAddress,getAssociatedTokenAddressSync,createAssociatedTokenAccountIdempotentInstruction,createCloseAccountInstruction,} = require("@solana/spl-token");
const { mint } = require("@metaplex-foundation/mpl-candy-machine");
const { formatAmmKeysById_swap } = require("./formatAmmKeysById.js");
const {simple_executeAndConfirm,} = require("../Transactions/simple_tx_executor.js");
const {jito_executeAndConfirm,} = require("../Transactions/jito_tips_tx_executor.js");

let tokenToPoolIdMap = {

};

/**
 * Performs a swap operation using an Automated Market Maker (AMM) pool in Raydium.
 * @param {Object} input - The input parameters for the swap operation.
 * @returns {Object} - The transaction IDs of the executed swap operation.
 */
async function swapOnlyAmm(input) {
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

/**
 * Swaps tokens for volume, buying and selling a token in one transaction.
 * @param {string} tokenAddr - The address of the token to swap.
 * @param {number} sol_per_order - The price of SOL per order.
 * @returns {Promise<{confirmed: boolean, txid: string}>} - The confirmation status and transaction ID.
 */
async function swapForVolume(tokenAddr, sol_per_order, payerKeypair) {
  const buy_instruction = await swap(
    "buy",
    tokenAddr,
    sol_per_order,
    -1,
    payerKeypair,
    "volume"
  );
  const sell_instruction = await swap(
    "sell",
    tokenAddr,
    -1,
    100,
    payerKeypair,
    "volume"
  );
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
  transaction.sign([
    payerKeypair,
    ...buy_instruction.signers,
    ...sell_instruction.signers,
  ]);
  let signature = null,
    confirmed = null;
  try {
    const res = simple_executeAndConfirm(
      transaction,
      payerKeypair,
      latestBlockhash
    );
    signature = res.signature;
    confirmed = res.confirmed;
  } catch (e) {
    console.log(e);
    return { confirmed: confirmed, txid: e.signature };
  }
  return { confirmed: confirmed, txid: signature };
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
 * Performs a swap operation.
 *
 * @param {string} side - The side of the swap operation ("buy" or "sell").
 * @param {string} tokenAddr - The address of the token involved in the swap.
 * @param {number} buy_AmountOfSol - The amount of SOL to buy (only applicable for "buy" side).
 * @param {number} sell_PercentageOfToken - The percentage of the token to sell (only applicable for "sell" side).
 * @param {object} payerWallet - The payer's wallet object.
 * @returns {Promise<void>} - A promise that resolves when the swap operation is completed.
 */
async function swap(side, tokenAddr, buy_AmountOfSol, sell_PercentageOfToken, payerWallet, usage)
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

    let targetPool = null;

    if(!(tokenAddress in tokenToPoolIdMap))
    { 
      targetPool = await getPoolIdByPair(tokenAddress);   // THIS MIGHT BE ABLE TO BE AUTOMATED, INVESTIGATE
      tokenToPoolIdMap[tokenAddress] = targetPool;
    }else targetPool = tokenToPoolIdMap[tokenAddress];

    if (targetPool === null)
    {
      logger.info("Pool not found or raydium is not supported for this token. Exiting...");
      return;
    }

    const amountOfSol = new Decimal(buy_AmountOfSol);
    const inputTokenAmount = new TokenAmount(inputToken, new BN(amountOfSol.mul(10 ** inputToken.decimals).toFixed(0)));


    const slippage = new Percent(3, 100);   // replace with slippage parameter
    const input = {
      outputToken,
      targetPool,
      inputTokenAmount,
      slippage,
      ataIn: quoteAta,
      ataOut: mintAta,
      side,
      usage,
      payerWallet
    };
    if (usage == "volume")
    {
      return await swapOnlyAmm(input);
    }
    swapOnlyAmmHelper(input);
  } else {
    // sell
    const { tokenName, tokenSymbol } = await getTokenMetadata(tokenAddress);
    //console.log("tokenname: ", tokenName, " tokenSymbol: ", tokenSymbol);
    const inputToken = new Token(
      TOKEN_PROGRAM_ID,
      tokenAccount,
      await getDecimals(tokenAccount),
      tokenSymbol,
      tokenName
    );

    const outputToken = DEFAULT_TOKEN.WSOL; // SOL
    const targetPool = await getPoolIdByPair(tokenAddress);

    if (targetPool === null) {
      logger.info("Pool not found or raydium is not supported for this token. Exiting...");
      return;
    }

    const balnaceOfToken = await getSPLTokenBalance(
      connection,
      tokenAccount,
      payerWallet.publicKey
    );

    const percentage = sell_PercentageOfToken / 100;
    const amount = new Decimal(percentage * balnaceOfToken);
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

module.exports = { swap, swapForVolume };
