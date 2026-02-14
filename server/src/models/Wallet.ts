import mongoose, { Schema, Document } from 'mongoose';

export interface IWalletDocument extends Document {
    userId: mongoose.Types.ObjectId;
    balance: number;
    clearedBalance: number;
    lockedBalance: number;
    currency: string;
    createdAt: Date;
    updatedAt: Date;
}

const WalletSchema = new Schema<IWalletDocument>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
        },
        balance: {
            type: Number,
            default: 0,
            min: 0,
        },
        clearedBalance: {
            type: Number,
            default: 0,
            min: 0,
        },
        lockedBalance: {
            type: Number,
            default: 0,
            min: 0,
        },
        currency: {
            type: String,
            default: 'NGN',
        },
    },
    {
        timestamps: true,
    }
);

// userId index is implicit from unique: true

// Virtual for available balance
WalletSchema.virtual('availableBalance').get(function () {
    return this.balance - this.lockedBalance;
});

export const Wallet = mongoose.model<IWalletDocument>('Wallet', WalletSchema);
export default Wallet;
