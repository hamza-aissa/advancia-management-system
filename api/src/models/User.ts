import mongoose, { Schema, Document } from 'mongoose';
import { IUser, UserRole } from '../types';

export interface UserDocument extends Omit<IUser, 'client' | 'assignedBy' | 'managedBy'>, Document {}

const userSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    firstName: {
      type: String,
      required: true,
      trim: true
    },
    lastName: {
      type: String,
      required: true,
      trim: true
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true
    }
  },
  {
    timestamps: true
  }
);

userSchema.set('toJSON', {
  transform: (_document, returnedObject) => {
    const json = returnedObject as unknown as Record<string, unknown>;
    delete json.password;
    json.id = String(json._id);
    delete json._id;
    delete json.__v;
    return returnedObject;
  }
});

export const User = mongoose.model<UserDocument>('User', userSchema);
