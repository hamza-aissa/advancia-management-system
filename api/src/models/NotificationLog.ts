import mongoose, { Document, Schema, Types } from 'mongoose';

export interface NotificationLogDocument extends Document {
  itemKind: 'license' | 'contract';
  itemId: Types.ObjectId;
  renewalCycle: string;
  threshold: 15 | 10 | 6;
  recipient: string;
  sentAt?: Date;
  attemptedAt?: Date;
  error?: string;
  deliveryStatus: 'pending' | 'sent' | 'simulated' | 'failed';
}

const notificationLogSchema = new Schema<NotificationLogDocument>({
  itemKind: { type: String, enum: ['license', 'contract'], required: true },
  itemId: { type: Schema.Types.ObjectId, required: true },
  renewalCycle: { type: String, required: true },
  threshold: { type: Number, enum: [15, 10, 6], required: true },
  recipient: { type: String, required: true, lowercase: true, trim: true },
  sentAt: Date,
  attemptedAt: Date,
  error: String,
  deliveryStatus: { type: String, enum: ['pending', 'sent', 'simulated', 'failed'], default: 'pending' }
}, { timestamps: true });

notificationLogSchema.index({ itemKind: 1, itemId: 1, renewalCycle: 1, threshold: 1, recipient: 1 }, { unique: true });

export const NotificationLog = mongoose.model<NotificationLogDocument>('NotificationLog', notificationLogSchema);
