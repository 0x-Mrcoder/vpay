"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.helpRoutes = exports.adminRoutes = exports.kycRoutes = exports.payoutRoutes = exports.developerRoutes = exports.webhookRoutes = exports.bankRoutes = exports.transactionRoutes = exports.walletRoutes = exports.virtualAccountRoutes = exports.authRoutes = void 0;
const authRoutes_1 = __importDefault(require("./authRoutes"));
exports.authRoutes = authRoutes_1.default;
const virtualAccountRoutes_1 = __importDefault(require("./virtualAccountRoutes"));
exports.virtualAccountRoutes = virtualAccountRoutes_1.default;
const walletRoutes_1 = __importDefault(require("./walletRoutes"));
exports.walletRoutes = walletRoutes_1.default;
const transactionRoutes_1 = __importDefault(require("./transactionRoutes"));
exports.transactionRoutes = transactionRoutes_1.default;
const bankRoutes_1 = __importDefault(require("./bankRoutes"));
exports.bankRoutes = bankRoutes_1.default;
const webhookRoutes_1 = __importDefault(require("./webhookRoutes"));
exports.webhookRoutes = webhookRoutes_1.default;
const developerRoutes_1 = __importDefault(require("./developerRoutes"));
exports.developerRoutes = developerRoutes_1.default;
const payoutRoutes_1 = __importDefault(require("./payoutRoutes"));
exports.payoutRoutes = payoutRoutes_1.default;
const kycRoutes_1 = __importDefault(require("./kycRoutes"));
exports.kycRoutes = kycRoutes_1.default;
const adminRoutes_1 = __importDefault(require("./adminRoutes"));
exports.adminRoutes = adminRoutes_1.default;
const helpRoutes_1 = __importDefault(require("./helpRoutes"));
exports.helpRoutes = helpRoutes_1.default;
//# sourceMappingURL=index.js.map