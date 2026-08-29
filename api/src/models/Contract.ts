import mongoose, { Schema, Document, Types } from 'mongoose';
import { RenewalHistoryEntry, RenewalStatus, renewalStatuses } from './License';

export interface ContractDocument extends Document {
  client: Types.ObjectId;
  title: string;
  description?: string;
  startDate: Date;
  expiryDate: Date;
  value?: number;
  isActive: boolean;
  managedBy?: Types.ObjectId;
  renewalStatus: RenewalStatus;
  nextFollowUpAt?: Date;
  lastActionAt?: Date;
  declineReason?: string;
  renewalHistory: RenewalHistoryEntry[];
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const renewalHistorySchema = new Schema<RenewalHistoryEntry>({
  previousStartDate: { type: Date, required: true },
  previousExpiryDate: { type: Date, required: true },
  newStartDate: { type: Date, required: true },
  newExpiryDate: { type: Date, required: true },
  renewedAt: { type: Date, required: true },
  renewedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  value: { type: Number, min: 0 }
}, { _id: false });

const contractSchema = new Schema<ContractDocument>({
  client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  startDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true, index: true },
  value: { type: Number, min: 0 },
  isActive: { type: Boolean, default: true, index: true },
  managedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  renewalStatus: { type: String, enum: renewalStatuses, default: 'not_contacted', index: true },
  nextFollowUpAt: { type: Date, index: true },
  lastActionAt: Date,
  declineReason: { type: String, trim: true },
  renewalHistory: { type: [renewalHistorySchema], default: [] },
  archivedAt: { type: Date, default: null, index: true }
}, { timestamps: true });

contractSchema.index({ managedBy: 1, expiryDate: 1 });

export const Contract = mongoose.model<ContractDocument>('Contract', contractSchema);
