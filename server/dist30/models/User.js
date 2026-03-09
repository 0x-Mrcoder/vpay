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
exports.User = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const UserSchema = new mongoose_1.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    passwordHash: {
        type: String,
        required: true,
    },
    firstName: {
        type: String,
        required: true,
        trim: true,
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
    },
    fullName: {
        type: String,
        trim: true,
    },
    phone: {
        type: String,
        required: true,
        trim: true,
    },
    // KYC Fields
    bvn: {
        type: String,
        trim: true,
    },
    nin: {
        type: String,
        trim: true,
    },
    identityType: {
        type: String,
        trim: true,
    },
    idCardPath: {
        type: String,
    },
    selfiePath: {
        type: String,
    },
    state: {
        type: String,
        trim: true,
    },
    lga: {
        type: String,
        trim: true,
    },
    address: {
        type: String,
        trim: true,
    },
    // Business Fields
    businessName: {
        type: String,
        trim: true,
    },
    businessAddress: {
        type: String,
        trim: true,
    },
    businessPhone: {
        type: String,
        trim: true,
    },
    rcNumber: {
        type: String,
        trim: true,
    },
    cacDocumentPath: {
        type: String,
    },
    verificationToken: {
        type: String,
    },
    apiKey: {
        type: String,
        unique: true,
        sparse: true,
    },
    webhookUrl: {
        type: String,
        trim: true,
    },
    kycLevel: {
        type: Number,
        default: 0,
        min: 0,
        max: 3,
    },
    kyc_status: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending',
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
    status: {
        type: String,
        enum: ['active', 'suspended', 'pending'],
        default: 'pending',
    },
    savedBankDetails: {
        bankCode: String,
        bankName: String,
        accountNumber: String,
        accountName: String,
    },
    payoutAccounts: [
        {
            bankCode: String,
            bankName: String,
            accountNumber: String,
            accountName: String,
            isPrimary: { type: Boolean, default: false },
        },
    ],
}, {
    timestamps: true,
});
// Index for faster queries (email index is implicit from unique: true)
UserSchema.index({ phone: 1 });
UserSchema.index({ verificationToken: 1 });
exports.User = mongoose_1.default.model('User', UserSchema);
exports.default = exports.User;
//# sourceMappingURL=User.js.map