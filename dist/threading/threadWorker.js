var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const { parentPort, workerData } = require('worker_threads');
const { swapForVolume } = require('../../Pool/swap.js');
const { checkTx } = require('../../helpers/util');
const wallets = workerData.wallets;
const tokenAddress = workerData.tokenAddress;
const solPerOrder = workerData.solPerOrder;
function error_handling(signature, confirmed) {
    return __awaiter(this, void 0, void 0, function* () {
        if (confirmed) {
            parentPort.postMessage(`Transaction confirmed: https://solscan.io/tx/${signature}?cluster=mainnet`);
            return;
        }
        const response = yield checkTx(signature);
        if (response) {
            parentPort.postMessage(`Transaction confirmed: https://solscan.io/tx/${signature}?cluster=mainnet`);
        }
        else {
            parentPort.postMessage("Transaction failed. Retrying...");
        }
    });
}
function processWallet(wallet) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { confirmed, signature } = yield swapForVolume(wallet, tokenAddress, solPerOrder);
            yield error_handling(signature, confirmed);
        }
        catch (e) {
            parentPort.postMessage(`Error: ${e.message}. Retrying...`);
            yield new Promise(resolve => setTimeout(resolve, 2000));
            yield processWallet(wallet); // Retry on error
        }
    });
}
parentPort.on('message', (message) => __awaiter(this, void 0, void 0, function* () {
    console.log("GOT TO TEST!");
    yield testMessageAsync(message);
}));
function testMessageAsync(message) {
    return __awaiter(this, void 0, void 0, function* () {
        // simulate async operation
        yield new Promise(resolve => setTimeout(resolve, 1000));
        console.log(`Received message from parent:`, message);
    });
}
testMessageAsync("test");
//# sourceMappingURL=threadWorker.js.map