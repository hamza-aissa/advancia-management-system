export enum UserRole {
  AGENT = 'agent',
  CONSULTANT = 'consultant',
  ADMIN = 'admin',
  EXECUTIVE = 'executive'
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface Client {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

export interface License {
  _id: string;
  client: Client;
  name: string;
  description?: string;
  startDate: string;
  expiryDate: string;
  isActive: boolean;
  assignedBy: User;
  createdAt?: string;
  updatedAt?: string;
}

export interface Contract {
  _id: string;
  client: Client;
  title: string;
  description?: string;
  startDate: string;
  expiryDate: string;
  value?: number;
  isActive: boolean;
  managedBy: User;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}
