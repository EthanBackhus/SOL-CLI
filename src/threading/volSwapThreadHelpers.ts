import logger from "../helpers/logger.js";
import {gql, GraphQLClient} from 'graphql-request';
const graphQLEndpoint = `https://programs.shyft.to/v0/graphql/?api_key=${shyft_api_key}`;
const rpcEndpoint = `https://rpc.shyft.to/?api_key=${shyft_api_key}`;


const graphQLClient = new GraphQLClient(graphQLEndpoint, {
  method: `POST`,
  jsonSerializer: {
    parse: JSON.parse,
    stringify: JSON.stringify,
  },
});


/**
 * Retrieves the pool ID for a given base token.
 * @param {string} baseToken - The base token.
 * @returns {string|null} - The pool ID if found, otherwise null.
*/
export async function getPoolIdByPair(baseToken: string) 
{
  // token/SOL pair
  const quoteToken = "So11111111111111111111111111111111111111112";
  const poolId = await queryLpPair(baseToken, quoteToken);

  if (poolId.Raydium_LiquidityPoolv4.length === 0) 
  {
    logger.info(`Cannot find any liquidity pool related to ${baseToken}/${quoteToken}`);
    logger.info(`It may be a token launched on pump.fun, we try to find ${quoteToken}/${baseToken}`)
    const poolIdByPair = await queryLpPair(quoteToken, baseToken);

    if (poolIdByPair.Raydium_LiquidityPoolv4.length === 0) 
    {
      logger.info(`Cannot find any liquidity pool related to ${quoteToken}/${baseToken}`);
      throw new Error(`Cannot find any liquidity pool related to ${quoteToken}`);
      return null;
    }else{
      return poolIdByPair.Raydium_LiquidityPoolv4[0].pubkey;
    }
    return null;
  }

  return poolId.Raydium_LiquidityPoolv4[0].pubkey;
}


/**
 * Queries the liquidity pool for a given pair of tokens.
 * @param {string} tokenOne - The first token of the pair.
 * @param {string} tokenTwo - The second token of the pair.
 * @returns {Promise<object>} - The response object containing the liquidity pool data.
 */
async function queryLpPair(tokenOne, tokenTwo) {
  const query = gql`
    query MyQuery(
      $where: Raydium_LiquidityPoolv4_bool_exp
      $order_by: [Raydium_LiquidityPoolv4_order_by!]
    ) {
      Raydium_LiquidityPoolv4(where: $where, order_by: $order_by) {
        amountWaveRatio
        baseDecimal
        baseLotSize
        baseMint
        baseNeedTakePnl
        baseTotalPnl
        baseVault
        depth
        lpMint
        lpReserve
        lpVault
        marketId
        marketProgramId
        maxOrder
        maxPriceMultiplier
        minPriceMultiplier
        minSeparateDenominator
        minSeparateNumerator
        minSize
        nonce
        openOrders
        orderbookToInitTime
        owner
        pnlDenominator
        pnlNumerator
        poolOpenTime
        punishCoinAmount
        punishPcAmount
        quoteDecimal
        quoteLotSize
        quoteMint
        quoteNeedTakePnl
        quoteTotalPnl
        quoteVault
        resetFlag
        state
        status
        swapBase2QuoteFee
        swapBaseInAmount
        swapBaseOutAmount
        swapFeeDenominator
        swapFeeNumerator
        swapQuote2BaseFee
        swapQuoteInAmount
        swapQuoteOutAmount
        systemDecimalValue
        targetOrders
        tradeFeeDenominator
        tradeFeeNumerator
        volMaxCutRatio
        withdrawQueue
        pubkey
      }
    }
  `;

  const variables = {
    where: {
      baseMint: {
        _eq: tokenOne,
      },
      quoteMint: {
        _eq: tokenTwo,
      },
    },
    order_by: [
      {
        lpReserve: "desc",
      },
    ],
  };

  const response = await graphQLClient.request(query, variables);
  return response;
}

