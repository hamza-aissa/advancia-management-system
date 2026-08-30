import mongoose, { Document, Schema } from 'mongoose';

export interface LicenseOfferDocument extends Document {
  name: string;
  description?: string;
  unitPrice: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const licenseOfferSchema = new Schema<LicenseOfferDocument>({
  name: { type: String, required: true, trim: true, unique: true },
  description: { type: String, trim: true, maxlength: 2000 },
  unitPrice: { type: Number, required: true, min: 0 },
  active: { type: Boolean, default: true, index: true }
}, { timestamps: true });

licenseOfferSchema.set('toJSON', {
  transform: (_document, returnedObject) => {
    const json = returnedObject as unknown as Record<string, unknown>;
    json.id = String(json._id);
    delete json._id;
    delete json.__v;
    return returnedObject;
  }
});

export const LicenseOffer = mongoose.model<LicenseOfferDocument>('LicenseOffer', licenseOfferSchema);
