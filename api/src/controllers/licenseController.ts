import { Response } from 'express';
import { License } from '../models/License';
import { Client } from '../models/Client';
import { AuthRequest } from '../middleware/auth';
import { UserRole } from '../types';

export const createLicense = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { client, name, description, startDate, expiryDate } = req.body;

    // Verify client exists
    const clientDoc = await Client.findById(client);
    if (!clientDoc) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    const license = new License({
      client,
      name,
      description,
      startDate,
      expiryDate,
      assignedBy: req.user?.id,
      isActive: true
    });

    await license.save();

    const populatedLicense = await License.findById(license._id)
      .populate('client')
      .populate('assignedBy', '-password');

    res.status(201).json({
      message: 'License created successfully',
      license: populatedLicense
    });
  } catch (error) {
    console.error('Create license error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getLicenses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { clientId, isActive } = req.query;
    const filter: any = {};

    if (clientId) {
      filter.client = clientId;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const licenses = await License.find(filter)
      .populate('client')
      .populate('assignedBy', '-password')
      .sort({ expiryDate: 1 });

    res.json({ licenses });
  } catch (error) {
    console.error('Get licenses error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getLicense = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const license = await License.findById(req.params.id)
      .populate('client')
      .populate('assignedBy', '-password');

    if (!license) {
      res.status(404).json({ error: 'License not found' });
      return;
    }

    res.json({ license });
  } catch (error) {
    console.error('Get license error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateLicense = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, startDate, expiryDate, isActive } = req.body;

    const license = await License.findById(req.params.id);
    if (!license) {
      res.status(404).json({ error: 'License not found' });
      return;
    }

    if (name) license.name = name;
    if (description !== undefined) license.description = description;
    if (startDate) license.startDate = startDate;
    if (expiryDate) license.expiryDate = expiryDate;
    if (isActive !== undefined) license.isActive = isActive;

    await license.save();

    const updatedLicense = await License.findById(license._id)
      .populate('client')
      .populate('assignedBy', '-password');

    res.json({
      message: 'License updated successfully',
      license: updatedLicense
    });
  } catch (error) {
    console.error('Update license error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteLicense = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const license = await License.findByIdAndDelete(req.params.id);

    if (!license) {
      res.status(404).json({ error: 'License not found' });
      return;
    }

    res.json({ message: 'License deleted successfully' });
  } catch (error) {
    console.error('Delete license error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
