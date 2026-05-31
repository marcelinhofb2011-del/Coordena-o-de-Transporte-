export enum UserRole {
  ADMIN = 'ADMIN',
  COORDINATOR = 'COORDINATOR',
  USER = 'USER'
}

export enum PaymentStatus {
  PENDENTE = 'PENDENTE',
  PAGO = 'PAGO',
  PARCIAL = 'PARCIAL'
}

export interface AppSettings {
  ticketPrice: number;
  dailyPrices?: { [day: string]: number };
}

export interface Passenger {
  name: string;
  document: string;
}

export interface Congregation {
  id: string;
  name: string;
  createdAt: any;
}

export interface Bus {
  id: string;
  name: string;
  number: string;
  company: string;
  driver: string;
  driverPhone: string;
  capacity: number;
  plate: string;
  notes: string;
  congregationId: string;
  createdAt: any;
}

export interface Reservation {
  id: string;
  passengers: Passenger[];
  notes: string;
  busId: string;
  congregationId: string;
  days: string[]; // ['Sexta', 'Sábado', 'Domingo']
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  unitValue: number;
  dailyPrices?: { [day: string]: number };
  totalValue: number;
  amountPaid: number;
  receivedAmount?: number;
  balance: number;
  boardedStatus?: { [day: string]: number[] }; // Map of day to array of passenger indices who boarded
  createdAt: any;
  createdBy: string;
}

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  congregationId?: string;
  canSell?: boolean;
  createdAt: any;
}

export enum LogAction {
  RESERVATION_CREATE = 'RESERVATION_CREATE',
  RESERVATION_UPDATE = 'RESERVATION_UPDATE',
  RESERVATION_DELETE = 'RESERVATION_DELETE',
  PAYMENT_UPDATE = 'PAYMENT_UPDATE',
}

export interface AuditLog {
  id: string;
  action: LogAction;
  details: string;
  userId: string;
  userName: string;
  targetId: string;
  createdAt: any;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export enum NotificationType {
  USER_REGISTRATION = 'USER_REGISTRATION',
  RESERVATION_NEW = 'RESERVATION_NEW',
  RESERVATION_DELETE = 'RESERVATION_DELETE',
  SYSTEM = 'SYSTEM'
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  readBy: string[]; // List of UIDs who read it
  targetRoles: UserRole[];
  congregationId?: string;
  link?: string;
  createdAt: any;
}
