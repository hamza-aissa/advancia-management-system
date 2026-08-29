import mongoose, { Schema, Document } from 'mongoose';
import { ClientStatus, IClient } from '../types';

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
      unique: true,
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
    },
    assignedAgent: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    assignedConsultant: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    status: {
      type: String,
      enum: Object.values(ClientStatus),
      default: ClientStatus.ACTIVE,
      required: true,
      index: true
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000
    },
    lastContactAt: Date,
    archivedAt: {
      type: Date,
      index: true
    }
  },
  {
    timestamps: true
  }
);

clientSchema.index({ assignedAgent: 1, archivedAt: 1, name: 1 });
clientSchema.index({ assignedConsultant: 1, archivedAt: 1, name: 1 });

clientSchema.set('toJSON', {
  transform: (_document, returnedObject) => {
    const json = returnedObject as unknown as Record<string, unknown>;
    json.id = String(json._id);
    delete json._id;
    delete json.__v;
    return returnedObject;
  }
});

export const Client = mongoose.model<ClientDocument>('Client', clientSchema);
