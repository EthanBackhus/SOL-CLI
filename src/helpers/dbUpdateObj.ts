import { PublicKey, AccountInfo } from "@solana/web3.js";


export class DbUpdateObj {
    public pubKey: PublicKey;
    public accountInfo: AccountInfo<Buffer>;

    constructor(pubKey?: PublicKey, accountInfo?: AccountInfo<Buffer>) {
        this.pubKey = pubKey;
        this.accountInfo = accountInfo;
    }
}