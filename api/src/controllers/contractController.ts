import { Response } from 'express';
import { Contract } from '../models/Contract';
import { Client } from '../models/Client';
import { AuthRequest } from '../middleware/auth';

export const createContract = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { client, title, description, startDate, expiryDate, value } = req.body;

    // Verify client exists
    const clientDoc = await Client.findById(client);
    if (!clientDoc) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }

    const contract = new Contract({
      client,
      title,
      description,
      startDate,
      expiryDate,
      value,
      managedBy: req.user?.id,
      isActive: true
    });

    await contract.save();

    const populatedContract = await Contract.findById(contract._id)
      .populate('client')
      .populate('managedBy', '-password');

    res.status(201).json({
      message: 'Contract created successfully',
      contract: populatedContract
    });
  } catch (error) {
    console.error('Create contract error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getContracts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { clientId, isActive } = req.query;
    const filter: any = {};

    if (clientId) {
      filter.client = clientId;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const contracts = await Contract.find(filter)
      .populate('client')
      .populate('managedBy', '-password')
      .sort({ expiryDate: 1 });

    res.json({ contracts });
  } catch (error) {
    console.error('Get contracts error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getContract = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const contract = await Contract.findById(req.params.id)
      .populate('client')
      .populate('managedBy', '-password');

    if (!contract) {
      res.status(404).json({ error: 'Contract not found' });
      return;
    }

    res.json({ contract });
  } catch (error) {
    console.error('Get contract error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateContract = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, startDate, expiryDate, value, isActive } = req.body;

    const contract = await Contract.findById(req.params.id);
    if (!contract) {
      res.status(404).json({ error: 'Contract not found' });
      return;
    }

    if (title) contract.title = title;
    if (description !== undefined) contract.description = description;
    if (startDate) contract.startDate = startDate;
    if (expiryDate) contract.expiryDate = expiryDate;
    if (value !== undefined) contract.value = value;
    if (isActive !== undefined) contract.isActive = isActive;

    await contract.save();

    const updatedContract = await Contract.findById(contract._id)
      .populate('client')
      .populate('managedBy', '-password');

    res.json({
      message: 'Contract updated successfully',
      contract: updatedContract
    });
  } catch (error) {
    console.error('Update contract error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteContract = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const contract = await Contract.findByIdAndDelete(req.params.id);

    if (!contract) {
      res.status(404).json({ error: 'Contract not found' });
      return;
    }

    res.json({ message: 'Contract deleted successfully' });
  } catch (error) {
    console.error('Delete contract error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
