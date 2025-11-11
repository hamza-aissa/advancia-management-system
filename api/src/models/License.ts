import mongoose, { Schema, Document, Types } from 'mongoose';
import { ILicense } from '../types';

export interface LicenseDocument extends Omit<ILicense, 'client' | 'assignedBy'>, Document {
  client: Types.ObjectId;
  assignedBy: Types.ObjectId;
}

const licenseSchema = new Schema<LicenseDocument>(
  {
    client: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    startDate: {
      type: Date,
      required: true
    },
    expiryDate: {
      type: Date,
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

export const License = mongoose.model<LicenseDocument>('License', licenseSchema);
