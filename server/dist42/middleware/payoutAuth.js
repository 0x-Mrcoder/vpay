"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePayoutAuth = void 0;
const crypto_1 = __importDefault(require("crypto"));
const User_1 = __importDefault(require("../models/User"));
const requirePayoutAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const signature = req.headers['x-signature'];
        const timestamp = req.headers['x-timestamp'];
        const idempotencyKey = req.headers['x-idempotency-key'];
        const clientIp = req.socket.remoteAddress || req.ip;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Missing Authorization header containing the Payout Secret Key' });
        }
        if (!signature || !timestamp || !idempotencyKey) {
            return res.status(400).json({ success: false, message: 'Missing required headers: x-signature, x-timestamp, x-idempotency-key' });
        }
        const rawSecret = authHeader.split(' ')[1];
        // 1. Timestamp validation (±5 minutes) to prevent replay attacks
        const requestTime = parseInt(timestamp, 10);
        if (isNaN(requestTime))
            return res.status(400).json({ success: false, message: 'Invalid timestamp format' });
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        if (Math.abs(now - requestTime) > fiveMinutes) {
            return res.status(401).json({ success: false, message: 'Request timestamp is outside the allowed window (Replay protection)' });
        }
        // 2. Hash the raw secret to lookup user safely
        const secretKeyHash = crypto_1.default.createHash('sha256').update(rawSecret).digest('hex');
        const user = await User_1.default.findOne({ payoutSecretKeyHash: secretKeyHash, status: 'active' });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid API Key' });
        }
        // 3. Check explicit payout access
        if (!user.isPayoutEnabled) {
            return res.status(403).json({ success: false, message: 'Payout access is suspended or not enabled for this account' });
        }
        // 4. IP Whitelist Enforcement
        if (user.payoutIpWhitelist && user.payoutIpWhitelist.length > 0) {
            // Strip IPv4-mapped IPv6 prefixes if necessary
            const ipStr = String(clientIp).replace(/^::ffff:/, '');
            if (!user.payoutIpWhitelist.includes(ipStr) && !user.payoutIpWhitelist.includes(clientIp)) {
                return res.status(403).json({ success: false, message: `IP address ${ipStr} is not whitelisted for payouts` });
            }
        }
        // 5. Verify HMAC Signature
        // The signature should be based on timestamp + stringified request body
        // Ensuring exact match requires clients strictly hashing the JSON representation
        const payload = timestamp + (Object.keys(req.body || {}).length > 0 ? JSON.stringify(req.body) : '');
        const expectedSignature = crypto_1.default.createHmac('sha256', rawSecret)
            .update(payload)
            .digest('hex');
        if (expectedSignature !== signature) {
            return res.status(401).json({ success: false, message: 'Invalid payload signature' });
        }
        // Setup req object
        req.user = user;
        req.idempotencyKey = idempotencyKey;
        next();
    }
    catch (error) {
        console.error('Payout auth error:', error);
        res.status(500).json({ success: false, message: 'Internal server authentication error' });
    }
};
exports.requirePayoutAuth = requirePayoutAuth;
//# sourceMappingURL=payoutAuth.js.map