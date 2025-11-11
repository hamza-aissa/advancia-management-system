export enum UserRole {
  AGENT = 'agent',
  CONSULTANT = 'consultant',
  ADMIN = 'admin',
  EXECUTIVE = 'executive'
}

export interface IUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface IClient {
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

export interface ILicense {
  client: string; // Client ID
  name: string;
  description?: string;
  startDate: Date;
  expiryDate: Date;
  isActive: boolean;
  assignedBy: string; // Agent User ID
}

export interface IContract {
  client: string; // Client ID
  title: string;
  description?: string;
  startDate: Date;
  expiryDate: Date;
  value?: number;
  isActive: boolean;
  managedBy: string; // Consultant User ID
}

export interface EmailNotification {
  to: string[];
  subject: string;
  text: string;
  html: string;
}

export interface ExpiryCheckResult {
  type: 'license' | 'contract';
  item: ILicense | IContract;
  daysUntilExpiry: number;
  notificationLevel: 15 | 10 | 6;
}
