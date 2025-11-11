import mongoose, { Schema, Document, Types } from 'mongoose';
import { IContract } from '../types';

export interface ContractDocument extends Omit<IContract, 'client' | 'managedBy'>, Document {
  client: Types.ObjectId;
  managedBy: Types.ObjectId;
}

const contractSchema = new Schema<ContractDocument>(
  {
    client: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true
    },
    title: {
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
    value: {
      type: Number
    },
    isActive: {
      type: Boolean,
      default: true
    },
    managedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

export const Contract = mongoose.model<ContractDocument>('Contract', contractSchema);
