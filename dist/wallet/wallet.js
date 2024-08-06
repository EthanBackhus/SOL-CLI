"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Wallet = exports.WalletType = void 0;
var WalletType;
(function (WalletType) {
    WalletType["Admin"] = "admin";
    WalletType["Hodl"] = "hodl";
    WalletType["volSmall"] = "volSmall";
    WalletType["volLarge"] = "volLarge";
})(WalletType || (exports.WalletType = WalletType = {}));
class Wallet {
    constructor(walletId, publicKey, secretKey, solBalance, wSolBalance, walletType) {
        this.walletId = walletId;
        this.publicKey = publicKey;
        this.secretKey = secretKey;
        this.solBalance = solBalance;
        this.wSolBalance = wSolBalance;
        this.walletType = walletType;
    }
}
exports.Wallet = Wallet;
//# sourceMappingURL=wallet.js.map