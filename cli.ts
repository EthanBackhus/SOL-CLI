import  readline from 'readline';
import { WalletManager } from "./src/wallet/WalletManager";
import logger from "./src/helpers/logger";
import { ADMIN_WALLET_PUBLIC_KEY, ADMIN_WALLET_SECRET_KEY, ADMIN_WALLET_SECRET_KEY_ENCODED, wallet } from './src/helpers/config';
const {PASSWORD, ENCRYPTION_KEY} = require("./src/helpers/config.js");
const { program } = require("commander");
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

const AVG_SOL_TX_FEE: number = 0.00015;


class CLI {
  private rl: readline.Interface;
  private active: boolean;
  private walletManager: WalletManager;
  private password: string;
  private isAuthenticated: boolean;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // properties
    this.active = true;
    this.walletManager = new WalletManager(ENCRYPTION_KEY);

    // Set the custom prompt
    this.rl.setPrompt('cli > ');

    //set declarations
    this.rl.on('line', (input) => this.handleInput(input));
    this.rl.on('close', () => this.handleClose());
  }

  private async handleInput(input: string): Promise<void> {
    const [command, ...args] = input.trim().split(' ');
    const commandToLower = command.toLowerCase();

    switch (commandToLower) {
      case 'exit':
        this.active = false;
        this.rl.close();
        break;

      case 'help':
        this.help();
        break;
        
      case 'showwallets':
        this.showWallets();
        break;

      case 'generatewallets':
        await this.generateWallets(args);
        break;
      //case 'changewallettype':
      //  await this.
      
      case 'showadminwallet':
        await this.showAdminWallet();
        break;

      case 'fundallwallets':
        await this.fundAllWallets(args);
        break;

      case 'changewallettype':
        await this.changeWalletType();
        break;

      case 'getrentcost':
        await this.getRentCost();
        break;

      case 'updatedbwithsolbalances':
        await this.updateDbWithSolBalances();
        break;

      default:
        console.log('Unknown command:', command);
        break;
    }

    if (this.active) {
      this.rl.prompt();
    }
  }

  // COMMANDS:
  public showWallets(): void {
    console.log("\t| \tPublicKey\t\t\t\t| Secret Key | SolBalance (Lamports) | wSolBalance | walletType ");
    this.walletManager.wallets.forEach(x => {
      console.log(`${x.walletId.toString()}\t| ${x.publicKey} \t| *** | ${x.solBalance} \t| ${x.wSolBalance} \t| ${x.walletType}`);
    });
  }

  public async generateWallets(args: string[]): Promise<void> {
    const walletsToGen = parseInt(args[0]);
    if(isNaN(walletsToGen) || walletsToGen <= 0){
      console.log("Invalid number of wallets specified.");
      return;
    }
    logger.info(`Generating ${walletsToGen} wallets`);
    await this.walletManager.generateNewWallets(walletsToGen);
  }

  public async showAdminWallet(): Promise<void> {
    console.log(`Admin Wallet PublicKey: ${this.walletManager.adminWallet.publicKey}, solBalance: ${this.walletManager.adminWallet.solBalance}, wSolBalance:${this.walletManager.adminWallet.wSolBalance}`);
  }

  public async changeWalletType(args?: string[]): Promise<void> {
    
  }

  public async fundAllWallets(args: string[]): Promise<void> {
    const numSolToSend = parseFloat(args[0]);
    if(isNaN(numSolToSend) || numSolToSend <= 0){
      console.log("Invalid number of sol to send");
      return;
    }
    logger.info(`Admin wallet has ${this.walletManager.adminWallet.solBalance} sol (lamports)`);
    const totalCost = (this.walletManager.wallets.length) * numSolToSend * LAMPORTS_PER_SOL;
    const totalCostWithTxFees = (this.walletManager.wallets.length * AVG_SOL_TX_FEE * LAMPORTS_PER_SOL) + totalCost;
    logger.info(`Total cost of the operation is ${totalCost}, with Tx Fees is estimated to be ${totalCostWithTxFees}`);

    if(totalCostWithTxFees >= this.walletManager.adminWallet.solBalance) {
      logger.info("There is (probably) not enough sol to complete transaction. Exiting...");
    }

    await this.walletManager.transferSOLToAllWallets(ADMIN_WALLET_SECRET_KEY_ENCODED as string, numSolToSend); // use type assertion
  }

  public async getRentCost(): Promise<void> {
    const pubKey = new PublicKey(this.walletManager.adminWallet.publicKey);
    const accountInfo = await this.walletManager.connection.getAccountInfo(pubKey);
    const dataSize = accountInfo?.data.length;
    console.log(`Datasize: ${dataSize}`);
    const minBalance = await this.walletManager.connection.getMinimumBalanceForRentExemption(dataSize as number);
    console.log(`Rent exempt num sol: ${minBalance}`);
  }

  public async updateDbWithSolBalances(): Promise<void> {
    await this.walletManager.updateEntireDbWithSolBalances();
  }

  // END COMMANDS

  private async handleClose(): Promise<void> {
    await this.walletManager.updateEntireDbWithSolBalances();
    logger.info("Now closing. Database Synced");
    this.cleanup();
  }

  public async start(): Promise<void> {
    await this.walletManager.initialize();
    logger.info("WalletManager initialized");
    await this.promptForPassword();
    this.rl.prompt();
  }

  private async cleanup(): Promise<void> {
    logger.info("handling cleanup...");
    process.exit(0);
  }

  private async promptForPassword(): Promise<void> {
    const expectedPassword = PASSWORD;
    this.rl.question('Enter password: ', (inputPassword) => {
        if (inputPassword === expectedPassword) {
            this.isAuthenticated = true;
            logger.info('Password correct. Access granted.');
            console.log("CLI starting. type 'help' for a list of commands");
            this.rl.prompt(); // Proceed to the next prompt
        } else {
            logger.error('Password incorrect. Exiting...');
            this.rl.close(); // Exit the application
        }
    });
  }

  private help(): void {
    console.log('Available commands:');
    for (const command in commands) {
      console.log(`- ${command}: ${commands[command]}`);
    }
  }
}

const commands = {
  "ShowWallets" : "\t\t\tDisplays all wallets",
  "ShowAdminWallet": "\t\t\tShows admin wallet details",
  "GenerateWallets <NumWalletsToGen>": "\t\t\tGenerates wallets and adds them to the database",
  "ChangeWalletType <WalletId> <WalletTypeToChangeToo>": "\t\t\tChanges wallet to type specified",
  "ChangeWalletTypeFromXtoY <WalletId1> <WalletId2> <WalletTypeToChangeToo>": "\t\t\tChanges all wallets from X to Y to walletType specified",
  "FundAllWallets <AmountOfSolToSend>": "\t\t\tSends sol from admin wallet to all the wallets",
  "GetRentCost" : "\t\t\t Gets the hardcoded rent cost",
  "UpdateDbWithSolBalances": "Updates the entire db with sol balances (expensive)"
};

const cli = new CLI();
cli.start();
