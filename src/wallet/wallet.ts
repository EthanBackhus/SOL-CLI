import { Enum } from "@solana/web3.js";

export enum WalletType {
  Admin = "admin",
  Hodl = "hodl",
  volSmall = "volSmall",
  volLarge = "volLarge"

}

export class Wallet {
    public walletId: number;
    public publicKey: string;
    public secretKey: string;
    public solBalance: number;
    public wSolBalance: number;
    public walletType: WalletType;
  
    constructor(walletId: number, publicKey: string, secretKey: string, solBalance: number, wSolBalance: number, walletType: WalletType) {
      this.walletId = walletId;
      this.publicKey = publicKey;
      this.secretKey = secretKey;
      this.solBalance = solBalance;
      this.wSolBalance = wSolBalance;
      this.walletType = walletType
    }
  
    //TODO:
    // deposit & withdraw functions
  }