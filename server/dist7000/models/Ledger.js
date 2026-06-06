"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ledger = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const LedgerSchema = new mongoose_1.Schema({
    walletId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Wallet', required: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    transactionId: { type: mongoose_1.Schema.Types.Mixed, required: true },
    reference: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['CREDIT', 'DEBIT'], required: true },
    purpose: { type: String, required: true },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
}, { timestamps: true });
// Prevent updating
LedgerSchema.pre('save', function (next) {
    if (!this.isNew) {
        return next(new Error('Ledger entries are immutable and cannot be updated'));
    }
    next();
});
// Prevent deleting
LedgerSchema.pre('deleteOne', { document: true, query: false }, function (next) {
    next(new Error('Ledger entries cannot be deleted'));
});
LedgerSchema.pre('findOneAndDelete', function (next) {
    next(new Error('Ledger entries cannot be deleted'));
});
LedgerSchema.index({ userId: 1, createdAt: -1 });
LedgerSchema.index({ reference: 1 });
exports.Ledger = mongoose_1.default.model('Ledger', LedgerSchema);
exports.default = exports.Ledger;
//# sourceMappingURL=Ledger.js.map