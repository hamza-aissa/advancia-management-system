import mongoose, { Document, Schema } from 'mongoose';

export interface ContractTypeDocument extends Document {
  name: string;
  description?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const contractTypeSchema = new Schema<ContractTypeDocument>({
  name: { type: String, required: true, trim: true, unique: true },
  description: { type: String, trim: true, maxlength: 2000 },
  active: { type: Boolean, default: true, index: true }
}, { timestamps: true });

contractTypeSchema.set('toJSON', {
  transform: (_document, returnedObject) => {
    const json = returnedObject as unknown as Record<string, unknown>;
    json.id = String(json._id);
    delete json._id;
    delete json.__v;
    return returnedObject;
  }
});

export const ContractType = mongoose.model<ContractTypeDocument>('ContractType', contractTypeSchema);
