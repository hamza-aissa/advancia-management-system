import mongoose, { Schema, Document, Types } from 'mongoose';

export const renewalStatuses = ['not_contacted', 'contacted', 'waiting', 'renewed', 'declined'] as const;
export type RenewalStatus = typeof renewalStatuses[number];

export interface RenewalHistoryEntry {
  previousStartDate: Date;
  previousExpiryDate: Date;
  newStartDate: Date;
  newExpiryDate: Date;
  renewedAt: Date;
  renewedBy: Types.ObjectId;
  value?: number;
}

export interface LicenseDocument extends Document {
  client: Types.ObjectId;
  offer?: Types.ObjectId;
  name: string;
  description?: string;
  startDate: Date;
  expiryDate: Date;
  value?: number;
  quantity?: number;
  isActive: boolean;
  assignedBy?: Types.ObjectId;
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

const licenseSchema = new Schema<LicenseDocument>({
  client: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  offer: { type: Schema.Types.ObjectId, ref: 'LicenseOffer', index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  startDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true, index: true },
  value: { type: Number, min: 0 },
  quantity: { type: Number, min: 1 },
  isActive: { type: Boolean, default: true, index: true },
  assignedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  renewalStatus: { type: String, enum: renewalStatuses, default: 'not_contacted', index: true },
  nextFollowUpAt: { type: Date, index: true },
  lastActionAt: Date,
  declineReason: { type: String, trim: true },
  renewalHistory: { type: [renewalHistorySchema], default: [] },
  archivedAt: { type: Date, default: null, index: true }
}, { timestamps: true });

licenseSchema.index({ assignedBy: 1, expiryDate: 1 });

export const License = mongoose.model<LicenseDocument>('License', licenseSchema);
