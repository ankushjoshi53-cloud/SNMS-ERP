export type UserRole = 'Super Admin' | 'QA' | 'Production' | 'PDI' | 'Dispatch' | 'Viewer';

export interface User {
  id: string;
  name: string;
  employeeId: string;
  email: string;
  role: UserRole;
  plant: string; // Plant name or 'All'
  createdAt: string;
  authorizations?: CustomerAuthorizations;
}

export interface Plant {
  id: string;
  name: string;
  location: string;
  createdAt: string;
}

export interface BatteryModel {
  id: string;
  name: string;
  code: string; // e.g. "M22"
  batteryType: string; // e.g., "Tubular", "Flat Plate"
  capacity: string; // e.g., "150Ah", "200Ah"
  startSerial: string; // Numeric start, e.g. "000001"
  endSerial: string; // Numeric end, e.g. "999999"
  currentSerial: string; // Current numeric running value
  plant?: string; // Designated plant name (optional now)
  status: 'Active' | 'Inactive';
  createdAt: string;
  customerName?: string; // Designated Customer
}

export interface ModulePermissions {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
}

export interface CustomerAuthorizations {
  plantMaster: ModulePermissions;
  modelMaster: ModulePermissions;
  customerMaster: ModulePermissions;
  rangeAllotment: ModulePermissions;
  packingEntry: ModulePermissions;
  pdiQualityCheck: ModulePermissions;
  interPlantTransfer: ModulePermissions;
  dispatchControl: ModulePermissions;
}

export interface Customer {
  id: string;
  name: string;
  code: string;
  address: string;
  gst: string;
  state: string;
  totalDigitsOfSerial?: number;
  numericDigitsOfSerial?: number;
  uniqueCode?: string;
  uniqueCodeLength?: number;
  createdAt: string;
  authorizations?: CustomerAuthorizations;
}

export interface SerialRangeAllotment {
  id: string;
  date: string;
  modelCode: string;
  plantName: string;
  startSerial: string; // e.g. "M22202607000001"
  endSerial: string;
  quantity: number;
  remarks: string;
  allottedBy: string;
  createdAt: string;
  customerName?: string;
  year?: string;
  month?: string;
  digitsLength?: number;
  serialCode?: string;
  status?: 'Active' | 'Inactive';
}

export type SerialStatus = 'Allotted' | 'Produced' | 'PDI Approved' | 'PDI Rejected' | 'PDI Hold' | 'Transferred' | 'Dispatched';

export interface SerialNumber {
  serialNumber: string; // M22202607000001
  modelCode: string;
  year: string;
  month: string;
  runningNumber: string;
  status: SerialStatus;
  currentPlant: string;
  mfgDate?: string;
  shift?: string;
  pdiStatus?: 'Approved' | 'Rejected' | 'Hold' | 'Pending';
  pdiRemarks?: string;
  pdiBy?: string;
  pdiDate?: string;
  invoiceNo?: string;
  invoiceDate?: string;
  customerName?: string;
  vehicleNo?: string;
  transporter?: string;
  lrNumber?: string;
  dispatchDate?: string;
  dispatchedBy?: string;
  createdAt: string;
  currentLocation?: string;
  currentOwner?: string;
  inventoryStatus?: 'Available' | 'Packed' | 'Dispatched' | 'Hold';
  packingStatus?: 'Packed' | 'Not Packed';
  transferStatus?: 'Completed' | 'Pending' | 'None';
  lastTransferDate?: string;
  lastTransferBy?: string;
}

export interface ProductionEntry {
  id: string;
  date: string;
  shift: string;
  modelCode: string;
  serialNumber: string;
  quantity: number; // Always 1 per serial
  status: 'Success' | 'Failed';
  plant: string;
  createdBy: string;
  createdAt: string;
}

export interface SerialTransfer {
  id: string;
  fromPlant: string;
  toPlant: string;
  modelCode: string;
  startSerial: string;
  endSerial: string;
  quantity: number;
  transferDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvedBy?: string;
  remarks?: string;
  createdAt: string;
}

export interface DispatchEntry {
  id: string;
  customerName: string;
  invoiceNumber: string;
  invoiceDate: string;
  modelCode: string;
  serialNumbers: string[]; // List of dispatched serials
  vehicle: string;
  transport: string;
  lrNumber: string;
  status: 'Dispatched';
  dispatchedBy: string;
  plant: string;
  createdAt: string;
}

export interface PDIEntry {
  id: string;
  serialNumber: string;
  status: 'Approved' | 'Rejected' | 'Hold';
  inspectedBy: string;
  remarks: string;
  inspectionDate: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp?: string; // ISO format
  username?: string; // email or name of user
  employeeId?: string; // unique employee identifier
  role?: string; // user security role
  plant?: string; // associated plant or All
  module?: string; // system module
  action?: string; // action event type
  description?: string; // human action summary
  oldValue: string; // JSON string before state change
  newValue: string; // JSON string after state change
  status?: 'Success' | 'Failed';
  ipAddress: string;
  device?: string; // Desktop, Mobile, Tablet
  browser?: string; // Chrome, Safari, Firefox, Edge etc.
  operatingSystem?: string; // OS name
  sessionId?: string; // Traceable session ID
  remarks?: string; // Any addition explanations

  // Backward compatibility with legacy/seed records:
  who?: string;
  what?: string;
  when?: string;
}

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  date: string;
  read: boolean;
  modelCode?: string;
}

export interface PDIOfferedRange {
  id: string;
  offeredDate: string;
  modelCode: string;
  plantName: string;
  startSerial: string;
  endSerial: string;
  totalQty: number;
  okQty: number;
  holdQty: number;
  rejectedQty: number;
  okSerials: string[];
  holdSerials: string[];
  rejectedSerials: string[];
  aestheticIssuesCheck: boolean;
  aestheticIssueRemarks?: string;
  generalRemarks?: string;
  offeredBy: string;
  createdAt: string;
  ocvLowRange?: boolean;
  ocvHighRange?: boolean;
  gravityLowRange?: boolean;
  gravityHighRange?: boolean;
  terminalOxidationRange?: boolean;
  ventLeakageRange?: boolean;
  ventLooseRange?: boolean;
}
