import mongoose, { Schema, Document, Types } from 'mongoose';
import { IClient } from '../types';

export interface ClientDocument extends Omit<IClient, 'client' | 'assignedBy' | 'managedBy'>, Document {}

const clientSchema = new Schema<ClientDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

export const Client = mongoose.model<ClientDocument>('Client', clientSchema);
