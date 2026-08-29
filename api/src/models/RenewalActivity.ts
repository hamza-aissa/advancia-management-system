import mongoose, { Document, Schema, Types } from 'mongoose';

export const renewalActivityActions = ['created', 'updated', 'contacted', 'follow_up_scheduled', 'renewed', 'declined', 'reassigned', 'archived'] as const;

export interface RenewalActivityDocument extends Document {
  itemType: 'license' | 'contract';
  itemId: Types.ObjectId;
  action: typeof renewalActivityActions[number];
  performedBy: Types.ObjectId;
  note?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const renewalActivitySchema = new Schema<RenewalActivityDocument>({
  itemType: { type: String, enum: ['license', 'contract'], required: true },
  itemId: { type: Schema.Types.ObjectId, required: true },
  action: { type: String, enum: renewalActivityActions, required: true },
  performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  note: { type: String, trim: true },
  metadata: { type: Schema.Types.Mixed }
}, { timestamps: true });

renewalActivitySchema.index({ itemType: 1, itemId: 1, createdAt: -1 });

export const RenewalActivity = mongoose.model<RenewalActivityDocument>('RenewalActivity', renewalActivitySchema);
