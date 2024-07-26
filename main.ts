import { DBHandler } from "./src/database/dbHandler";
import { PublicKey, Keypair } from "@solana/web3.js";
import { Wallet, WalletType} from "./src/wallet/wallet";
import { generateKeypair } from "./src/wallet/walletGenerator";
import { MAINNET_FARM_POOLS } from "@raydium-io/raydium-sdk";
import { WalletManager } from "./src/wallet/WalletManager";
import { wallet } from "./src/helpers/config";
const { program } = require("commander");

let encryptionKey = "";

program
  .option("--encryption_key <ENCRYPTION_KEY>", "Specify the encryptionKey to be used")
  .option("-h, --help", "display help for command")
  .action((options) => {
    if (options.help) {
      console.log("ts-node main --encryption_key <ENCRYPTION_KEY>");
      process.exit(0);
    }
    if (!options.encryption_key) {
      console.error("❌ Missing required options");
      process.exit(1);
    }
    encryptionKey = options.encryption_key;
  });
program.parse();



async function main()
{
    // get walletManager and initialize it
    const walletManager = new WalletManager(encryptionKey);
    await walletManager.initialize();

    // update DB
    //await walletManager.dbHandler.updateDatabase(walletManager.wallets);

    const newPubKey = new PublicKey('5wotKZQU7E64Jj1kGrxfmJoNcunhsfWiqNs6yxnxYkRh');
  
    
    //console.log(info);
}

// const update = { walletType: WalletType.volLarge };




main();