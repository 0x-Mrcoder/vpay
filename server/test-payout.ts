import dotenv from 'dotenv';
dotenv.config();
import { palmPayService } from './src/services/PalmPayService';

async function test() {
    try {
        console.log("Fetching Bank List...");
        const banks = await palmPayService.getBankList();
        
        const palmpay = banks.find(b => b.name.toLowerCase().includes('palmpay'));
        const opay = banks.find(b => b.name.toLowerCase().includes('opay'));
        
        console.log("Found Banks:", { palmpay, opay });
        
        if (palmpay) {
            try {
                const res = await palmPayService.resolveBankAccount({ bankCode: palmpay.code, accountNumber: "8100015498" });
                console.log("Resolved PalmPay:", res);
            } catch(e) {
                console.log("PalmPay Error:", e.message);
            }
        }
        
        if (opay) {
            try {
                const res = await palmPayService.resolveBankAccount({ bankCode: opay.code, accountNumber: "8100015498" });
                console.log("Resolved OPay:", res);
            } catch(e) {
                console.log("OPay Error:", e.message);
            }
        }

    } catch(e) {
        console.log("Error:", e.message);
    }
}
test();
