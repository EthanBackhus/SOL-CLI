export class Wallet {
    public walletId: number;
    public publicKey: string;
    public secretKey: string;
    public solBalance: number;
    public wSolBalance: number;
  
    constructor(walletId: number, publicKey: string, secretKey: string, solBalance: number, wSolBalance: number) {
      this.walletId = walletId;
      this.publicKey = publicKey;
      this.secretKey = secretKey;
      this.solBalance = solBalance;
      this.wSolBalance = wSolBalance;
    }
  
    //TODO:
    // deposit & withdraw functions
  }