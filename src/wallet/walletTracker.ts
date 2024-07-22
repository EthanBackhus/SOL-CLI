const web3 = require("@solana/web3.js");
const { connection, wallet } = require("../helpers/config.js");
const MAINNET_ENDPOINT = "https://mainnet.helius-rpc.com/?api-key=55880525-0d01-49ef-86bb-33c733a6e4a6";
const websocketEndpoint = "wss://mainnet.helius-rpc.com/?api-key=55880525-0d01-49ef-86bb-33c733a6e4a6";
let counter = 0;

(async () => {
    const publicKey = wallet.publicKey;

    const solConnection = new web3.Connection(MAINNET_ENDPOINT, {wsEndpoint: websocketEndpoint});

    solConnection.onAccountChange(
        publicKey,
        handleAccountChange,
        "confirmed"
      );
})();

function handleAccountChange(updatedAccountInfo, context) 
{
    //console.log("Updated account info: ", updatedAccountInfo)
    var walletData = Buffer.from(updatedAccountInfo.data, 'base64');
    //var pubKey = Buffer.from(updatedAccountInfo.owner, 'base64');
    console.log("Wallet Data: ", walletData);
    console.log("Public key: ", updatedAccountInfo.owner.toString());
    counter += 1;
    console.log("Number of transactions recorded: ", counter);
}
