import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

import {
  User,
  Plant,
  BatteryModel,
  Customer,
  SerialRangeAllotment,
  SerialNumber,
  ProductionEntry,
  SerialTransfer,
  DispatchEntry,
  PDIEntry,
  AuditLog,
  Notification,
  UserRole,
  PDIOfferedRange
} from '../src/types';

const DB_FILE_DEMO = path.join(process.cwd(), 'database.json');
const DB_FILE_LIVE = path.join(process.cwd(), 'database_live.json');
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_lead_acid_erp_key';

let currentEnvironment: 'live' | 'demo' = 'demo';

function getDBFilePath(): string {
  return currentEnvironment === 'live' ? DB_FILE_LIVE : DB_FILE_DEMO;
}

// Interface for DB JSON Structure
interface ERPDatabase {
  users: User[];
  userPasswords: Record<string, string>; // email -> hashed_password
  plants: Plant[];
  models: BatteryModel[];
  customers: Customer[];
  serialRanges: SerialRangeAllotment[];
  serialNumbers: SerialNumber[];
  production: ProductionEntry[];
  transfers: SerialTransfer[];
  dispatches: DispatchEntry[];
  pdi: PDIEntry[];
  auditLogs: AuditLog[];
  notifications: Notification[];
  pdiOffered: PDIOfferedRange[];
  firstTimeHoldHistory?: any[];
}

// Vercel instances have a read-only, ephemeral filesystem. Keep a warm
// instance's database in memory so login, audit logging, and environment
// switching do not fail when a JSON file cannot be written.
let serverlessDatabase: ERPDatabase | undefined;

function normalizeRole(role: string): string {
  if (!role) return 'Viewer';
  if (role === 'QA Head' || role === 'QA Manager') return 'QA';
  if (role === 'Plant User' || role === 'Plant Operator') return 'Production';
  if (role === 'Dispatch User' || role === 'Dispatch Officer') return 'Dispatch';
  return role;
}

// Read database helper
function readDB(): ERPDatabase {
  if (process.env.VERCEL && serverlessDatabase) {
    return serverlessDatabase;
  }

  const activeFile = getDBFilePath();
  if (!fs.existsSync(activeFile)) {
    const initialDB = currentEnvironment === 'live' ? getLiveSeedData() : getSeedData();
    if (process.env.VERCEL) {
      serverlessDatabase = initialDB;
    }
    writeDB(initialDB);
    return initialDB;
  }
  try {
    const raw = fs.readFileSync(activeFile, 'utf-8');
    const db = JSON.parse(raw);
    if (!db.pdiOffered) {
      db.pdiOffered = [];
    }
    if (!db.firstTimeHoldHistory) {
      db.firstTimeHoldHistory = [];
    }
    if (process.env.VERCEL) {
      serverlessDatabase = db;
    }
    return db;
  } catch (error) {
    console.error(`Error reading database file ${activeFile}, resetting to seed:`, error);
    const initialDB = currentEnvironment === 'live' ? getLiveSeedData() : getSeedData();
    if (process.env.VERCEL) {
      serverlessDatabase = initialDB;
    }
    writeDB(initialDB);
    return initialDB;
  }
}

// Write database helper
function writeDB(data: ERPDatabase) {
  if (process.env.VERCEL) {
    serverlessDatabase = data;
    return;
  }

  const activeFile = getDBFilePath();
  try {
    fs.writeFileSync(activeFile, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing database to ${activeFile}:`, error);
  }
}

// Helper to seed empty Live database
function getLiveSeedData(): ERPDatabase {
  const salt = bcrypt.genSaltSync(10);
  const defaultPasswordHash = bcrypt.hashSync('admin123', salt);
  const qaPasswordHash = bcrypt.hashSync('qa123', salt);
  const plantPasswordHash = bcrypt.hashSync('plant123', salt);
  const pdiPasswordHash = bcrypt.hashSync('pdi123', salt);
  const dispatchPasswordHash = bcrypt.hashSync('dispatch123', salt);
  const readonlyPasswordHash = bcrypt.hashSync('viewer123', salt);

  const users: User[] = [
    { id: 'u1', name: 'Super Admin', employeeId: 'EMP001', email: 'admin@erp.com', role: 'Super Admin', plant: 'All', createdAt: new Date('2026-07-01').toISOString() },
    { id: 'u2', name: 'QA Manager', employeeId: 'EMP002', email: 'qa@erp.com', role: 'QA', plant: 'Plant Alpha', createdAt: new Date('2026-07-01').toISOString() },
    { id: 'u3', name: 'Plant Operator', employeeId: 'EMP003', email: 'plant@erp.com', role: 'Production', plant: 'Plant Alpha', createdAt: new Date('2026-07-01').toISOString() },
    { id: 'u4', name: 'PDI Inspector', employeeId: 'EMP004', email: 'pdi@erp.com', role: 'PDI', plant: 'Plant Alpha', createdAt: new Date('2026-07-01').toISOString() },
    { id: 'u5', name: 'Dispatch Officer', employeeId: 'EMP005', email: 'dispatch@erp.com', role: 'Dispatch', plant: 'Plant Alpha', createdAt: new Date('2026-07-01').toISOString() },
    { id: 'u6', name: 'Viewer Auditor', employeeId: 'EMP006', email: 'viewer@erp.com', role: 'Viewer', plant: 'All', createdAt: new Date('2026-07-01').toISOString() }
  ];

  const userPasswords: Record<string, string> = {
    'admin@erp.com': defaultPasswordHash,
    'qa@erp.com': qaPasswordHash,
    'plant@erp.com': plantPasswordHash,
    'pdi@erp.com': pdiPasswordHash,
    'dispatch@erp.com': dispatchPasswordHash,
    'viewer@erp.com': readonlyPasswordHash
  };

  return {
    users,
    userPasswords,
    plants: [],
    models: [],
    customers: [],
    serialRanges: [],
    serialNumbers: [],
    production: [],
    transfers: [],
    dispatches: [],
    pdi: [],
    auditLogs: [
      { id: 'log1', who: 'admin@erp.com', what: 'SYSTEM_STARTUP', when: new Date().toISOString(), oldValue: 'None', newValue: 'Live environment initialized with clean database', ipAddress: '127.0.0.1' }
    ],
    notifications: [],
    pdiOffered: []
  };
}

// Helper to seed data
function getSeedData(): ERPDatabase {
  const salt = bcrypt.genSaltSync(10);
  const defaultPasswordHash = bcrypt.hashSync('admin123', salt);
  const qaPasswordHash = bcrypt.hashSync('qa123', salt);
  const plantPasswordHash = bcrypt.hashSync('plant123', salt);
  const pdiPasswordHash = bcrypt.hashSync('pdi123', salt);
  const dispatchPasswordHash = bcrypt.hashSync('dispatch123', salt);
  const readonlyPasswordHash = bcrypt.hashSync('viewer123', salt);

  const users: User[] = [
    { id: 'u1', name: 'Super Admin', employeeId: 'EMP001', email: 'admin@erp.com', role: 'Super Admin', plant: 'All', createdAt: new Date('2026-07-01').toISOString() },
    { id: 'u2', name: 'QA Manager', employeeId: 'EMP002', email: 'qa@erp.com', role: 'QA', plant: 'Plant Alpha', createdAt: new Date('2026-07-01').toISOString() },
    { id: 'u3', name: 'Plant Operator', employeeId: 'EMP003', email: 'plant@erp.com', role: 'Production', plant: 'Plant Alpha', createdAt: new Date('2026-07-01').toISOString() },
    { id: 'u4', name: 'PDI Inspector', employeeId: 'EMP004', email: 'pdi@erp.com', role: 'PDI', plant: 'Plant Alpha', createdAt: new Date('2026-07-01').toISOString() },
    { id: 'u5', name: 'Dispatch Officer', employeeId: 'EMP005', email: 'dispatch@erp.com', role: 'Dispatch', plant: 'Plant Alpha', createdAt: new Date('2026-07-01').toISOString() },
    { id: 'u6', name: 'Viewer Auditor', employeeId: 'EMP006', email: 'viewer@erp.com', role: 'Viewer', plant: 'All', createdAt: new Date('2026-07-01').toISOString() }
  ];

  const userPasswords: Record<string, string> = {
    'admin@erp.com': defaultPasswordHash,
    'qa@erp.com': qaPasswordHash,
    'plant@erp.com': plantPasswordHash,
    'pdi@erp.com': pdiPasswordHash,
    'dispatch@erp.com': dispatchPasswordHash,
    'viewer@erp.com': readonlyPasswordHash
  };

  const plants: Plant[] = [
    { id: 'p1', name: 'Plant Alpha', location: 'Mumbai, India', createdAt: new Date('2026-07-01').toISOString() },
    { id: 'p2', name: 'Plant Beta', location: 'Chennai, India', createdAt: new Date('2026-07-01').toISOString() },
    { id: 'p3', name: 'Plant Gamma', location: 'Delhi, India', createdAt: new Date('2026-07-01').toISOString() }
  ];

  const models: BatteryModel[] = [
    { id: 'm1', name: 'PowerPack XL', code: 'M22', batteryType: 'Tubular', capacity: '150Ah', startSerial: '1000', endSerial: '9999', currentSerial: '1005', plant: 'Plant Alpha', status: 'Active', createdAt: new Date('2026-07-01').toISOString() },
    { id: 'm2', name: 'UltraVolt Pro', code: 'M24', batteryType: 'Flat Plate', capacity: '200Ah', startSerial: '2000', endSerial: '2999', currentSerial: '2000', plant: 'Plant Beta', status: 'Active', createdAt: new Date('2026-07-01').toISOString() },
    { id: 'm3', name: 'SolarMax Tub', code: 'S15', batteryType: 'Tubular', capacity: '120Ah', startSerial: '5000', endSerial: '5999', currentSerial: '5000', plant: 'Plant Alpha', status: 'Active', createdAt: new Date('2026-07-01').toISOString() }
  ];

  const customers: Customer[] = [
    { id: 'c1', name: 'TATA Motors Ltd', code: 'CUST-TATA', address: 'Pune Tech Park, Sector 4', gst: '27AAAAA1111A1Z1', state: 'Maharashtra', createdAt: new Date('2026-07-01').toISOString() },
    { id: 'c2', name: 'Exide Distributors', code: 'CUST-EXID', address: 'Salt Lake Sector V, Kolkata', gst: '19BBBBB2222B2Z2', state: 'West Bengal', createdAt: new Date('2026-07-01').toISOString() },
    { id: 'c3', name: 'Luminous Power Agency', code: 'CUST-LUMI', address: 'Industrial Area Phase 2, Baddi', gst: '02CCCCC3333C3Z3', state: 'Himachal Pradesh', createdAt: new Date('2026-07-01').toISOString() }
  ];

  const serialRanges: SerialRangeAllotment[] = [
    { id: 'r1', date: '2026-07-01', modelCode: 'M22', plantName: 'Plant Alpha', startSerial: 'M222026071000', endSerial: 'M222026071100', quantity: 101, remarks: 'Initial allocation for testing', allottedBy: 'QA Manager', createdAt: new Date('2026-07-01').toISOString() }
  ];

  const serialNumbers: SerialNumber[] = [
    { serialNumber: 'M222026071000', modelCode: 'M22', year: '2026', month: '07', runningNumber: '1000', status: 'Dispatched', currentPlant: 'Plant Alpha', mfgDate: '2026-07-02', shift: 'Shift A', pdiStatus: 'Approved', pdiRemarks: 'Perfect voltage and specific gravity.', pdiBy: 'QA Manager', pdiDate: '2026-07-02', invoiceNo: 'INV-2026-001', invoiceDate: '2026-07-03', customerName: 'TATA Motors Ltd', vehicleNo: 'MH-12-PQ-9876', transporter: 'VRL Logistics', lrNumber: 'LR887722', dispatchDate: '2026-07-03', dispatchedBy: 'Dispatch Officer', createdAt: new Date('2026-07-02').toISOString() },
    { serialNumber: 'M222026071001', modelCode: 'M22', year: '2026', month: '07', runningNumber: '1001', status: 'Dispatched', currentPlant: 'Plant Alpha', mfgDate: '2026-07-02', shift: 'Shift A', pdiStatus: 'Approved', pdiRemarks: 'Passed all inspection checklists.', pdiBy: 'QA Manager', pdiDate: '2026-07-02', invoiceNo: 'INV-2026-001', invoiceDate: '2026-07-03', customerName: 'TATA Motors Ltd', vehicleNo: 'MH-12-PQ-9876', transporter: 'VRL Logistics', lrNumber: 'LR887722', dispatchDate: '2026-07-03', dispatchedBy: 'Dispatch Officer', createdAt: new Date('2026-07-02').toISOString() },
    { serialNumber: 'M222026071002', modelCode: 'M22', year: '2026', month: '07', runningNumber: '1002', status: 'Produced', currentPlant: 'Plant Alpha', mfgDate: '2026-07-03', shift: 'Shift B', pdiStatus: 'Pending', createdAt: new Date('2026-07-03').toISOString() },
    { serialNumber: 'M222026071003', modelCode: 'M22', year: '2026', month: '07', runningNumber: '1003', status: 'PDI Approved', currentPlant: 'Plant Alpha', mfgDate: '2026-07-03', shift: 'Shift B', pdiStatus: 'Approved', pdiRemarks: 'Passed testing', pdiBy: 'QA Manager', pdiDate: '2026-07-04', createdAt: new Date('2026-07-03').toISOString() },
    { serialNumber: 'M222026071004', modelCode: 'M22', year: '2026', month: '07', runningNumber: '1004', status: 'PDI Rejected', currentPlant: 'Plant Alpha', mfgDate: '2026-07-04', shift: 'Shift C', pdiStatus: 'Rejected', pdiRemarks: 'Terminal welding leak defect.', pdiBy: 'QA Manager', pdiDate: '2026-07-04', createdAt: new Date('2026-07-04').toISOString() },
    { serialNumber: 'M222026071005', modelCode: 'M22', year: '2026', month: '07', runningNumber: '1005', status: 'Produced', currentPlant: 'Plant Alpha', mfgDate: '2026-07-04', shift: 'Shift A', pdiStatus: 'Pending', createdAt: new Date('2026-07-04').toISOString() }
  ];

  const production: ProductionEntry[] = [
    { id: 'pr1', date: '2026-07-02', shift: 'Shift A', modelCode: 'M22', serialNumber: 'M222026071000', quantity: 1, status: 'Success', plant: 'Plant Alpha', createdBy: 'Plant Operator', createdAt: new Date('2026-07-02').toISOString() },
    { id: 'pr2', date: '2026-07-02', shift: 'Shift A', modelCode: 'M22', serialNumber: 'M222026071001', quantity: 1, status: 'Success', plant: 'Plant Alpha', createdBy: 'Plant Operator', createdAt: new Date('2026-07-02').toISOString() },
    { id: 'pr3', date: '2026-07-03', shift: 'Shift B', modelCode: 'M22', serialNumber: 'M222026071002', quantity: 1, status: 'Success', plant: 'Plant Alpha', createdBy: 'Plant Operator', createdAt: new Date('2026-07-03').toISOString() },
    { id: 'pr4', date: '2026-07-03', shift: 'Shift B', modelCode: 'M22', serialNumber: 'M222026071003', quantity: 1, status: 'Success', plant: 'Plant Alpha', createdBy: 'Plant Operator', createdAt: new Date('2026-07-03').toISOString() },
    { id: 'pr5', date: '2026-07-04', shift: 'Shift C', modelCode: 'M22', serialNumber: 'M222026071004', quantity: 1, status: 'Success', plant: 'Plant Alpha', createdBy: 'Plant Operator', createdAt: new Date('2026-07-04').toISOString() },
    { id: 'pr6', date: '2026-07-04', shift: 'Shift A', modelCode: 'M22', serialNumber: 'M222026071005', quantity: 1, status: 'Success', plant: 'Plant Alpha', createdBy: 'Plant Operator', createdAt: new Date('2026-07-04').toISOString() }
  ];

  const transfers: SerialTransfer[] = [
    { id: 't1', fromPlant: 'Plant Alpha', toPlant: 'Plant Beta', modelCode: 'M22', startSerial: 'M222026071003', endSerial: 'M222026071003', quantity: 1, transferDate: '2026-07-04', reason: 'Urgent replacement for site installation', status: 'Approved', approvedBy: 'Super Admin', remarks: 'Approved as requested.', createdAt: new Date('2026-07-04').toISOString() }
  ];

  const dispatches: DispatchEntry[] = [
    { id: 'd1', customerName: 'TATA Motors Ltd', invoiceNumber: 'INV-2026-001', invoiceDate: '2026-07-03', modelCode: 'M22', serialNumbers: ['M222026071000', 'M222026071001'], vehicle: 'MH-12-PQ-9876', transport: 'VRL Logistics', lrNumber: 'LR887722', status: 'Dispatched', dispatchedBy: 'Dispatch Officer', plant: 'Plant Alpha', createdAt: new Date('2026-07-03').toISOString() }
  ];

  const pdi: PDIEntry[] = [
    { id: 'pdi1', serialNumber: 'M222026071000', status: 'Approved', inspectedBy: 'QA Manager', remarks: 'Perfect voltage and specific gravity.', inspectionDate: '2026-07-02', createdAt: new Date('2026-07-02').toISOString() },
    { id: 'pdi2', serialNumber: 'M222026071001', status: 'Approved', inspectedBy: 'QA Manager', remarks: 'Passed all inspection checklists.', inspectionDate: '2026-07-02', createdAt: new Date('2026-07-02').toISOString() },
    { id: 'pdi3', serialNumber: 'M222026071003', status: 'Approved', inspectedBy: 'QA Manager', remarks: 'Passed testing', inspectionDate: '2026-07-04', createdAt: new Date('2026-07-04').toISOString() },
    { id: 'pdi4', serialNumber: 'M222026071004', status: 'Rejected', inspectedBy: 'QA Manager', remarks: 'Terminal welding leak defect.', inspectionDate: '2026-07-04', createdAt: new Date('2026-07-04').toISOString() }
  ];

  const auditLogs: AuditLog[] = [
    { id: 'log1', who: 'admin@erp.com', what: 'SYSTEM_STARTUP', when: new Date('2026-07-01').toISOString(), oldValue: 'None', newValue: 'System seeded with default enterprise values', ipAddress: '127.0.0.1' },
    { id: 'log2', who: 'qa@erp.com', what: 'CREATE_SERIAL_RANGE', when: new Date('2026-07-01').toISOString(), oldValue: 'None', newValue: 'Allotted M222026071000 - M222026071100 for Plant Alpha', ipAddress: '192.168.1.15' },
    { id: 'log3', who: 'plant@erp.com', what: 'PRODUCTION_ENTRY', when: new Date('2026-07-02').toISOString(), oldValue: 'Allotted', newValue: 'Produced serial M222026071000', ipAddress: '192.168.1.34' }
  ];

  const notifications: Notification[] = [
    { id: 'n1', message: 'Low Serial Balance Alert: Model M24 running serial range is nearly exhausted at Plant Beta.', type: 'warning', date: new Date('2026-07-05').toISOString(), read: false, modelCode: 'M24' },
    { id: 'n2', message: 'Low Serial Balance Alert: Model S15 has zero available range allocated at Plant Alpha.', type: 'danger', date: new Date('2026-07-05').toISOString(), read: false, modelCode: 'S15' },
    { id: 'n3', message: 'Transfer Request Approved: M222026071003 transfer from Plant Alpha to Plant Beta approved.', type: 'success', date: new Date('2026-07-04').toISOString(), read: true }
  ];

  return {
    users,
    userPasswords,
    plants,
    models,
    customers,
    serialRanges,
    serialNumbers,
    production,
    transfers,
    dispatches,
    pdi,
    auditLogs,
    notifications,
    pdiOffered: []
  };
}

// REST Middleware for Authorization & Authenticity
interface AuthenticatedRequest extends Request {
  user?: {
    email: string;
    role: UserRole;
    name: string;
    plant: string;
    sessionId?: string;
  };
}

function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  if (!token && req.query.token) {
    token = req.query.token as string;
  }

  if (!token) {
    res.status(401).json({ error: 'Access Denied: No Token Provided' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
    if (err) {
      res.status(403).json({ error: 'Access Denied: Invalid or Expired Token' });
      return;
    }
    if (decoded) {
      decoded.role = normalizeRole(decoded.role);
    }
    req.user = decoded;
    next();
  });
}

// Real-time SSE Clients
const sseClients: Response[] = [];

export function broadcastDashboardStats() {
  sseClients.forEach(client => {
    try {
      client.write(`data: ${JSON.stringify({ type: 'update' })}\n\n`);
    } catch (err) {
      console.error('Error broadcasting to SSE client:', err);
    }
  });
}

// Helper to parse User Agent headers
function parseUserAgent(userAgent: string) {
  let browser = 'Other';
  let os = 'Other';
  let device = 'Desktop';

  if (!userAgent) return { browser, os, device };

  const ua = userAgent.toLowerCase();

  // OS detection
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('macintosh') || ua.includes('mac os')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

  // Device detection
  if (ua.includes('mobi') || ua.includes('android') || ua.includes('iphone') || ua.includes('ipod')) {
    device = 'Mobile';
  } else if (ua.includes('ipad') || ua.includes('tablet')) {
    device = 'Tablet';
  }

  // Browser detection
  if (ua.includes('chrome') && !ua.includes('chromium') && !ua.includes('edg') && !ua.includes('opr')) browser = 'Chrome';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('edg')) browser = 'Edge';
  else if (ua.includes('opr') || ua.includes('opera')) browser = 'Opera';

  return { browser, os, device };
}

// Log audit helper
function logAudit(
  email: string,
  action: string,
  oldValue: string,
  newValue: string,
  req: Request,
  options?: {
    status?: 'Success' | 'Failed';
    remarks?: string;
    module?: string;
    description?: string;
  }
) {
  const db = readDB();
  const userObj = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

  // Detect IP, Browser, OS, Device
  const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || '';
  const { browser, os, device } = parseUserAgent(userAgent);

  // Detect Module based on action
  let module = options?.module || '';
  if (!module) {
    const act = action.toUpperCase();
    if (act.includes('LOGIN') || act.includes('LOGOUT') || act.includes('PASSWORD') || act.includes('SESSION') || act.includes('AUTH')) {
      module = 'Authentication';
    } else if (act.includes('USER')) {
      module = 'User Master';
    } else if (act.includes('PLANT')) {
      module = 'Plant Master';
    } else if (act.includes('MODEL')) {
      module = 'Model Master';
    } else if (act.includes('CUSTOMER')) {
      module = 'Customer Master';
    } else if (act.includes('ALLOT') || act.includes('RANGE')) {
      module = 'Range Allotment';
    } else if (act.includes('TRANSFER')) {
      module = 'Inter Plant Transfer';
    } else if (act.includes('PRODUCTION') || act.includes('PROD')) {
      module = 'Production';
    } else if (act.includes('PACKING') || act.includes('PACK')) {
      module = 'Packing';
    } else if (act.includes('PDI')) {
      module = 'PDI';
    } else if (act.includes('DISPATCH')) {
      module = 'Dispatch';
    } else if (act.includes('REPORT') || act.includes('EXPORT') || act.includes('DOWNLOAD') || act.includes('CSV') || act.includes('PDF')) {
      module = 'Reports';
    } else {
      module = 'General';
    }
  }

  // Get session ID from request JWT user context if available, otherwise use default
  let sessionId = 'N/A';
  if ((req as any).user && (req as any).user.sessionId) {
    sessionId = (req as any).user.sessionId;
  } else {
    // Generate a temporary session id
    sessionId = 'sess_' + email.split('@')[0];
  }

  const timestamp = new Date().toISOString();
  const status = options?.status || (action.includes('FAIL') || action.includes('UNAUTHORIZED') ? 'Failed' : 'Success');
  
  // Format description
  let description = options?.description || '';
  if (!description) {
    if (newValue && typeof newValue === 'string' && !newValue.startsWith('{') && !newValue.startsWith('[')) {
      description = newValue;
    } else {
      description = `${action.replace(/_/g, ' ')} action performed.`;
    }
  }

  const newLog: AuditLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp,
    username: userObj?.name || email,
    employeeId: userObj?.employeeId || 'N/A',
    role: userObj?.role || (email === 'admin@erp.com' ? 'Super Admin' : 'Viewer'),
    plant: userObj?.plant || 'All',
    module,
    action,
    description,
    oldValue: oldValue || 'None',
    newValue: newValue || 'None',
    status,
    ipAddress,
    device,
    browser,
    operatingSystem: os,
    sessionId,
    remarks: options?.remarks || 'None',

    // Backward compatibility keys
    who: email,
    what: action,
    when: timestamp
  };

  db.auditLogs.unshift(newLog); // Prepend to show most recent first
  writeDB(db);
}

// Helper to collapse a list of serial numbers into ranges
function collapseSerials(serials: string[]): string {
  if (!serials || serials.length === 0) return '-';
  if (serials.length === 1) return serials[0];
  
  const sorted = [...serials].sort();
  const ranges: string[] = [];
  let rangeStart = sorted[0];
  let rangeEnd = sorted[0];
  
  const isConsecutive = (s1: string, s2: string) => {
    const m1 = s1.match(/\d+$/);
    const m2 = s2.match(/\d+$/);
    if (m1 && m2) {
      const p1 = s1.substring(0, s1.length - m1[0].length);
      const p2 = s2.substring(0, s2.length - m2[0].length);
      if (p1 === p2) {
        const n1 = parseInt(m1[0], 10);
        const n2 = parseInt(m2[0], 10);
        return n2 === n1 + 1;
      }
    }
    return false;
  };

  for (let i = 1; i < sorted.length; i++) {
    if (isConsecutive(rangeEnd, sorted[i])) {
      rangeEnd = sorted[i];
    } else {
      ranges.push(rangeStart === rangeEnd ? rangeStart : `${rangeStart} - ${rangeEnd}`);
      rangeStart = sorted[i];
      rangeEnd = sorted[i];
    }
  }
  ranges.push(rangeStart === rangeEnd ? rangeStart : `${rangeStart} - ${rangeEnd}`);
  
  const display = ranges.join(', ');
  if (display.length > 80) {
    return `${sorted[0]} - ${sorted[sorted.length - 1]} (${sorted.length} units)`;
  }
  return display;
}

// Helper to record / update First Time Hold history
function updateFirstTimeHoldHistory(db: ERPDatabase, serialNumber: string, status: 'Approved' | 'Hold' | 'Rejected', remarks: string, user: string, rangeContext?: string) {
  if (!db.firstTimeHoldHistory) {
    db.firstTimeHoldHistory = [];
  }

  const serial = db.serialNumbers.find(s => s.serialNumber === serialNumber);
  const plant = serial?.currentPlant || 'Plant Alpha';
  const model = serial?.modelCode || 'Unknown';
  const lotNo = serial?.year ? `${serial.year}${serial.month}` : 'Unknown';
  const holdReason = remarks || 'PDI Inspection Hold';

  if (status === 'Hold') {
    const activeHold = db.firstTimeHoldHistory.find(h => h.serialNumber === serialNumber && h.currentStatus === 'Hold');
    if (!activeHold) {
      const newHoldIncident = {
        id: `hold-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        holdDate: new Date().toISOString().split('T')[0],
        inspectionTime: new Date().toLocaleTimeString(),
        plant,
        model,
        location: plant,
        lotNumber: lotNo,
        serialNumber,
        serialNumberRange: rangeContext || serialNumber,
        holdReason,
        holdCategory: remarks.includes('[Rework') ? 'Rework Defect' : 'PDI Defect',
        holdBy: user,
        currentStatus: 'Hold',
        remarks,
        statusHistory: [
          {
            status: 'Hold',
            changedAt: new Date().toISOString(),
            changedBy: user,
            remarks
          }
        ]
      };
      db.firstTimeHoldHistory.push(newHoldIncident);
    }
  } else if (status === 'Approved' || status === 'Rejected') {
    const activeHolds = db.firstTimeHoldHistory.filter(h => h.serialNumber === serialNumber && h.currentStatus === 'Hold');
    activeHolds.forEach(hold => {
      const releaseDate = new Date().toISOString().split('T')[0];
      const holdDuration = Math.max(1, Math.floor((new Date(releaseDate).getTime() - new Date(hold.holdDate).getTime()) / (1000 * 60 * 60 * 24)));
      
      hold.releaseDate = releaseDate;
      hold.releasedBy = user;
      hold.holdDuration = holdDuration;
      hold.currentStatus = status === 'Approved' ? 'Released' : 'Rejected';
      hold.statusHistory.push({
        status: status === 'Approved' ? 'Released' : 'Rejected',
        changedAt: new Date().toISOString(),
        changedBy: user,
        remarks: remarks || `Rework clearance: ${status}`
      });
    });
  }
}

// Low Serial balance checkers & triggers
function checkLowSerialBalance(db: ERPDatabase, modelCode: string, plantName: string) {
  // Find model
  const model = db.models.find(m => m.code === modelCode);
  if (!model) return;

  // Count remaining serial numbers available
  const currentVal = parseInt(model.currentSerial);
  const maxVal = parseInt(model.endSerial);
  const remaining = maxVal - currentVal;

  if (remaining < 20 && remaining > 0) {
    const alertMsg = `Low Serial Balance Alert: Model ${model.code} (${model.name}) is running low on unallotted serial numbers (${remaining} left).`;
    const exists = db.notifications.some(n => n.message.includes(modelCode) && !n.read && n.type === 'warning');
    if (!exists) {
      db.notifications.unshift({
        id: `n-${Date.now()}`,
        message: alertMsg,
        type: 'warning',
        date: new Date().toISOString(),
        read: false,
        modelCode: model.code
      });
    }
  } else if (remaining <= 0) {
    const alertMsg = `Low Serial Balance Alert: Model ${model.code} (${model.name}) has fully exhausted its configured serial number range.`;
    const exists = db.notifications.some(n => n.message.includes(modelCode) && !n.read && n.type === 'danger');
    if (!exists) {
      db.notifications.unshift({
        id: `n-${Date.now()}`,
        message: alertMsg,
        type: 'danger',
        date: new Date().toISOString(),
        read: false,
        modelCode: model.code
      });
    }
  }
}

/**
 * Creates the API application for both the local Express server and Vercel's
 * serverless function runtime.
 */
export async function createApp() {
  const app = express();
  app.use(express.json());

  // Serverless invocations do not share process memory. Keep the selected
  // environment in the browser and apply it to every API request.
  app.use((req, _res, next) => {
    const requestedEnvironment = req.header('x-erp-environment');
    if (requestedEnvironment === 'demo' || requestedEnvironment === 'live') {
      currentEnvironment = requestedEnvironment;
    }
    next();
  });

  // Setup sample DB file initially
  readDB();

  // API - ENVIRONMENT
  app.get('/api/environment', (req: Request, res: Response) => {
    res.json({ environment: currentEnvironment });
  });

  app.post('/api/environment', (req: Request, res: Response) => {
    const { environment } = req.body;
    if (environment === 'live' || environment === 'demo') {
      currentEnvironment = environment;
      readDB();
      res.json({ success: true, environment: currentEnvironment });
    } else {
      res.status(400).json({ error: 'Invalid environment' });
    }
  });

  // API - AUTHENTICATION
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { employeeId, email, password } = req.body;
    const identifier = employeeId || email;
    if (!identifier || !password) {
      res.status(400).json({ error: 'Employee ID or email, and password are required' });
      return;
    }

    const db = readDB();
    const user = db.users.find(u => 
      (u.employeeId && u.employeeId.toLowerCase() === identifier.toLowerCase()) ||
      (u.email && u.email.toLowerCase() === identifier.toLowerCase())
    );
    if (!user) {
      // Log failed login
      logAudit(identifier, 'LOGIN_FAILED', '', `Failed login attempt: User not found`, req, {
        status: 'Failed',
        remarks: 'Invalid employee identifier or email',
        description: `Failed login attempt for identifier '${identifier}' (user not found)`
      });
      res.status(401).json({ error: 'Invalid Employee ID/email or password' });
      return;
    }

    const hashedPassword = db.userPasswords[user.email];
    if (!hashedPassword || !bcrypt.compareSync(password, hashedPassword)) {
      // Log failed login
      logAudit(user.email, 'LOGIN_FAILED', '', `Failed login attempt: Incorrect password`, req, {
        status: 'Failed',
        remarks: 'Incorrect password entered',
        description: `Failed login attempt for ${user.email} (incorrect password)`
      });
      res.status(401).json({ error: 'Invalid Employee ID/email or password' });
      return;
    }

    // Generate a unique session identifier
    const sessionId = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);

    // Generate JWT including sessionId
    const token = jwt.sign(
      { email: user.email, role: normalizeRole(user.role), name: user.name, plant: user.plant, sessionId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    logAudit(user.email, 'LOGIN_SUCCESS', '', `${user.name} logged in successfully`, req, {
      remarks: 'Browser login with credentials'
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: normalizeRole(user.role),
        plant: user.plant,
        employeeId: user.employeeId,
        authorizations: user.authorizations
      }
    });
  });

  app.get('/api/auth/me', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const db = readDB();
    const user = db.users.find(u => u.email === req.user?.email);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: normalizeRole(user.role),
        plant: user.plant,
        employeeId: user.employeeId,
        authorizations: user.authorizations
      }
    });
  });

  // API - PLANTS (CRUD)
  app.get('/api/plants', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const db = readDB();
    res.json(db.plants);
  });

  app.post('/api/plants', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'Super Admin') {
      res.status(430).json({ error: 'Forbidden: Super Admin only' });
      return;
    }
    const { name, location } = req.body;
    if (!name || !location) {
      res.status(400).json({ error: 'Plant Name and Location are required' });
      return;
    }

    const db = readDB();
    if (db.plants.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      res.status(400).json({ error: 'Plant with this name already exists' });
      return;
    }

    const newPlant: Plant = {
      id: `p-${Date.now()}`,
      name,
      location,
      createdAt: new Date().toISOString()
    };

    db.plants.push(newPlant);
    writeDB(db);

    logAudit(req.user.email, 'CREATE_PLANT', '', `Created plant: ${name}`, req);
    res.status(201).json(newPlant);
  });

  app.put('/api/plants/:id', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'Super Admin') {
      res.status(403).json({ error: 'Forbidden: Super Admin only' });
      return;
    }
    const { name, location } = req.body;
    const db = readDB();
    const index = db.plants.findIndex(p => p.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }

    const oldVal = JSON.stringify(db.plants[index]);
    db.plants[index].name = name || db.plants[index].name;
    db.plants[index].location = location || db.plants[index].location;
    writeDB(db);

    logAudit(req.user.email, 'UPDATE_PLANT', oldVal, JSON.stringify(db.plants[index]), req);
    res.json(db.plants[index]);
  });

  app.delete('/api/plants/:id', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const db = readDB();
    const userObj = db.users.find(u => u.email === req.user?.email);
    const hasDeletePermission = req.user?.role === 'Super Admin' || (userObj?.authorizations?.plantMaster?.delete === true);
    if (!hasDeletePermission) {
      res.status(403).json({ error: 'Forbidden: Unauthorized to delete plants' });
      return;
    }
    const index = db.plants.findIndex(p => p.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }

    const plantName = db.plants[index].name;
    // Check constraints
    if (db.models.some(m => m.plant === plantName)) {
      res.status(400).json({ error: 'Cannot delete plant. It is linked to existing Models.' });
      return;
    }

    const oldVal = JSON.stringify(db.plants[index]);
    db.plants.splice(index, 1);
    writeDB(db);

    logAudit(req.user.email, 'DELETE_PLANT', oldVal, '', req);
    res.json({ message: 'Plant deleted successfully' });
  });

  // API - MODELS (CRUD)
  app.get('/api/models', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const db = readDB();
    res.json(db.models);
  });

  app.post('/api/models', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'Super Admin' && req.user?.role !== 'QA') {
      res.status(403).json({ error: 'Forbidden: QA or Super Admin only' });
      return;
    }
    const { name, code, batteryType, capacity, startSerial, endSerial, customerName, status } = req.body;
    if (!name || !code || !batteryType || !capacity) {
      res.status(400).json({ error: 'Model Name, Prefix Code, Battery Tech Type, and Capacity are required' });
      return;
    }

    const cleanCode = code.toString().trim().toUpperCase();
    const cleanName = name.toString().trim();
    const cleanCustomer = (customerName || '').toString().trim();

    const db = readDB();

    // Avoid Duplicate Model for Same Associated Customer
    const dupModel = db.models.find(m => {
      const isSameCustomer = (m.customerName || '').toLowerCase().trim() === cleanCustomer.toLowerCase();
      const isSameCode = m.code.toUpperCase().trim() === cleanCode;
      const isSameName = m.name.toLowerCase().trim() === cleanName.toLowerCase();
      return isSameCustomer && (isSameCode || isSameName);
    });

    if (dupModel) {
      res.status(400).json({ error: `A battery model with name '${cleanName}' or prefix '${cleanCode}' already exists for customer '${cleanCustomer || 'None'}'.` });
      return;
    }

    const finalStartSerial = startSerial || '1000';
    const finalEndSerial = endSerial || '999999';

    const newModel: BatteryModel = {
      id: `m-${Date.now()}`,
      name: cleanName,
      code: cleanCode,
      batteryType,
      capacity,
      startSerial: finalStartSerial,
      endSerial: finalEndSerial,
      currentSerial: finalStartSerial,
      plant: '',
      customerName: cleanCustomer,
      status: status || 'Active',
      createdAt: new Date().toISOString()
    };

    db.models.push(newModel);
    writeDB(db);

    logAudit(req.user.email, 'CREATE_MODEL', '', `Created Battery Model: ${cleanName} (${cleanCode})`, req);
    res.status(201).json(newModel);
  });

  app.post('/api/models/bulk', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'Super Admin' && req.user?.role !== 'QA') {
      res.status(403).json({ error: 'Forbidden: QA or Super Admin only' });
      return;
    }
    const { rows } = req.body;
    if (!rows || !Array.isArray(rows)) {
      res.status(400).json({ error: 'Invalid payload structure. Array of rows required.' });
      return;
    }

    const db = readDB();
    const errors: string[] = [];
    const validatedModels: BatteryModel[] = [];

    // Helper to find a value by flexible header names
    const findVal = (row: any, keys: string[]) => {
      const matchedKey = Object.keys(row).find(k => 
        keys.some(key => k.toLowerCase().replace(/[^a-z0-9]/g, '') === key.toLowerCase().replace(/[^a-z0-9]/g, ''))
      );
      return matchedKey ? row[matchedKey] : '';
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const nameVal = findVal(row, ['Model Name', 'Name', 'Model Description', 'modelName', 'description']).toString().trim();
      const codeVal = findVal(row, ['Model Prefix Code', 'Prefix', 'Code', 'Model Code', 'modelCode', 'prefixCode']).toString().trim().toUpperCase();
      let batteryTypeVal = findVal(row, ['Battery Tech Type', 'Tech Type', 'Type', 'batteryType', 'techType']).toString().trim().toUpperCase();
      let capacityVal = findVal(row, ['Capacity Rating', 'Capacity', 'Ah', 'capacityRating', 'capacity']).toString().trim();
      const customerNameVal = findVal(row, ['Associated Customer', 'Customer', 'Customer Name', 'customerName', 'associatedCustomer']).toString().trim();
      const statusVal = findVal(row, ['Status', 'Initial Status', 'status']).toString().trim();

      if (!nameVal || !codeVal) {
        errors.push(`Row ${i + 1}: Missing Model Name or Model Prefix Code.`);
        continue;
      }

      // Normalize battery tech type
      if (!['TT', 'ST', 'JT', 'XLJT'].includes(batteryTypeVal)) {
        batteryTypeVal = 'TT'; // Default fallback
      }

      // Normalize capacity rating
      if (capacityVal) {
        const digits = capacityVal.replace(/[^0-9]/g, '');
        if (digits) {
          capacityVal = `${digits}Ah`;
        } else if (!capacityVal.endsWith('Ah')) {
          capacityVal = `${capacityVal}Ah`;
        }
      } else {
        capacityVal = '150Ah'; // Default fallback
      }

      const finalStatus = (statusVal && statusVal.toLowerCase() === 'inactive') ? 'Inactive' : 'Active';

      // Check self-overlap inside the uploaded file itself
      const selfDup = validatedModels.find(m => {
        const isSameCustomer = (m.customerName || '').toLowerCase().trim() === customerNameVal.toLowerCase();
        const isSameCode = m.code === codeVal;
        const isSameName = m.name.toLowerCase() === nameVal.toLowerCase();
        return isSameCustomer && (isSameCode || isSameName);
      });

      if (selfDup) {
        errors.push(`Row ${i + 1}: Duplicate Model Name '${nameVal}' or Prefix '${codeVal}' for customer '${customerNameVal || 'None'}' within the import file.`);
        continue;
      }

      // Check database duplicates
      const dbDup = db.models.find(m => {
        const isSameCustomer = (m.customerName || '').toLowerCase().trim() === customerNameVal.toLowerCase();
        const isSameCode = m.code.toUpperCase() === codeVal;
        const isSameName = m.name.toLowerCase() === nameVal.toLowerCase();
        return isSameCustomer && (isSameCode || isSameName);
      });

      if (dbDup) {
        errors.push(`Row ${i + 1}: Model '${nameVal}' or Prefix '${codeVal}' already exists in database for customer '${customerNameVal || 'None'}'.`);
        continue;
      }

      // Validate customer existance if provided
      let customerMatchedName = '';
      if (customerNameVal) {
        const matchedC = db.customers.find(c => c.name.toLowerCase() === customerNameVal.toLowerCase());
        if (matchedC) {
          customerMatchedName = matchedC.name;
        } else {
          errors.push(`Row ${i + 1}: Associated Customer '${customerNameVal}' does not exist in ERP. Please configure customer first.`);
          continue;
        }
      }

      validatedModels.push({
        id: `m-${Date.now()}-${i}`,
        name: nameVal,
        code: codeVal,
        batteryType: batteryTypeVal,
        capacity: capacityVal,
        startSerial: '1000',
        endSerial: '999999',
        currentSerial: '1000',
        plant: '',
        customerName: customerMatchedName,
        status: finalStatus,
        createdAt: new Date().toISOString()
      });
    }

    if (errors.length > 0) {
      res.status(200).json({
        success: false,
        imported: 0,
        errors
      });
      return;
    }

    // Add all to db
    db.models.push(...validatedModels);
    writeDB(db);

    logAudit(req.user.email, 'BULK_IMPORT_MODELS', '', `Imported ${validatedModels.length} battery models via bulk Excel upload.`, req);
    res.json({
      success: true,
      imported: validatedModels.length,
      errors: []
    });
  });

  app.put('/api/models/:id', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'Super Admin' && req.user?.role !== 'QA') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const { name, batteryType, capacity, status, customerName } = req.body;
    const db = readDB();
    const index = db.models.findIndex(m => m.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Model not found' });
      return;
    }

    const oldVal = JSON.stringify(db.models[index]);
    db.models[index].name = name || db.models[index].name;
    db.models[index].batteryType = batteryType || db.models[index].batteryType;
    db.models[index].capacity = capacity || db.models[index].capacity;
    db.models[index].customerName = customerName !== undefined ? customerName : db.models[index].customerName;
    db.models[index].status = status || db.models[index].status;
    writeDB(db);

    logAudit(req.user.email, 'UPDATE_MODEL', oldVal, JSON.stringify(db.models[index]), req);
    res.json(db.models[index]);
  });

  app.delete('/api/models/:id', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const db = readDB();
    const userObj = db.users.find(u => u.email === req.user?.email);
    const hasDeletePermission = req.user?.role === 'Super Admin' || (userObj?.authorizations?.modelMaster?.delete === true);
    if (!hasDeletePermission) {
      res.status(403).json({ error: 'Forbidden: Unauthorized to delete models' });
      return;
    }
    const index = db.models.findIndex(m => m.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'Model not found' });
      return;
    }

    const modelCode = db.models[index].code;
    const isUsed = db.serialNumbers.some(sn => sn.modelCode === modelCode) ||
                   db.production.some(pe => pe.modelCode === modelCode) ||
                   db.serialRanges.some(al => al.modelCode === modelCode);

    if (isUsed) {
      res.status(400).json({ error: 'Cannot delete model. It has active serial allotments, production history, or serial number records.' });
      return;
    }

    const oldVal = JSON.stringify(db.models[index]);
    db.models.splice(index, 1);
    writeDB(db);

    logAudit(req.user.email, 'DELETE_MODEL', oldVal, '', req);
    res.json({ message: 'Model deleted successfully' });
  });

  // API - CUSTOMERS (CRUD)
  app.get('/api/customers', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const db = readDB();
    res.json(db.customers);
  });

  app.post('/api/customers', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const { name, code, address, gst, state, totalDigitsOfSerial, numericDigitsOfSerial, uniqueCode, uniqueCodeLength, authorizations } = req.body;
    if (!name || !code || !gst || !state) {
      res.status(400).json({ error: 'Customer Name, Code, GST, and State are required' });
      return;
    }

    const db = readDB();
    if (db.customers.some(c => c.code.toLowerCase() === code.toLowerCase())) {
      res.status(400).json({ error: 'Customer with this Code already exists' });
      return;
    }

    const totDigits = totalDigitsOfSerial ? parseInt(totalDigitsOfSerial, 10) : undefined;
    const numDigits = numericDigitsOfSerial ? parseInt(numericDigitsOfSerial, 10) : undefined;

    if (totDigits && (isNaN(totDigits) || totDigits <= 0)) {
      res.status(400).json({ error: 'Total Digit of Serial Number must be a positive number' });
      return;
    }
    if (numDigits && (isNaN(numDigits) || numDigits <= 0)) {
      res.status(400).json({ error: 'Numeric Digit of Serial Number must be a positive number' });
      return;
    }
    if (totDigits && numDigits && numDigits >= totDigits) {
      res.status(400).json({ error: 'Numeric digits cannot be greater than or equal to total digits' });
      return;
    }

    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      name,
      code,
      address,
      gst,
      state,
      totalDigitsOfSerial: totDigits,
      numericDigitsOfSerial: numDigits,
      uniqueCode,
      uniqueCodeLength: uniqueCodeLength ? parseInt(uniqueCodeLength, 10) : undefined,
      authorizations: authorizations || { login: false },
      createdAt: new Date().toISOString()
    };

    db.customers.push(newCustomer);
    writeDB(db);

    logAudit(req.user?.email || 'System', 'CREATE_CUSTOMER', '', `Created Customer: ${name}`, req);
    res.status(201).json(newCustomer);
  });

  app.put('/api/customers/:id', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { name, code, address, gst, state, totalDigitsOfSerial, numericDigitsOfSerial, uniqueCode, uniqueCodeLength, authorizations } = req.body;
    
    if (!name || !code || !gst || !state) {
      res.status(400).json({ error: 'Customer Name, Code, GST, and State are required' });
      return;
    }
    
    const db = readDB();
    const index = db.customers.findIndex(c => c.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    
    const totDigits = totalDigitsOfSerial ? parseInt(totalDigitsOfSerial, 10) : undefined;
    const numDigits = numericDigitsOfSerial ? parseInt(numericDigitsOfSerial, 10) : undefined;
    
    if (totDigits && (isNaN(totDigits) || totDigits <= 0)) {
      res.status(400).json({ error: 'Total Digit of Serial Number must be a positive number' });
      return;
    }
    if (numDigits && (isNaN(numDigits) || numDigits <= 0)) {
      res.status(400).json({ error: 'Numeric Digit of Serial Number must be a positive number' });
      return;
    }
    if (totDigits && numDigits && numDigits >= totDigits) {
      res.status(400).json({ error: 'Numeric digits cannot be greater than or equal to total digits' });
      return;
    }
    
    const oldVal = JSON.stringify(db.customers[index]);
    db.customers[index] = {
      ...db.customers[index],
      name,
      code: code.toUpperCase(),
      address: address || '',
      gst: gst.toUpperCase(),
      state,
      totalDigitsOfSerial: totDigits,
      numericDigitsOfSerial: numDigits,
      uniqueCode,
      uniqueCodeLength: uniqueCodeLength ? parseInt(uniqueCodeLength, 10) : undefined,
      authorizations: authorizations || db.customers[index].authorizations
    };
    
    writeDB(db);
    logAudit(req.user?.email || 'System', 'UPDATE_CUSTOMER', oldVal, `Updated Customer: ${name}`, req);
    res.json(db.customers[index]);
  });

  app.delete('/api/customers/:id', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const db = readDB();
    const userObj = db.users.find(u => u.email === req.user?.email);
    const hasDeletePermission = req.user?.role === 'Super Admin' || (userObj?.authorizations?.customerMaster?.delete === true);
    if (!hasDeletePermission) {
      res.status(403).json({ error: 'Forbidden: Unauthorized to delete customers' });
      return;
    }
    const index = db.customers.findIndex(c => c.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    
    const oldVal = JSON.stringify(db.customers[index]);
    db.customers.splice(index, 1);
    writeDB(db);
    logAudit(req.user?.email || 'System', 'DELETE_CUSTOMER', oldVal, '', req);
    res.json({ message: 'Customer deleted successfully' });
  });

  // API - USER MANAGEMENT (CRUD)
  app.get('/api/users', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'Super Admin') {
      res.status(403).json({ error: 'Forbidden: Super Admin only' });
      return;
    }
    const db = readDB();
    res.json(db.users);
  });

  app.post('/api/users', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'Super Admin') {
      res.status(403).json({ error: 'Forbidden: Super Admin only' });
      return;
    }
    const { name, employeeId, email, role, password, plant, authorizations } = req.body;
    if (!name || !employeeId || !email || !role || !password || !plant) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

    const db = readDB();
    if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      res.status(400).json({ error: 'User with this email already exists' });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const newUser: User = {
      id: `u-${Date.now()}`,
      name,
      employeeId,
      email: email.toLowerCase(),
      role,
      plant,
      authorizations: authorizations || undefined,
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    db.userPasswords[newUser.email] = hashedPassword;
    writeDB(db);

    logAudit(req.user.email, 'CREATE_USER', '', `Created user: ${name} (${role})`, req);
    res.status(201).json(newUser);
  });

  app.put('/api/users/:id', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'Super Admin') {
      res.status(403).json({ error: 'Forbidden: Super Admin only' });
      return;
    }
    const { name, employeeId, role, plant, password, authorizations } = req.body;
    const db = readDB();
    const index = db.users.findIndex(u => u.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const oldVal = JSON.stringify(db.users[index]);
    db.users[index].name = name || db.users[index].name;
    db.users[index].employeeId = employeeId || db.users[index].employeeId;
    db.users[index].role = role || db.users[index].role;
    db.users[index].plant = plant || db.users[index].plant;
    if (authorizations !== undefined) {
      db.users[index].authorizations = authorizations;
    }

    if (password) {
      const salt = bcrypt.genSaltSync(10);
      db.userPasswords[db.users[index].email] = bcrypt.hashSync(password, salt);
    }

    writeDB(db);
    logAudit(req.user.email, 'UPDATE_USER', oldVal, JSON.stringify(db.users[index]), req);
    res.json(db.users[index]);
  });

  app.delete('/api/users/:id', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'Super Admin') {
      res.status(403).json({ error: 'Forbidden: Super Admin only' });
      return;
    }
    const db = readDB();
    const index = db.users.findIndex(u => u.id === req.params.id);
    if (index === -1) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (db.users[index].email === req.user.email) {
      res.status(400).json({ error: 'Cannot delete yourself' });
      return;
    }

    const oldVal = JSON.stringify(db.users[index]);
    delete db.userPasswords[db.users[index].email];
    db.users.splice(index, 1);
    writeDB(db);

    logAudit(req.user.email, 'DELETE_USER', oldVal, '', req);
    res.json({ message: 'User deleted successfully' });
  });

  // API - SERIAL RANGE ALLOTMENT (QA Allotment)
  app.get('/api/allotments', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const db = readDB();
    const userPlant = req.user?.plant;
    let ranges = db.serialRanges;
    if (userPlant && userPlant !== 'All' && req.user?.role === 'Production') {
      ranges = ranges.filter(r => r.plantName === userPlant);
    }
    
    // Add pending to pack count
    ranges = ranges.map(r => {
       const pendingCount = db.serialNumbers.filter(sn => 
          sn.serialNumber >= r.startSerial && 
          sn.serialNumber <= r.endSerial && 
          sn.modelCode === r.modelCode &&
          (sn.packingStatus || 'Not Packed') === 'Not Packed'
       ).length;
       return { ...r, pendingCount };
    });

    res.json(ranges);
  });

  app.post('/api/allotments', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'QA' && req.user?.role !== 'Super Admin') {
      res.status(403).json({ error: 'Forbidden: Only QA can allot serial range' });
      return;
    }

    const { date, modelCode, plantName, startSerialNum, endSerialNum, remarks, customerName, year, month, serialCode, status } = req.body;
    if (!date || !modelCode || !plantName || !startSerialNum || !endSerialNum) {
      res.status(400).json({ error: 'All fields (Date, Model, Plant, Start Serial, End Serial) are required.' });
      return;
    }

    const sNum = parseInt(startSerialNum, 10);
    const eNum = parseInt(endSerialNum, 10);
    if (isNaN(sNum) || isNaN(eNum) || sNum > eNum) {
      res.status(400).json({ error: 'Invalid range. Start serial must be <= End serial.' });
      return;
    }

    const db = readDB();
    const model = db.models.find(m => m.code === modelCode);
    if (!model) {
      res.status(404).json({ error: 'Battery model not found.' });
      return;
    }

    // Range boundaries are no longer restricted on the model level
    const qty = eNum - sNum + 1;
    if (qty <= 0) {
      res.status(400).json({ error: 'Quantity must be positive' });
      return;
    }

    // Determine padding length from customer
    let digitsLength = startSerialNum.length || (customerName ? db.customers.find(c => c.name === customerName)?.numericDigitsOfSerial || 4 : 4);
    if (customerName) {
      const customer = db.customers.find(c => c.name === customerName);
      if (customer && customer.numericDigitsOfSerial) {
        digitsLength = customer.numericDigitsOfSerial;
      }
    }

    // Determine year and month from input overrides or fallback to date
    const curYear = year ? year.toString() : new Date(date).getFullYear().toString();
    const curMonth = month ? month.toString().padStart(2, '0') : String(new Date(date).getMonth() + 1).padStart(2, '0');
    
    // Determine the prefix
    let prefix = serialCode ? serialCode : `${modelCode}`;

    if (customerName) {
      const customer = db.customers.find(c => c.name.toLowerCase() === customerName.toLowerCase());
      if (customer && customer.uniqueCodeLength) {
        if (prefix.length !== customer.uniqueCodeLength) {
          res.status(400).json({ error: `Unique Code / Model Code prefix '${prefix}' must be exactly ${customer.uniqueCodeLength} characters for customer '${customerName}'.` });
          return;
        }
      }
    }


    // Build absolute serial codes
    const startSerialCode = `${prefix}${String(sNum).padStart(digitsLength, '0')}`;
    const endSerialCode = `${prefix}${String(eNum).padStart(digitsLength, '0')}`;

    // Overlapping ranges check (Customer wise, no duplicate number)
    // To ensure no duplicate number across the system, check if ANY of the full serial numbers already exist.
    // Or if customer wise is needed, we can just check if it exists in db.serialNumbers
    let hasDuplicate = false;
    for (let i = sNum; i <= eNum; i++) {
      const sCode = `${prefix}${String(i).padStart(digitsLength, '0')}`;
      const existing = db.serialNumbers.find(sn => sn.serialNumber === sCode);
      if (existing) {
        if (customerName && existing.customerName === customerName) {
           hasDuplicate = true;
           break;
        } else if (!customerName) {
           hasDuplicate = true;
           break;
        }
      }
    }

    if (hasDuplicate) {
      res.status(400).json({ error: `Overlap detected. One or more serial numbers in this range are already allotted to this customer.` });
      return;
    }

    // Add allotment
    const newAllotment: SerialRangeAllotment = {
      id: `allot-${Date.now()}`,
      date,
      modelCode,
      plantName,
      startSerial: startSerialCode,
      endSerial: endSerialCode,
      quantity: qty,
      remarks: remarks || '',
      allottedBy: req.user?.name || 'QA',
      createdAt: new Date().toISOString(),
      customerName: customerName || '',
      year: curYear,
      month: curMonth,
      digitsLength,
      serialCode,
      status: status || 'Active'
    };

    db.serialRanges.push(newAllotment);

    // Update current running serial of the model to end of this range
    const modelIndex = db.models.findIndex(m => m.code === modelCode);
    if (modelIndex !== -1) {
      db.models[modelIndex].currentSerial = String(eNum + 1);
    }

    // Also populate serial numbers records as 'Allotted' status
    for (let i = sNum; i <= eNum; i++) {
      const sCode = `${prefix}${String(i).padStart(digitsLength, '0')}`;
      if (!db.serialNumbers.some(sn => sn.serialNumber === sCode)) {
        db.serialNumbers.push({
          serialNumber: sCode,
          modelCode,
          year: curYear,
          month: curMonth,
          runningNumber: String(i).padStart(digitsLength, '0'),
          status: 'Allotted',
          currentPlant: plantName,
          customerName: customerName || '',
          inventoryStatus: status === 'Inactive' ? 'Hold' : 'Available',
          packingStatus: 'Not Packed',
          createdAt: new Date().toISOString()
        });
      }
    }

    writeDB(db);
    broadcastDashboardStats();

    logAudit(req.user.email, 'ALLOT_SERIAL_RANGE', '', `Allotted ${qty} serials of ${modelCode} (${startSerialCode} to ${endSerialCode}) to ${plantName}`, req);
    res.status(201).json(newAllotment);
  });

  app.put('/api/allotments/:id', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { date, remarks, customerName, modelCode, plantName, year, month, startSerialNum, endSerialNum, serialCode, status } = req.body;
    
    const db = readDB();
    const index = db.serialRanges.findIndex(r => r.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Allotment not found' });
      return;
    }
    
    const allotment = db.serialRanges[index];
    const oldVal = JSON.stringify(allotment);

    // Convert old startSerial & endSerial back to numeric running numbers
    const rDigits = allotment.digitsLength || 6;
    const oldSNum = parseInt(allotment.startSerial.slice(-rDigits), 10);
    const oldENum = parseInt(allotment.endSerial.slice(-rDigits), 10);
    const oldPrefix = allotment.serialCode || `${allotment.modelCode}${allotment.year || new Date(allotment.date).getFullYear().toString()}${allotment.month || String(new Date(allotment.date).getMonth() + 1).padStart(2, '0')}`;
    
    const newSNum = startSerialNum ? parseInt(startSerialNum, 10) : oldSNum;
    const newENum = endSerialNum ? parseInt(endSerialNum, 10) : oldENum;

    const targetModelCode = modelCode || allotment.modelCode;
    const targetPlantName = plantName || allotment.plantName;
    const targetYear = year || allotment.year || new Date(date || allotment.date).getFullYear().toString();
    const targetMonth = month || allotment.month || String(new Date(date || allotment.date).getMonth() + 1).padStart(2, '0');
    
    
    let newPrefix = serialCode !== undefined ? (serialCode || `${targetModelCode}`) : oldPrefix;

    const newStatus = status || allotment.status || 'Active';

    let newRDigits = rDigits;
    const targetCustomerName = customerName !== undefined ? customerName : allotment.customerName;
    if (targetCustomerName) {
      const customer = db.customers.find(c => c.name === targetCustomerName);
      if (customer && customer.numericDigitsOfSerial) {
        newRDigits = customer.numericDigitsOfSerial;
      }
    }
    const isCustomerChanged = targetCustomerName !== allotment.customerName || newRDigits !== allotment.digitsLength;


    const isRangeChanged = 
      targetModelCode !== allotment.modelCode || 
      targetPlantName !== allotment.plantName || 
      targetYear !== allotment.year || 
      targetMonth !== allotment.month || 
      newSNum !== oldSNum || 
      newENum !== oldENum ||
      newPrefix !== oldPrefix ||
      isCustomerChanged;

    if (isRangeChanged) {
      // 1. Generate old serial codes to verify none are advanced
      const oldSerialCodes: string[] = [];
      for (let i = oldSNum; i <= oldENum; i++) {
        oldSerialCodes.push(`${oldPrefix}${String(i).padStart(rDigits, '0')}`);
      }
      
      const activeSerials = db.serialNumbers.filter(sn => oldSerialCodes.includes(sn.serialNumber) && sn.status !== 'Allotted');
      if (activeSerials.length > 0) {
        res.status(400).json({ error: 'Cannot modify allotment range bounds. Some serial numbers in this range have already been produced or processed.' });
        return;
      }
      
      // Overlap check for new range
      let hasDuplicate = false;
      for (let i = newSNum; i <= newENum; i++) {
        const sCode = `${newPrefix}${String(i).padStart(newRDigits, '0')}`;
        // Skip checking against old serial codes of this same allotment
        if (oldSerialCodes.includes(sCode)) continue;
        const existing = db.serialNumbers.find(sn => sn.serialNumber === sCode);
        if (existing) {
           hasDuplicate = true;
           break;
        }
      }
      if (hasDuplicate) {
        res.status(400).json({ error: `Overlap detected. One or more serial numbers in this range are already allotted.` });
        return;
      }
      
      // 2. Delete old allotted serial records
      db.serialNumbers = db.serialNumbers.filter(sn => !oldSerialCodes.includes(sn.serialNumber));
      
      // 3. Generate new serial codes
      const qty = newENum - newSNum + 1;
      const previewStart = `${newPrefix}${String(newSNum).padStart(newRDigits, '0')}`;
      const previewEnd = `${newPrefix}${String(newENum).padStart(newRDigits, '0')}`;
      
      for (let i = newSNum; i <= newENum; i++) {
        const sCode = `${newPrefix}${String(i).padStart(newRDigits, '0')}`;
        if (!db.serialNumbers.some(sn => sn.serialNumber === sCode)) {
          db.serialNumbers.push({
            serialNumber: sCode,
            modelCode: targetModelCode,
            year: targetYear,
            month: targetMonth,
            runningNumber: String(i).padStart(newRDigits, '0'),
            status: 'Allotted',
            currentPlant: targetPlantName,
            customerName: customerName !== undefined ? customerName : (allotment.customerName || ''),
            inventoryStatus: newStatus === 'Inactive' ? 'Hold' : 'Available',
            packingStatus: 'Not Packed',
            createdAt: new Date().toISOString()
          });
        }
      }
      
      db.serialRanges[index] = {
        ...allotment,
        date: date || allotment.date,
        modelCode: targetModelCode,
        plantName: targetPlantName,
        year: targetYear,
        month: targetMonth,
        startSerial: previewStart,
        endSerial: previewEnd,
        quantity: qty,
        remarks: remarks !== undefined ? remarks : allotment.remarks,
        customerName: customerName !== undefined ? customerName : allotment.customerName,
        serialCode: newPrefix === `${targetModelCode}` ? '' : newPrefix,
        digitsLength: newRDigits,
        status: newStatus
      };
    } else {
      // Just updating metadata or status
      db.serialRanges[index] = {
        ...allotment,
        date: date || allotment.date,
        remarks: remarks !== undefined ? remarks : allotment.remarks,
        customerName: customerName !== undefined ? customerName : allotment.customerName,
        status: newStatus
      };

      // Sync status to serial numbers
      if (newStatus !== allotment.status) {
         for (let i = oldSNum; i <= oldENum; i++) {
            const sCode = `${oldPrefix}${String(i).padStart(rDigits, '0')}`;
            const snIndex = db.serialNumbers.findIndex(sn => sn.serialNumber === sCode);
            if (snIndex !== -1 && db.serialNumbers[snIndex].packingStatus === 'Not Packed') {
               db.serialNumbers[snIndex].inventoryStatus = newStatus === 'Inactive' ? 'Hold' : 'Available';
            }
         }
      }
      
      // Update customerName in serial numbers if changed
      if (customerName !== undefined && customerName !== allotment.customerName) {
         for (let i = oldSNum; i <= oldENum; i++) {
            const sCode = `${oldPrefix}${String(i).padStart(rDigits, '0')}`;
            const snIndex = db.serialNumbers.findIndex(sn => sn.serialNumber === sCode);
            if (snIndex !== -1) {
               db.serialNumbers[snIndex].customerName = customerName;
            }
         }
      }
    }
    
    writeDB(db);
    logAudit(req.user?.email || 'System', 'UPDATE_ALLOTMENT', oldVal, `Updated allotment ${id}`, req);
    res.json(db.serialRanges[index]);
  });

  app.delete('/api/allotments/:id', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const db = readDB();
    const userObj = db.users.find(u => u.email === req.user?.email);
    const hasDeletePermission = req.user?.role === 'Super Admin' || (userObj?.authorizations?.rangeAllotment?.delete === true);
    if (!hasDeletePermission) {
      res.status(403).json({ error: 'Forbidden: Unauthorized to delete range allotments' });
      return;
    }
    const allotmentIndex = db.serialRanges.findIndex(r => r.id === id);
    if (allotmentIndex === -1) {
      res.status(404).json({ error: 'Allotment not found' });
      return;
    }
    const allotment = db.serialRanges[allotmentIndex];
    
    // Find all serials in this allotment
    const rDigits = allotment.digitsLength || 6;
    const sNum = parseInt(allotment.startSerial.slice(-rDigits), 10);
    const eNum = parseInt(allotment.endSerial.slice(-rDigits), 10);
    
    // Generate the array of serial codes
    const serialCodes: string[] = [];
    for (let i = sNum; i <= eNum; i++) {
      const sCode = `${allotment.modelCode}${allotment.year}${allotment.month}${String(i).padStart(rDigits, '0')}`;
      serialCodes.push(sCode);
    }
    
    // Check if any serial is produced, quality checked, transferred or dispatched
    const activeSerials = db.serialNumbers.filter(sn => serialCodes.includes(sn.serialNumber) && sn.status !== 'Allotted');
    if (activeSerials.length > 0) {
      res.status(400).json({ error: 'Cannot delete allotment. Some serial numbers in this range have already been produced or processed.' });
      return;
    }
    
    // Delete 'Allotted' serial number entries
    db.serialNumbers = db.serialNumbers.filter(sn => !serialCodes.includes(sn.serialNumber));
    
    // Remove allotment record
    const oldVal = JSON.stringify(allotment);
    db.serialRanges.splice(allotmentIndex, 1);
    
    writeDB(db);
    broadcastDashboardStats();
    
    logAudit(req.user?.email || 'System', 'DELETE_ALLOTMENT', oldVal, `Deleted allotment range: ${allotment.startSerial} - ${allotment.endSerial}`, req);
    res.json({ message: 'Allotment deleted successfully' });
  });

  // API - PRODUCTION ENTRY
  app.get('/api/production', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const db = readDB();
    const userPlant = req.user?.plant;
    if (userPlant && userPlant !== 'All') {
      res.json(db.production.filter(p => p.plant === userPlant));
    } else {
      res.json(db.production);
    }
  });

  app.post('/api/production', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'Production' && req.user?.role !== 'Super Admin' && req.user?.role !== 'QA') {
      res.status(403).json({ error: 'Forbidden: Unauthorized to register packing/production entries' });
      return;
    }

    const { date, shift, modelCode, plantName, customerName, startSerial, lastSerial, status } = req.body;
    if (!date || !shift || !modelCode || !plantName || !customerName || !startSerial || !lastSerial) {
      res.status(400).json({ error: 'Missing required fields: Date, Shift, Model, Plant Name, Customer, Start Serial, or Last Serial' });
      return;
    }

    const db = readDB();

    // 1. Get all serial numbers for this model, sorted alphabetically
    const modelSerials = db.serialNumbers
      .filter(sn => sn.modelCode === modelCode)
      .sort((a, b) => a.serialNumber.localeCompare(b.serialNumber));

    // 2. Find start and end indices of the selected boundaries
    const startIdx = modelSerials.findIndex(sn => sn.serialNumber === startSerial);
    const lastIdx = modelSerials.findIndex(sn => sn.serialNumber === lastSerial);

    if (startIdx === -1) {
      res.status(400).json({ error: `Start Serial number '${startSerial}' not found in the master list.` });
      return;
    }
    if (lastIdx === -1) {
      res.status(400).json({ error: `Last Serial number '${lastSerial}' not found in the master list.` });
      return;
    }
    if (startIdx > lastIdx) {
      res.status(400).json({ error: `Invalid range: Start Serial must come before or be equal to Last Serial.` });
      return;
    }

    const slicedSerials = modelSerials.slice(startIdx, lastIdx + 1);

    // 3. CHECK FOR ANY DUPLICATE NUMBER or INVALID STATUS
    const invalidSerials = slicedSerials.filter(sn => 
      (sn.inventoryStatus || 'Available') !== 'Available' ||
      (sn.packingStatus || 'Not Packed') !== 'Not Packed' ||
      sn.status === 'Dispatched' ||
      sn.pdiStatus === 'Hold'
    );
    if (invalidSerials.length > 0) {
      logAudit(req.user?.email || 'System', 'DUPLICATE_SERIAL_ATTEMPT', '', `Attempted to register packing/production on serials already packed, dispatched, or on hold: ${invalidSerials.map(d => d.serialNumber).slice(0, 5).join(', ')}`, req, {
        status: 'Failed',
        remarks: 'Duplicate packing / production attempt detected'
      });
      res.status(400).json({
        error: `Invalid serials for packing: The following serials are already packed, dispatched, or on hold: ${invalidSerials.map(d => d.serialNumber).slice(0, 5).join(', ')}`
      });
      return;
    }

    // 4. Verify all sliced serials are allotted to the selected Plant
    const wrongPlantSerials = slicedSerials.filter(sn => sn.currentPlant !== plantName);
    if (wrongPlantSerials.length > 0) {
      res.status(400).json({
        error: `Plant validation error: Some serial numbers in the selected range are allotted to other plants (e.g., ${wrongPlantSerials[0].serialNumber} is allotted to ${wrongPlantSerials[0].currentPlant}).`
      });
      return;
    }

    // 5. Update statuses, set customer/plant, and register individual production/packing entries
    const timestamp = new Date().toISOString();
    const createdEntries: ProductionEntry[] = [];

    slicedSerials.forEach(sn => {
      // Find index in original serialNumbers array
      const dbIdx = db.serialNumbers.findIndex(dbSn => dbSn.serialNumber === sn.serialNumber);
      if (dbIdx !== -1) {
        db.serialNumbers[dbIdx].status = 'Produced';
        db.serialNumbers[dbIdx].mfgDate = date;
        db.serialNumbers[dbIdx].shift = shift;
        db.serialNumbers[dbIdx].pdiStatus = 'Pending';
        db.serialNumbers[dbIdx].customerName = customerName;
        db.serialNumbers[dbIdx].packingStatus = 'Packed';
        db.serialNumbers[dbIdx].inventoryStatus = 'Packed';
      }

      const newEntry: ProductionEntry = {
        id: `prod-${sn.serialNumber}-${Date.now()}`,
        date,
        shift,
        modelCode,
        serialNumber: sn.serialNumber,
        quantity: 1,
        status: status || 'Success',
        plant: plantName,
        createdBy: req.user?.name || 'Production',
        createdAt: timestamp
      };
      createdEntries.push(newEntry);
    });

    db.production = [...createdEntries, ...db.production];

    // Log & notify on low balance
    checkLowSerialBalance(db, modelCode, plantName);

    writeDB(db);
    broadcastDashboardStats();

    logAudit(req.user.email, 'PRODUCTION_ENTRY', 'Allotted', `Registered Packing Line Consumption for range ${startSerial} to ${lastSerial} (${slicedSerials.length} batteries)`, req);
    
    res.status(201).json({
      message: `Successfully registered consumption of ${slicedSerials.length} batteries under ${customerName}!`,
      count: slicedSerials.length,
      entries: createdEntries
    });
  });

  app.put('/api/production/:id', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { date, shift, status, plant, customerName, modelCode, serialNumber } = req.body;
    
    const db = readDB();
    const index = db.production.findIndex(p => p.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Production entry not found' });
      return;
    }
    
    const oldEntry = db.production[index];
    const oldVal = JSON.stringify(oldEntry);
    
    const isSerialChanged = serialNumber && serialNumber !== oldEntry.serialNumber;
    
    if (isSerialChanged) {
      // Verify old serial has not progressed beyond 'Produced'
      const oldSn = db.serialNumbers.find(sn => sn.serialNumber === oldEntry.serialNumber);
      if (oldSn && oldSn.status !== 'Produced' && oldSn.status !== 'Allotted') {
        res.status(400).json({ error: `Cannot change serial number. Original serial number '${oldEntry.serialNumber}' is already processed/dispatched with status: ${oldSn.status}` });
        return;
      }
      
      // Verify new serial number is allotted and is not consumed
      const newSn = db.serialNumbers.find(sn => sn.serialNumber === serialNumber);
      if (!newSn) {
        res.status(400).json({ error: `New Serial Number '${serialNumber}' does not exist in master serial numbers.` });
        return;
      }
      if (newSn.status !== 'Allotted') {
        res.status(400).json({ error: `New Serial Number '${serialNumber}' has already been packed/consumed (current status: ${newSn.status}).` });
        return;
      }
      
      // Revert old serial number status to 'Allotted'
      const oldSnIdx = db.serialNumbers.findIndex(sn => sn.serialNumber === oldEntry.serialNumber);
      if (oldSnIdx !== -1) {
        db.serialNumbers[oldSnIdx].status = 'Allotted';
        delete db.serialNumbers[oldSnIdx].mfgDate;
        delete db.serialNumbers[oldSnIdx].shift;
        delete db.serialNumbers[oldSnIdx].pdiStatus;
        delete db.serialNumbers[oldSnIdx].customerName;
      }
      
      // Setup new serial number status to 'Produced'
      const newSnIdx = db.serialNumbers.findIndex(sn => sn.serialNumber === serialNumber);
      if (newSnIdx !== -1) {
        db.serialNumbers[newSnIdx].status = 'Produced';
        db.serialNumbers[newSnIdx].mfgDate = date || oldEntry.date;
        db.serialNumbers[newSnIdx].shift = shift || oldEntry.shift;
        db.serialNumbers[newSnIdx].pdiStatus = 'Pending';
        const oldSnForCust = db.serialNumbers.find(sn => sn.serialNumber === oldEntry.serialNumber);
        db.serialNumbers[newSnIdx].customerName = customerName || (oldSnForCust ? oldSnForCust.customerName : '');
        if (plant) db.serialNumbers[newSnIdx].currentPlant = plant;
      }
    } else {
      // Just updating non-serial fields on current serial number
      const snIdx = db.serialNumbers.findIndex(sn => sn.serialNumber === oldEntry.serialNumber);
      if (snIdx !== -1) {
        if (date) db.serialNumbers[snIdx].mfgDate = date;
        if (shift) db.serialNumbers[snIdx].shift = shift;
        if (customerName) db.serialNumbers[snIdx].customerName = customerName;
        if (plant) db.serialNumbers[snIdx].currentPlant = plant;
      }
    }
    
    db.production[index] = {
      ...oldEntry,
      date: date || oldEntry.date,
      shift: shift || oldEntry.shift,
      status: status || oldEntry.status,
      plant: plant || oldEntry.plant,
      modelCode: modelCode || oldEntry.modelCode,
      serialNumber: serialNumber || oldEntry.serialNumber
    };
    
    writeDB(db);
    logAudit(req.user?.email || 'System', 'UPDATE_PRODUCTION_ENTRY', oldVal, `Updated production entry ${id}`, req);
    res.json(db.production[index]);
  });

  app.delete('/api/production/:id', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const db = readDB();
    const userObj = db.users.find(u => u.email === req.user?.email);
    const hasDeletePermission = req.user?.role === 'Super Admin' || (userObj?.authorizations?.packingEntry?.delete === true);
    if (!hasDeletePermission) {
      res.status(403).json({ error: 'Forbidden: Unauthorized to delete production/packing entries' });
      return;
    }
    const index = db.production.findIndex(p => p.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Production entry not found' });
      return;
    }
    
    const entry = db.production[index];
    const snIdx = db.serialNumbers.findIndex(sn => sn.serialNumber === entry.serialNumber);
    if (snIdx !== -1) {
      const sn = db.serialNumbers[snIdx];
      if (sn.status !== 'Produced') {
        res.status(400).json({ error: `Cannot delete production entry. This serial number (${entry.serialNumber}) is already in '${sn.status}' status.` });
        return;
      }
      
      // Revert status of serial number to 'Allotted'
      db.serialNumbers[snIdx].status = 'Allotted';
      delete db.serialNumbers[snIdx].mfgDate;
      delete db.serialNumbers[snIdx].shift;
      delete db.serialNumbers[snIdx].pdiStatus;
      delete db.serialNumbers[snIdx].customerName;
    }
    
    const oldVal = JSON.stringify(entry);
    db.production.splice(index, 1);
    
    writeDB(db);
    broadcastDashboardStats();
    
    logAudit(req.user?.email || 'System', 'DELETE_PRODUCTION_ENTRY', oldVal, `Deleted production entry for serial: ${entry.serialNumber}`, req);
    res.json({ message: 'Production entry deleted successfully' });
  });

  // API - PDI ENTRY (Pre-Delivery Inspection)
  app.get('/api/pdi', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const db = readDB();
    res.json(db.pdi);
  });

  app.post('/api/pdi', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'QA' && req.user?.role !== 'Super Admin' && req.user?.role !== 'PDI') {
      res.status(403).json({ error: 'Forbidden: Only QA, PDI or Super Admin can enter PDI checklists.' });
      return;
    }

    const { serialNumber, status, remarks } = req.body;
    if (!serialNumber || !status) {
      res.status(400).json({ error: 'Serial Number and PDI Status (Approved/Rejected/Hold) are required' });
      return;
    }

    const db = readDB();
    const serialIndex = db.serialNumbers.findIndex(s => s.serialNumber === serialNumber);

    if (serialIndex === -1) {
      res.status(400).json({ error: `Serial number '${serialNumber}' not found in the ERP records.` });
      return;
    }

    const serialObj = db.serialNumbers[serialIndex];
    if ((serialObj.packingStatus || 'Not Packed') !== 'Packed') {
      res.status(400).json({ error: `PDI error: Battery must be Packed before PDI. Current packing status: ${serialObj.packingStatus || 'Not Packed'}` });
      return;
    }
    if (serialObj.status !== 'Produced' && serialObj.status !== 'PDI Hold' && serialObj.status !== 'PDI Rejected') {
      res.status(400).json({ error: `PDI error: Battery status must be 'Produced', 'PDI Hold' or 'PDI Rejected' to perform PDI. Current status: ${serialObj.status}` });
      return;
    }

    // Register PDI Entry
    const existingIdx = db.pdi.findIndex(p => p.serialNumber === serialNumber);
    if (existingIdx !== -1) {
      db.pdi.splice(existingIdx, 1);
    }

    const newPdi: PDIEntry = {
      id: `pdi-${Date.now()}`,
      serialNumber,
      status,
      remarks: remarks || '',
      inspectedBy: req.user?.name || 'QA',
      inspectionDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    };

    db.pdi.unshift(newPdi);

    // Update serial tracking details
    db.serialNumbers[serialIndex].pdiStatus = status;
    db.serialNumbers[serialIndex].pdiRemarks = remarks || '';
    db.serialNumbers[serialIndex].pdiBy = req.user?.name;
    db.serialNumbers[serialIndex].pdiDate = newPdi.inspectionDate;
    db.serialNumbers[serialIndex].status = status === 'Approved' ? 'PDI Approved' : (status === 'Hold' ? 'PDI Hold' : 'PDI Rejected');

    // Record First Time Hold History
    updateFirstTimeHoldHistory(db, serialNumber, status, remarks || '', req.user?.name || 'QA');

    writeDB(db);
    broadcastDashboardStats();

    logAudit(req.user.email, 'PDI_INSPECTION', 'Produced', `Inspected ${serialNumber} - ${status}`, req);
    res.status(201).json(newPdi);
  });

  app.put('/api/pdi/:id', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { remarks, status, serialNumber, inspectionDate } = req.body;
    
    const db = readDB();
    const index = db.pdi.findIndex(p => p.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'PDI entry not found' });
      return;
    }
    
    const entry = db.pdi[index];
    const oldVal = JSON.stringify(entry);
    
    const isSerialChanged = serialNumber && serialNumber !== entry.serialNumber;
    
    if (isSerialChanged) {
      // Check if original serial number is dispatched
      const oldSn = db.serialNumbers.find(sn => sn.serialNumber === entry.serialNumber);
      if (oldSn && oldSn.status === 'Dispatched') {
        res.status(400).json({ error: `Cannot edit PDI. Serial number '${entry.serialNumber}' is already dispatched.` });
        return;
      }
      
      // Check if new serial number is in Produced status
      const newSn = db.serialNumbers.find(sn => sn.serialNumber === serialNumber);
      if (!newSn) {
        res.status(400).json({ error: `New Serial Number '${serialNumber}' does not exist.` });
        return;
      }
      if (newSn.status !== 'Produced' && newSn.status !== 'PDI Hold') {
        res.status(400).json({ error: `New Serial Number '${serialNumber}' is not in Produced/PDI Hold state (current status: ${newSn.status}).` });
        return;
      }
      
      // Revert old serial number status to Produced
      const oldSnIdx = db.serialNumbers.findIndex(sn => sn.serialNumber === entry.serialNumber);
      if (oldSnIdx !== -1) {
        db.serialNumbers[oldSnIdx].status = 'Produced';
        delete db.serialNumbers[oldSnIdx].pdiStatus;
        delete db.serialNumbers[oldSnIdx].pdiRemarks;
        delete db.serialNumbers[oldSnIdx].pdiDate;
        delete db.serialNumbers[oldSnIdx].pdiBy;
      }
      
      // Update new serial number status
      const newSnIdx = db.serialNumbers.findIndex(sn => sn.serialNumber === serialNumber);
      if (newSnIdx !== -1) {
        const targetStatus = status || entry.status;
        db.serialNumbers[newSnIdx].pdiStatus = targetStatus as any;
        db.serialNumbers[newSnIdx].pdiRemarks = remarks !== undefined ? remarks : entry.remarks;
        db.serialNumbers[newSnIdx].pdiDate = inspectionDate || entry.inspectionDate || new Date().toISOString().split('T')[0];
        db.serialNumbers[newSnIdx].pdiBy = req.user?.name || req.user?.email || 'QA Auditor';
        db.serialNumbers[newSnIdx].status = targetStatus === 'Approved' ? 'PDI Approved' : (targetStatus === 'Hold' ? 'PDI Hold' : 'PDI Rejected');
      }
    } else {
      // Just update matching serial number details for same serial
      const snIdx = db.serialNumbers.findIndex(sn => sn.serialNumber === entry.serialNumber);
      if (snIdx !== -1) {
        const targetStatus = status || entry.status;
        db.serialNumbers[snIdx].pdiRemarks = remarks !== undefined ? remarks : entry.remarks;
        db.serialNumbers[snIdx].pdiStatus = targetStatus as any;
        db.serialNumbers[snIdx].pdiDate = inspectionDate || entry.inspectionDate || db.serialNumbers[snIdx].pdiDate;
        db.serialNumbers[snIdx].status = targetStatus === 'Approved' ? 'PDI Approved' : (targetStatus === 'Hold' ? 'PDI Hold' : 'PDI Rejected');
      }
    }
    
    db.pdi[index] = {
      ...entry,
      serialNumber: serialNumber || entry.serialNumber,
      remarks: remarks !== undefined ? remarks : entry.remarks,
      status: status || entry.status,
      inspectionDate: inspectionDate || entry.inspectionDate || new Date().toISOString().split('T')[0]
    };
    
    // Record First Time Hold History
    updateFirstTimeHoldHistory(
      db,
      serialNumber || entry.serialNumber,
      status || entry.status,
      remarks !== undefined ? remarks : entry.remarks,
      req.user?.name || req.user?.email || 'QA Auditor'
    );
    
    writeDB(db);
    logAudit(req.user?.email || 'System', 'UPDATE_PDI_ENTRY', oldVal, `Updated PDI entry for serial ${entry.serialNumber}`, req);
    res.json(db.pdi[index]);
  });

  app.delete('/api/pdi/:id', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const db = readDB();
    const userObj = db.users.find(u => u.email === req.user?.email);
    const hasDeletePermission = req.user?.role === 'Super Admin' || (userObj?.authorizations?.pdiQualityCheck?.delete === true);
    if (!hasDeletePermission) {
      res.status(403).json({ error: 'Forbidden: Unauthorized to delete PDI quality check entries' });
      return;
    }
    const index = db.pdi.findIndex(p => p.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'PDI entry not found' });
      return;
    }
    
    const entry = db.pdi[index];
    const snIdx = db.serialNumbers.findIndex(sn => sn.serialNumber === entry.serialNumber);
    if (snIdx !== -1) {
      const sn = db.serialNumbers[snIdx];
      if (sn.status === 'Transferred' || sn.status === 'Dispatched') {
        res.status(400).json({ error: `Cannot delete PDI entry. This serial number (${entry.serialNumber}) is already in '${sn.status}' status.` });
        return;
      }
      
      // Revert status of serial number to 'Produced'
      db.serialNumbers[snIdx].status = 'Produced';
      delete db.serialNumbers[snIdx].pdiStatus;
      delete db.serialNumbers[snIdx].pdiRemarks;
      delete db.serialNumbers[snIdx].pdiBy;
      delete db.serialNumbers[snIdx].pdiDate;
    }
    
    const oldVal = JSON.stringify(entry);
    db.pdi.splice(index, 1);
    
    writeDB(db);
    broadcastDashboardStats();
    
    logAudit(req.user?.email || 'System', 'DELETE_PDI_ENTRY', oldVal, `Deleted PDI entry for serial: ${entry.serialNumber}`, req);
    res.json({ message: 'PDI entry deleted successfully' });
  });

  // API - PDI OFFERED RANGE
  app.get('/api/pdi-offered', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const db = readDB();
    res.json(db.pdiOffered || []);
  });

  app.post('/api/pdi-offered', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'QA' && req.user?.role !== 'Super Admin' && req.user?.role !== 'PDI') {
      res.status(403).json({ error: 'Forbidden: Only QA, PDI or Super Admin can register PDI Offered ranges.' });
      return;
    }

    const {
      offeredDate,
      modelCode,
      plantName,
      startSerial,
      endSerial,
      totalQty,
      okQty,
      holdQty,
      rejectedQty,
      okSerials,
      holdSerials,
      rejectedSerials,
      aestheticIssuesCheck,
      aestheticIssueRemarks,
      generalRemarks,
      ocvLowRange,
      ocvHighRange,
      gravityLowRange,
      gravityHighRange,
      terminalOxidationRange,
      ventLeakageRange,
      ventLooseRange
    } = req.body;

    if (!offeredDate || !modelCode || !plantName || !startSerial || !endSerial) {
      res.status(400).json({ error: 'Offered Date, Model, Plant Name, Start Serial, and End Serial are required.' });
      return;
    }

    const db = readDB();

    const newOffer: PDIOfferedRange = {
      id: `pdi-offered-${Date.now()}`,
      offeredDate,
      modelCode,
      plantName,
      startSerial,
      endSerial,
      totalQty: Number(totalQty) || 0,
      okQty: Number(okQty) || 0,
      holdQty: Number(holdQty) || 0,
      rejectedQty: Number(rejectedQty) || 0,
      okSerials: okSerials || [],
      holdSerials: holdSerials || [],
      rejectedSerials: rejectedSerials || [],
      aestheticIssuesCheck: !!aestheticIssuesCheck,
      aestheticIssueRemarks: aestheticIssueRemarks || '',
      generalRemarks: generalRemarks || '',
      offeredBy: req.user?.name || 'QA',
      createdAt: new Date().toISOString(),
      ocvLowRange: !!ocvLowRange,
      ocvHighRange: !!ocvHighRange,
      gravityLowRange: !!gravityLowRange,
      gravityHighRange: !!gravityHighRange,
      terminalOxidationRange: !!terminalOxidationRange,
      ventLeakageRange: !!ventLeakageRange,
      ventLooseRange: !!ventLooseRange
    };

    if (!db.pdiOffered) {
      db.pdiOffered = [];
    }
    db.pdiOffered.unshift(newOffer);

    // Helper to process individual serial updates and log individual PDI records
    const processSerial = (snCode: string, status: 'Approved' | 'Hold' | 'Rejected') => {
      const serialIndex = db.serialNumbers.findIndex(s => s.serialNumber === snCode);
      if (serialIndex !== -1) {
        db.serialNumbers[serialIndex].pdiStatus = status;
        db.serialNumbers[serialIndex].pdiRemarks = (status === 'Hold' || status === 'Rejected')
          ? `[Offered Range] ${status === 'Hold' ? 'Hold' : 'Rejected'}. ${aestheticIssuesCheck ? 'Aesthetic Issues found. ' : ''}${generalRemarks || ''}`
          : `[Offered Range] Approved. ${generalRemarks || ''}`;
        db.serialNumbers[serialIndex].pdiBy = req.user?.name || 'QA';
        db.serialNumbers[serialIndex].pdiDate = offeredDate;
        db.serialNumbers[serialIndex].status = status === 'Approved' ? 'PDI Approved' : (status === 'Hold' ? 'PDI Hold' : 'PDI Rejected');

        // Check if there is an existing PDI entry for this serial number and remove/update it, or push a new one
        const existingIdx = db.pdi.findIndex(p => p.serialNumber === snCode);
        if (existingIdx !== -1) {
          db.pdi.splice(existingIdx, 1);
        }

        const newPdiEntry: PDIEntry = {
          id: `pdi-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          serialNumber: snCode,
          status,
          remarks: db.serialNumbers[serialIndex].pdiRemarks || '',
          inspectedBy: req.user?.name || 'QA',
          inspectionDate: offeredDate,
          createdAt: new Date().toISOString()
        };
        db.pdi.unshift(newPdiEntry);

        // Record First Time Hold History with range context
        updateFirstTimeHoldHistory(db, snCode, status, db.serialNumbers[serialIndex].pdiRemarks || '', req.user?.name || 'QA', `${startSerial} - ${endSerial}`);
      }
    };

    // Process collections
    (okSerials || []).forEach((s: string) => processSerial(s, 'Approved'));
    (holdSerials || []).forEach((s: string) => processSerial(s, 'Hold'));
    (rejectedSerials || []).forEach((s: string) => processSerial(s, 'Rejected'));

    writeDB(db);
    broadcastDashboardStats();

    logAudit(
      req.user.email,
      'PDI_OFFERED_RANGE',
      'None',
      `Registered PDI Offered for ${modelCode} (${plantName}): Start: ${startSerial}, End: ${endSerial}. OK: ${okQty}, Hold: ${holdQty}, Rejected: ${rejectedQty}. Aesthetic Issue Check: ${aestheticIssuesCheck}`,
      req
    );

    res.status(201).json(newOffer);
  });

  app.put('/api/pdi-offered/:id', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const {
      offeredDate,
      generalRemarks,
      aestheticIssuesCheck,
      aestheticIssueRemarks,
      modelCode,
      plantName,
      startSerial,
      endSerial,
      ocvLowRange,
      ocvHighRange,
      gravityLowRange,
      gravityHighRange,
      terminalOxidationRange,
      ventLeakageRange,
      ventLooseRange
    } = req.body;
    
    const db = readDB();
    if (!db.pdiOffered) db.pdiOffered = [];
    const index = db.pdiOffered.findIndex(o => o.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Offered range not found' });
      return;
    }
    
    const offer = db.pdiOffered[index];
    const oldVal = JSON.stringify(offer);
    
    // If range boundary fields are updated, we can handle it if none are transferred/dispatched
    const isRangeChanged = (modelCode && modelCode !== offer.modelCode) || 
                          (plantName && plantName !== offer.plantName) || 
                          (startSerial && startSerial !== offer.startSerial) || 
                          (endSerial && endSerial !== offer.endSerial);
                          
    if (isRangeChanged) {
      // Check if any of the old serials are advanced
      const oldSerials = [...(offer.okSerials || []), ...(offer.holdSerials || []), ...(offer.rejectedSerials || [])];
      const advancedSerials = db.serialNumbers.filter(sn => oldSerials.includes(sn.serialNumber) && (sn.status === 'Transferred' || sn.status === 'Dispatched'));
      if (advancedSerials.length > 0) {
        res.status(400).json({ error: 'Cannot edit PDI offered range. Some serial numbers have already been transferred or dispatched.' });
        return;
      }
      
      // Revert old serials
      oldSerials.forEach(snCode => {
        const snIdx = db.serialNumbers.findIndex(s => s.serialNumber === snCode);
        if (snIdx !== -1) {
          db.serialNumbers[snIdx].status = 'Produced';
          delete db.serialNumbers[snIdx].pdiStatus;
          delete db.serialNumbers[snIdx].pdiRemarks;
          delete db.serialNumbers[snIdx].pdiBy;
          delete db.serialNumbers[snIdx].pdiDate;
        }
        db.pdi = db.pdi.filter(p => p.serialNumber !== snCode);
      });
      
      // Now, find all serials in the new range and update their status to 'PDI Approved'
      const mCode = modelCode || offer.modelCode;
      const pName = plantName || offer.plantName;
      const sSerial = startSerial || offer.startSerial;
      const eSerial = endSerial || offer.endSerial;
      
      const modelSerials = db.serialNumbers
        .filter(sn => sn.modelCode === mCode && sn.currentPlant === pName && sn.status === 'Produced')
        .sort((a, b) => a.serialNumber.localeCompare(b.serialNumber));
        
      const startIdx = modelSerials.findIndex(sn => sn.serialNumber === sSerial);
      const endIdx = modelSerials.findIndex(sn => sn.serialNumber === eSerial);
      
      if (startIdx !== -1 && endIdx !== -1 && startIdx <= endIdx) {
        const sliced = modelSerials.slice(startIdx, endIdx + 1);
        const okSerials: string[] = [];
        sliced.forEach(sn => {
          const dbIdx = db.serialNumbers.findIndex(dbSn => dbSn.serialNumber === sn.serialNumber);
          if (dbIdx !== -1) {
            db.serialNumbers[dbIdx].status = 'PDI Approved';
            db.serialNumbers[dbIdx].pdiStatus = 'Approved';
            db.serialNumbers[dbIdx].pdiRemarks = 'Bulk Approved via range edit';
            db.serialNumbers[dbIdx].pdiBy = req.user?.name || 'QA Auditor';
            db.serialNumbers[dbIdx].pdiDate = offeredDate || offer.offeredDate;
            okSerials.push(sn.serialNumber);
            
            // Re-create individual pdi entries too
            const newPdiEntry: PDIEntry = {
              id: `pdi-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
              serialNumber: sn.serialNumber,
              status: 'Approved',
              remarks: 'Bulk Approved via range edit',
              inspectedBy: req.user?.name || 'QA Auditor',
              inspectionDate: offeredDate || offer.offeredDate,
              createdAt: new Date().toISOString()
            };
            db.pdi.unshift(newPdiEntry);
          }
        });
        
        offer.okSerials = okSerials;
        offer.holdSerials = [];
        offer.rejectedSerials = [];
        offer.totalQty = sliced.length;
        offer.okQty = sliced.length;
        offer.holdQty = 0;
        offer.rejectedQty = 0;
      }
    }
    
    db.pdiOffered[index] = {
      ...offer,
      offeredDate: offeredDate || offer.offeredDate,
      generalRemarks: generalRemarks !== undefined ? generalRemarks : offer.generalRemarks,
      aestheticIssuesCheck: aestheticIssuesCheck !== undefined ? aestheticIssuesCheck : offer.aestheticIssuesCheck,
      aestheticIssueRemarks: aestheticIssueRemarks !== undefined ? aestheticIssueRemarks : offer.aestheticIssueRemarks,
      modelCode: modelCode || offer.modelCode,
      plantName: plantName || offer.plantName,
      startSerial: startSerial || offer.startSerial,
      endSerial: endSerial || offer.endSerial,
      ocvLowRange: ocvLowRange !== undefined ? !!ocvLowRange : offer.ocvLowRange,
      ocvHighRange: ocvHighRange !== undefined ? !!ocvHighRange : offer.ocvHighRange,
      gravityLowRange: gravityLowRange !== undefined ? !!gravityLowRange : offer.gravityLowRange,
      gravityHighRange: gravityHighRange !== undefined ? !!gravityHighRange : offer.gravityHighRange,
      terminalOxidationRange: terminalOxidationRange !== undefined ? !!terminalOxidationRange : offer.terminalOxidationRange,
      ventLeakageRange: ventLeakageRange !== undefined ? !!ventLeakageRange : offer.ventLeakageRange,
      ventLooseRange: ventLooseRange !== undefined ? !!ventLooseRange : offer.ventLooseRange
    };
    
    writeDB(db);
    logAudit(req.user?.email || 'System', 'UPDATE_PDI_OFFERED', oldVal, `Updated PDI Offered Range ${id}`, req);
    res.json(db.pdiOffered[index]);
  });

  app.delete('/api/pdi-offered/:id', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const db = readDB();
    const userObj = db.users.find(u => u.email === req.user?.email);
    const hasDeletePermission = req.user?.role === 'Super Admin' || (userObj?.authorizations?.pdiQualityCheck?.delete === true);
    if (!hasDeletePermission) {
      res.status(403).json({ error: 'Forbidden: Unauthorized to delete offered PDI ranges' });
      return;
    }
    if (!db.pdiOffered) db.pdiOffered = [];
    
    const index = db.pdiOffered.findIndex(o => o.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Offered range not found' });
      return;
    }
    
    const offer = db.pdiOffered[index];
    
    // Check if any of the serials inside okSerials, holdSerials, rejectedSerials are already transferred or dispatched
    const allSerials = [...(offer.okSerials || []), ...(offer.holdSerials || []), ...(offer.rejectedSerials || [])];
    const advancedSerials = db.serialNumbers.filter(sn => allSerials.includes(sn.serialNumber) && (sn.status === 'Transferred' || sn.status === 'Dispatched'));
    
    if (advancedSerials.length > 0) {
      res.status(400).json({ error: `Cannot delete PDI offered range. Some serial numbers have already been transferred or dispatched.` });
      return;
    }
    
    // Revert all matching serials back to 'Produced'
    allSerials.forEach(snCode => {
      const snIdx = db.serialNumbers.findIndex(s => s.serialNumber === snCode);
      if (snIdx !== -1) {
        db.serialNumbers[snIdx].status = 'Produced';
        delete db.serialNumbers[snIdx].pdiStatus;
        delete db.serialNumbers[snIdx].pdiRemarks;
        delete db.serialNumbers[snIdx].pdiBy;
        delete db.serialNumbers[snIdx].pdiDate;
      }
      
      // Also delete corresponding single PDI entries that were created for these serials
      db.pdi = db.pdi.filter(p => p.serialNumber !== snCode);
    });
    
    const oldVal = JSON.stringify(offer);
    db.pdiOffered.splice(index, 1);
    
    writeDB(db);
    broadcastDashboardStats();
    
    logAudit(req.user?.email || 'System', 'DELETE_PDI_OFFERED_RANGE', oldVal, `Deleted PDI Offered Range ${offer.startSerial} to ${offer.endSerial}`, req);
    res.json({ message: 'PDI offered range deleted successfully' });
  });

  // API - TRANSFER MODULE (Plant-to-Plant Transfers)
  app.get('/api/transfers', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const db = readDB();
    res.json(db.transfers);
  });

  app.get('/api/transfers/suggest-ranges', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const { fromPlant, modelCode, customerName } = req.query;
    if (!fromPlant || !modelCode) {
      res.status(400).json({ error: 'fromPlant and modelCode query parameters are required.' });
      return;
    }

    const db = readDB();
    const available = db.serialNumbers.filter(sn => 
      sn.currentPlant === fromPlant && 
      sn.modelCode === modelCode && 
      sn.status !== 'Dispatched' &&
      (customerName ? sn.customerName === customerName : true)
    );

    const parsed = available.map(sn => {
      const suffix = sn.runningNumber || sn.serialNumber.slice(-6);
      const num = parseInt(suffix, 10);
      return {
        num,
        full: sn.serialNumber,
        suffix
      };
    }).filter(p => !isNaN(p.num));

    parsed.sort((a, b) => a.num - b.num);

    const ranges: Array<{
      startSuffix: string;
      endSuffix: string;
      startSerial: string;
      endSerial: string;
      quantity: number;
    }> = [];

    if (parsed.length > 0) {
      let rangeStart = parsed[0];
      let rangePrev = parsed[0];

      for (let i = 1; i <= parsed.length; i++) {
        const current = parsed[i];
        if (!current || current.num !== rangePrev.num + 1) {
          ranges.push({
            startSuffix: rangeStart.suffix,
            endSuffix: rangePrev.suffix,
            startSerial: rangeStart.full,
            endSerial: rangePrev.full,
            quantity: rangePrev.num - rangeStart.num + 1
          });
          if (current) {
            rangeStart = current;
            rangePrev = current;
          }
        } else {
          rangePrev = current;
        }
      }
    }

    res.json(ranges);
  });

  app.post('/api/transfers', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const { fromPlant, toPlant, modelCode, startSerial, endSerial, reason, customerName, uniqueCode } = req.body;
    if (!fromPlant || !toPlant || !modelCode || !startSerial || !endSerial || !reason) {
      res.status(400).json({ error: 'All fields are required.' });
      return;
    }

    if (fromPlant === toPlant) {
      res.status(400).json({ error: 'Source and Destination plants cannot be the same.' });
      return;
    }

    const db = readDB();

    // Verify serial numbers range exists and is owned by fromPlant
    const startNum = parseInt(startSerial, 10);
    const endNum = parseInt(endSerial, 10);
    if (isNaN(startNum) || isNaN(endNum) || startNum > endNum) {
      res.status(400).json({ error: 'Invalid start/end serial numbers.' });
      return;
    }

    const qty = endNum - startNum + 1;

    let digitsLength = startSerial.length || (customerName ? db.customers.find(c => c.name === customerName)?.numericDigitsOfSerial || 4 : 4);
    let prefix = uniqueCode ? uniqueCode : `${modelCode}`;
    if (customerName) {
      const customer = db.customers.find(c => c.name === customerName);
      if (customer) {
        if (customer.numericDigitsOfSerial) digitsLength = customer.numericDigitsOfSerial;
      }
    }

    // Check availability of each serial in that range
    const curYear = new Date().getFullYear().toString();
    const curMonth = String(new Date().getMonth() + 1).padStart(2, '0');

    const serialCodes: string[] = [];
    for (let i = startNum; i <= endNum; i++) {
      const sCode = `${prefix}${String(i).padStart(digitsLength, '0')}`;
      serialCodes.push(sCode);

      const target = db.serialNumbers.find(sn => sn.serialNumber === sCode);
      if (!target) {
        res.status(400).json({ error: `Serial Number '${sCode}' is not in system database.` });
        return;
      }
      if (target.currentPlant !== fromPlant) {
        res.status(400).json({ error: `Serial Number '${sCode}' does not belong to ${fromPlant}. Current plant: ${target.currentPlant}` });
        return;
      }
      if (target.status === 'Dispatched') {
        res.status(400).json({ error: `Cannot transfer already dispatched serial number: ${sCode}` });
        return;
      }
    }

    // Directly process serial relocation immediately (No approval required)
    serialCodes.forEach(sCode => {
      const serialIndex = db.serialNumbers.findIndex(sn => sn.serialNumber === sCode);
      if (serialIndex !== -1) {
        db.serialNumbers[serialIndex].currentPlant = toPlant;
      }
    });

    // Create an Approved Transfer Request immediately
    const newTransfer: SerialTransfer = {
      id: `tfr-${Date.now()}`,
      fromPlant,
      toPlant,
      modelCode,
      startSerial: serialCodes[0],
      endSerial: serialCodes[serialCodes.length - 1],
      quantity: qty,
      transferDate: new Date().toISOString().split('T')[0],
      reason,
      status: 'Approved',
      approvedBy: req.user?.name || req.user?.email || 'System',
      remarks: 'Transferred immediately (No approval required)',
      createdAt: new Date().toISOString()
    };

    db.transfers.unshift(newTransfer);

    // Notify of completed transfer
    db.notifications.unshift({
      id: `n-${Date.now()}`,
      message: `Inter-Plant Transfer: ${qty} batteries (${modelCode}) transferred from ${fromPlant} to ${toPlant} successfully.`,
      type: 'success',
      date: new Date().toISOString(),
      read: false
    });

    writeDB(db);
    broadcastDashboardStats();

    logAudit(req.user?.email || 'System', 'EXECUTE_TRANSFER', '', `Transferred ${qty} items of ${modelCode} from ${fromPlant} to ${toPlant} immediately`, req);
    res.status(201).json(newTransfer);
  });

  app.post('/api/transfers/:id/approve', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'Super Admin' && req.user?.role !== 'QA') {
      res.status(403).json({ error: 'Forbidden: Only Super Admin/QA can approve transfers.' });
      return;
    }

    const db = readDB();
    const transferIndex = db.transfers.findIndex(t => t.id === req.params.id);
    if (transferIndex === -1) {
      res.status(404).json({ error: 'Transfer record not found.' });
      return;
    }

    const tfr = db.transfers[transferIndex];
    if (tfr.status !== 'Pending') {
      res.status(400).json({ error: 'Transfer request is already resolved.' });
      return;
    }

    // Extract start and end numbers
    // Transfer range looks like ModelCodeYYYYMMRunningNo
    const modelCode = tfr.modelCode;
    const startNoStr = tfr.startSerial.slice(-6);
    const endNoStr = tfr.endSerial.slice(-6);
    const startNum = parseInt(startNoStr, 10);
    const endNum = parseInt(endNoStr, 10);

    const yearMonth = tfr.startSerial.slice(modelCode.length, modelCode.length + 6);
    const year = yearMonth.slice(0, 4);
    const month = yearMonth.slice(4, 6);

    // Process all serials
    for (let i = startNum; i <= endNum; i++) {
      const sCode = `${modelCode}${year}${month}${String(i).padStart(4, '0')}`;
      const serialIndex = db.serialNumbers.findIndex(sn => sn.serialNumber === sCode);
      if (serialIndex !== -1) {
        db.serialNumbers[serialIndex].currentPlant = tfr.toPlant;
        db.serialNumbers[serialIndex].currentLocation = tfr.toPlant;
        db.serialNumbers[serialIndex].currentOwner = tfr.toPlant;
        db.serialNumbers[serialIndex].inventoryStatus = 'Available';
        db.serialNumbers[serialIndex].packingStatus = 'Not Packed';
        db.serialNumbers[serialIndex].transferStatus = 'Completed';
        db.serialNumbers[serialIndex].lastTransferDate = new Date().toISOString();
        db.serialNumbers[serialIndex].lastTransferBy = req.user?.name || 'Super Admin';
        // Keep status as Transferred or preserve PDI statuses, but update location
        db.serialNumbers[serialIndex].status = 'Transferred';
      }
    }

    db.transfers[transferIndex].status = 'Approved';
    db.transfers[transferIndex].approvedBy = req.user?.name || 'Super Admin';
    db.transfers[transferIndex].remarks = req.body.remarks || 'Approved';

    // Add notification
    db.notifications.unshift({
      id: `n-${Date.now()}`,
      message: `Transfer Approved: Transfer of ${tfr.quantity} batteries from ${tfr.fromPlant} to ${tfr.toPlant} has been approved.`,
      type: 'success',
      date: new Date().toISOString(),
      read: false
    });

    writeDB(db);
    broadcastDashboardStats();

    logAudit(req.user.email, 'APPROVE_TRANSFER', 'Pending', `Approved transfer: ${tfr.id}`, req);
    res.json(db.transfers[transferIndex]);
  });

  app.post('/api/transfers/:id/reject', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'Super Admin' && req.user?.role !== 'QA') {
      res.status(403).json({ error: 'Forbidden: Only Super Admin/QA can reject transfers.' });
      return;
    }

    const db = readDB();
    const transferIndex = db.transfers.findIndex(t => t.id === req.params.id);
    if (transferIndex === -1) {
      res.status(404).json({ error: 'Transfer record not found.' });
      return;
    }

    const tfr = db.transfers[transferIndex];
    if (tfr.status !== 'Pending') {
      res.status(400).json({ error: 'Transfer request is already resolved.' });
      return;
    }

    db.transfers[transferIndex].status = 'Rejected';
    db.transfers[transferIndex].approvedBy = req.user?.name || 'Super Admin';
    db.transfers[transferIndex].remarks = req.body.remarks || 'Rejected';

    writeDB(db);
    broadcastDashboardStats();

    logAudit(req.user.email, 'REJECT_TRANSFER', 'Pending', `Rejected transfer: ${tfr.id}`, req);
    res.json(db.transfers[transferIndex]);
  });

  app.put('/api/transfers/:id', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { fromPlant, toPlant, modelCode, startSerial, endSerial, reason } = req.body;
    
    const db = readDB();
    const index = db.transfers.findIndex(t => t.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Transfer not found' });
      return;
    }
    
    const transfer = db.transfers[index];
    const oldVal = JSON.stringify(transfer);
    
    const isRouteOrRangeChanged = (fromPlant && fromPlant !== transfer.fromPlant) ||
                                  (toPlant && toPlant !== transfer.toPlant) ||
                                  (modelCode && modelCode !== transfer.modelCode) ||
                                  (startSerial && startSerial !== transfer.startSerial) ||
                                  (endSerial && endSerial !== transfer.endSerial);
                                  
    if (isRouteOrRangeChanged) {
      // 1. Revert previous serial locations back to old fromPlant
      // Generate old serial codes in the transfer range
      const oldStartNum = parseInt(transfer.startSerial.match(/\d+$/)?.[0] || '0', 10);
      const oldEndNum = parseInt(transfer.endSerial.match(/\d+$/)?.[0] || '0', 10);
      const oldPrefix = transfer.startSerial.replace(/\d+$/, '');
      const oldDigits = transfer.startSerial.match(/\d+$/)?.[0]?.length || 6;
      
      const oldSerialCodes: string[] = [];
      for (let i = oldStartNum; i <= oldEndNum; i++) {
        const sCode = `${oldPrefix}${String(i).padStart(oldDigits, '0')}`;
        oldSerialCodes.push(sCode);
      }
      
      // Verify none of the old serials are dispatched
      const dispatchedOld = db.serialNumbers.filter(sn => oldSerialCodes.includes(sn.serialNumber) && sn.status === 'Dispatched');
      if (dispatchedOld.length > 0) {
        res.status(400).json({ error: 'Cannot update transfer. Some serial numbers in the original transfer range are already dispatched.' });
        return;
      }
      
      // Revert old serials' currentPlant back to original fromPlant
      oldSerialCodes.forEach(sCode => {
        const idx = db.serialNumbers.findIndex(sn => sn.serialNumber === sCode);
        if (idx !== -1) {
          db.serialNumbers[idx].currentPlant = transfer.fromPlant;
        }
      });
      
      // 2. Apply new transfer relocation
      const targetFromPlant = fromPlant || transfer.fromPlant;
      const targetToPlant = toPlant || transfer.toPlant;
      const targetModelCode = modelCode || transfer.modelCode;
      const targetStartSerial = startSerial || transfer.startSerial;
      const targetEndSerial = endSerial || transfer.endSerial;
      
      const newStartNum = parseInt(targetStartSerial.match(/\d+$/)?.[0] || '0', 10);
      const newEndNum = parseInt(targetEndSerial.match(/\d+$/)?.[0] || '0', 10);
      const newPrefix = targetStartSerial.replace(/\d+$/, '');
      const newDigits = targetStartSerial.match(/\d+$/)?.[0]?.length || 6;
      
      const newSerialCodes: string[] = [];
      for (let i = newStartNum; i <= newEndNum; i++) {
        const sCode = `${newPrefix}${String(i).padStart(newDigits, '0')}`;
        newSerialCodes.push(sCode);
        
        const targetSn = db.serialNumbers.find(sn => sn.serialNumber === sCode);
        if (!targetSn) {
          res.status(400).json({ error: `Serial Number '${sCode}' is not in system database.` });
          return;
        }
        if (targetSn.currentPlant !== targetFromPlant && !oldSerialCodes.includes(sCode)) {
          res.status(400).json({ error: `Serial Number '${sCode}' does not belong to ${targetFromPlant}.` });
          return;
        }
        if (targetSn.status === 'Dispatched') {
          res.status(400).json({ error: `Cannot transfer already dispatched serial number: ${sCode}` });
          return;
        }
      }
      
      // Relocate new serials
      newSerialCodes.forEach(sCode => {
        const idx = db.serialNumbers.findIndex(sn => sn.serialNumber === sCode);
        if (idx !== -1) {
          db.serialNumbers[idx].currentPlant = targetToPlant;
        }
      });
      
      db.transfers[index] = {
        ...transfer,
        fromPlant: targetFromPlant,
        toPlant: targetToPlant,
        modelCode: targetModelCode,
        startSerial: targetStartSerial,
        endSerial: targetEndSerial,
        quantity: newSerialCodes.length,
        reason: reason || transfer.reason
      };
    } else {
      db.transfers[index].reason = reason || db.transfers[index].reason;
    }
    
    writeDB(db);
    logAudit(req.user?.email || 'System', 'UPDATE_TRANSFER', oldVal, `Updated transfer ${id}`, req);
    res.json(db.transfers[index]);
  });

  app.delete('/api/transfers/:id', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const db = readDB();
    const userObj = db.users.find(u => u.email === req.user?.email);
    const hasDeletePermission = req.user?.role === 'Super Admin' || (userObj?.authorizations?.interPlantTransfer?.delete === true);
    if (!hasDeletePermission) {
      res.status(403).json({ error: 'Forbidden: Unauthorized to delete transfers' });
      return;
    }
    const index = db.transfers.findIndex(t => t.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Transfer not found' });
      return;
    }
    
    const transfer = db.transfers[index];
    
    // If approved, we need to make sure the serials haven't been dispatched yet!
    if (transfer.status === 'Approved') {
      // Find all serials in the range
      const startNum = parseInt(transfer.startSerial, 10);
      const endNum = parseInt(transfer.endSerial, 10);
      const curYear = new Date(transfer.transferDate).getFullYear().toString();
      const curMonth = String(new Date(transfer.transferDate).getMonth() + 1).padStart(2, '0');
      
      const serialCodes: string[] = [];
      for (let i = startNum; i <= endNum; i++) {
        const sCode = `${transfer.modelCode}${curYear}${curMonth}${String(i).padStart(4, '0')}`;
        serialCodes.push(sCode);
      }
      
      const dispatchedSerials = db.serialNumbers.filter(sn => serialCodes.includes(sn.serialNumber) && sn.status === 'Dispatched');
      if (dispatchedSerials.length > 0) {
        res.status(400).json({ error: 'Cannot delete/revert transfer. Some serials in this transfer have already been dispatched.' });
        return;
      }
      
      // Revert the plant of serials back to fromPlant and status back to PDI Approved
      serialCodes.forEach(sCode => {
        const snIdx = db.serialNumbers.findIndex(sn => sn.serialNumber === sCode);
        if (snIdx !== -1) {
          db.serialNumbers[snIdx].currentPlant = transfer.fromPlant;
        }
      });
    }
    
    const oldVal = JSON.stringify(transfer);
    db.transfers.splice(index, 1);
    
    writeDB(db);
    broadcastDashboardStats();
    
    logAudit(req.user?.email || 'System', 'DELETE_TRANSFER', oldVal, `Deleted transfer request ${id}`, req);
    res.json({ message: 'Transfer request deleted successfully' });
  });

  // API - DISPATCH MODULE
  app.get('/api/dispatches', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const db = readDB();
    const userPlant = req.user?.plant;
    if (userPlant && userPlant !== 'All') {
      res.json(db.dispatches.filter(d => d.plant === userPlant));
    } else {
      res.json(db.dispatches);
    }
  });

  app.post('/api/dispatches', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'Dispatch' && req.user?.role !== 'Super Admin') {
      res.status(403).json({ error: 'Forbidden: Only Dispatch users can enter dispatch registries.' });
      return;
    }

    const { customerName, invoiceNumber, invoiceDate, modelCode, serialNumbers, vehicle, transport, lrNumber } = req.body;
    if (!customerName || !invoiceNumber || !invoiceDate || !modelCode || !serialNumbers || !Array.isArray(serialNumbers) || serialNumbers.length === 0) {
      res.status(400).json({ error: 'Customer, Invoice Details, Model, and a list of Serial Numbers are required.' });
      return;
    }

    const db = readDB();
    const userPlant = req.user?.plant || 'Plant Alpha';

    // Verify customer's serial number format if configured
    const customerObj = db.customers.find(c => c.name.toLowerCase() === customerName.toLowerCase());
    if (customerObj) {
      if (customerObj.totalDigitsOfSerial) {
        for (const serialNum of serialNumbers) {
          if (serialNum.length !== customerObj.totalDigitsOfSerial) {
            res.status(400).json({
              error: `Serial code '${serialNum}' is invalid for customer ${customerName}. This customer strictly requires serial numbers with exactly ${customerObj.totalDigitsOfSerial} total digits (provided length is ${serialNum.length}).`
            });
            return;
          }
        }
      }
      if (customerObj.numericDigitsOfSerial) {
        for (const serialNum of serialNumbers) {
          const numericPart = serialNum.slice(-customerObj.numericDigitsOfSerial);
          const isAllNumeric = /^\d+$/.test(numericPart);
          if (!isAllNumeric || numericPart.length !== customerObj.numericDigitsOfSerial) {
            res.status(400).json({
              error: `Serial code '${serialNum}' is invalid for customer ${customerName}. This customer strictly requires the last ${customerObj.numericDigitsOfSerial} characters to be entirely numeric digits.`
            });
            return;
          }
        }
      }
    }

    // Verify all serials are produced and PDI approved, and belong to the correct plant, and not already dispatched
    for (const serialNum of serialNumbers) {
      const serialObj = db.serialNumbers.find(sn => sn.serialNumber === serialNum);
      if (!serialObj) {
        res.status(400).json({ error: `Cannot dispatch: Serial Number '${serialNum}' does not exist in ERP.` });
        return;
      }
      if (userPlant !== 'All' && serialObj.currentPlant !== userPlant) {
        res.status(400).json({ error: `Cannot dispatch: Serial '${serialNum}' is at plant ${serialObj.currentPlant}, but your session is at ${userPlant}.` });
        return;
      }
      if (serialObj.status === 'Dispatched') {
        res.status(400).json({ error: `Duplicate Dispatch: Serial Number '${serialNum}' has already been dispatched under invoice ${serialObj.invoiceNo}.` });
        return;
      }
      if (serialObj.status !== 'PDI Approved') {
        res.status(400).json({ error: `PDI Pending/Failed: Serial Number '${serialNum}' is not PDI Approved. Current status: ${serialObj.status}. PDI is mandatory before dispatch.` });
        return;
      }
    }

    // Determine the plant to store for this dispatch. If 'All', use the plant of the first serial.
    const plant = userPlant === 'All'
      ? (db.serialNumbers.find(sn => sn.serialNumber === serialNumbers[0])?.currentPlant || 'Plant Alpha')
      : userPlant;

    // Register Dispatch
    const newDispatch: DispatchEntry = {
      id: `disp-${Date.now()}`,
      customerName,
      invoiceNumber,
      invoiceDate,
      modelCode,
      serialNumbers,
      vehicle: vehicle || '',
      transport: transport || '',
      lrNumber: lrNumber || '',
      status: 'Dispatched',
      dispatchedBy: req.user?.name || 'Dispatch Officer',
      plant,
      createdAt: new Date().toISOString()
    };

    db.dispatches.unshift(newDispatch);

    // Update status on serials
    for (const serialNum of serialNumbers) {
      const index = db.serialNumbers.findIndex(sn => sn.serialNumber === serialNum);
      if (index !== -1) {
        db.serialNumbers[index].status = 'Dispatched';
        db.serialNumbers[index].invoiceNo = invoiceNumber;
        db.serialNumbers[index].invoiceDate = invoiceDate;
        db.serialNumbers[index].customerName = customerName;
        db.serialNumbers[index].vehicleNo = vehicle;
        db.serialNumbers[index].transporter = transport;
        db.serialNumbers[index].lrNumber = lrNumber;
        db.serialNumbers[index].dispatchDate = new Date().toISOString().split('T')[0];
        db.serialNumbers[index].dispatchedBy = req.user?.name;
      }
    }

    // Trigger Notification for Dispatch Completion
    db.notifications.unshift({
      id: `n-${Date.now()}`,
      message: `Dispatch Completed: Invoice ${invoiceNumber} issued for ${customerName} (Qty: ${serialNumbers.length} batteries).`,
      type: 'success',
      date: new Date().toISOString(),
      read: false
    });

    writeDB(db);
    broadcastDashboardStats();

    logAudit(req.user.email, 'DISPATCH_ENTRY', 'PDI Approved', `Dispatched ${serialNumbers.length} items to ${customerName} via Invoice ${invoiceNumber}`, req);
    res.status(201).json(newDispatch);
  });

  app.put('/api/dispatches/:id', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { invoiceNumber, invoiceDate, vehicle, transport, lrNumber, customerName, modelCode, serialNumbers } = req.body;
    
    const db = readDB();
    const index = db.dispatches.findIndex(d => d.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Dispatch entry not found' });
      return;
    }
    
    const dispatch = db.dispatches[index];
    const oldVal = JSON.stringify(dispatch);
    
    const targetInvoiceNumber = invoiceNumber || dispatch.invoiceNumber;
    const targetInvoiceDate = invoiceDate || dispatch.invoiceDate;
    const targetVehicle = vehicle !== undefined ? vehicle : dispatch.vehicle;
    const targetTransport = transport !== undefined ? transport : dispatch.transport;
    const targetLrNumber = lrNumber !== undefined ? lrNumber : dispatch.lrNumber;
    const targetCustomerName = customerName || dispatch.customerName;
    const targetModelCode = modelCode || dispatch.modelCode;
    const targetSerialNumbers = serialNumbers || dispatch.serialNumbers;

    // Detect added and removed serials
    const oldSerials = dispatch.serialNumbers || [];
    const newSerials = targetSerialNumbers || [];
    
    const removedSerials = oldSerials.filter(sn => !newSerials.includes(sn));
    const addedSerials = newSerials.filter(sn => !oldSerials.includes(sn));

    // Verify added serials are valid and PDI Approved
    for (const sCode of addedSerials) {
      const snRecord = db.serialNumbers.find(sn => sn.serialNumber === sCode);
      if (!snRecord) {
        res.status(400).json({ error: `Serial Number '${sCode}' does not exist.` });
        return;
      }
      if (snRecord.status !== 'PDI Approved') {
        res.status(400).json({ error: `Serial Number '${sCode}' is not in PDI Approved state (status: ${snRecord.status}).` });
        return;
      }
    }

    // Revert removed serials to 'PDI Approved'
    removedSerials.forEach(sCode => {
      const idx = db.serialNumbers.findIndex(sn => sn.serialNumber === sCode);
      if (idx !== -1) {
        db.serialNumbers[idx].status = 'PDI Approved';
        delete db.serialNumbers[idx].invoiceNo;
        delete db.serialNumbers[idx].invoiceDate;
        delete db.serialNumbers[idx].vehicleNo;
        delete db.serialNumbers[idx].transporter;
        delete db.serialNumbers[idx].lrNumber;
        delete db.serialNumbers[idx].dispatchDate;
        delete db.serialNumbers[idx].dispatchedBy;
      }
    });

    // Mark added serials as Dispatched and set dispatch fields
    addedSerials.forEach(sCode => {
      const idx = db.serialNumbers.findIndex(sn => sn.serialNumber === sCode);
      if (idx !== -1) {
        db.serialNumbers[idx].status = 'Dispatched';
        db.serialNumbers[idx].invoiceNo = targetInvoiceNumber;
        db.serialNumbers[idx].invoiceDate = targetInvoiceDate;
        db.serialNumbers[idx].vehicleNo = targetVehicle;
        db.serialNumbers[idx].transporter = targetTransport;
        db.serialNumbers[idx].lrNumber = targetLrNumber;
        db.serialNumbers[idx].dispatchDate = targetInvoiceDate;
        db.serialNumbers[idx].dispatchedBy = req.user?.name || req.user?.email || 'Dispatcher';
      }
    });

    // Update dispatch details for retained serials
    const retainedSerials = newSerials.filter(sn => oldSerials.includes(sn));
    retainedSerials.forEach(sCode => {
      const idx = db.serialNumbers.findIndex(sn => sn.serialNumber === sCode);
      if (idx !== -1) {
        db.serialNumbers[idx].invoiceNo = targetInvoiceNumber;
        db.serialNumbers[idx].invoiceDate = targetInvoiceDate;
        db.serialNumbers[idx].vehicleNo = targetVehicle;
        db.serialNumbers[idx].transporter = targetTransport;
        db.serialNumbers[idx].lrNumber = targetLrNumber;
      }
    });

    db.dispatches[index] = {
      ...dispatch,
      invoiceNumber: targetInvoiceNumber,
      invoiceDate: targetInvoiceDate,
      vehicle: targetVehicle,
      transport: targetTransport,
      lrNumber: targetLrNumber,
      customerName: targetCustomerName,
      modelCode: targetModelCode,
      serialNumbers: targetSerialNumbers
    };

    writeDB(db);
    logAudit(req.user?.email || 'System', 'UPDATE_DISPATCH', oldVal, `Updated dispatch invoice ${targetInvoiceNumber}`, req);
    res.json(db.dispatches[index]);
  });

  app.delete('/api/dispatches/:id', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const db = readDB();
    const userObj = db.users.find(u => u.email === req.user?.email);
    const hasDeletePermission = req.user?.role === 'Super Admin' || (userObj?.authorizations?.dispatchControl?.delete === true);
    if (!hasDeletePermission) {
      res.status(403).json({ error: 'Forbidden: Unauthorized to delete dispatch entries' });
      return;
    }
    const index = db.dispatches.findIndex(d => d.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Dispatch entry not found' });
      return;
    }
    
    const dispatch = db.dispatches[index];
    
    // Revert status on serials back to PDI Approved
    for (const serialNum of dispatch.serialNumbers) {
      const snIdx = db.serialNumbers.findIndex(sn => sn.serialNumber === serialNum);
      if (snIdx !== -1) {
        db.serialNumbers[snIdx].status = 'PDI Approved';
        delete db.serialNumbers[snIdx].invoiceNo;
        delete db.serialNumbers[snIdx].invoiceDate;
        delete db.serialNumbers[snIdx].vehicleNo;
        delete db.serialNumbers[snIdx].transporter;
        delete db.serialNumbers[snIdx].lrNumber;
        delete db.serialNumbers[snIdx].dispatchDate;
        delete db.serialNumbers[snIdx].dispatchedBy;
      }
    }
    
    const oldVal = JSON.stringify(dispatch);
    db.dispatches.splice(index, 1);
    
    writeDB(db);
    broadcastDashboardStats();
    
    logAudit(req.user?.email || 'System', 'DELETE_DISPATCH', oldVal, `Deleted dispatch entry for invoice: ${dispatch.invoiceNumber}`, req);
    res.json({ message: 'Dispatch entry deleted successfully' });
  });

  // API - AUTHENTICATION ADDITIONAL UTILITIES
  app.post('/api/auth/logout', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    logAudit(req.user?.email || 'Unknown', 'LOGOUT', '', `${req.user?.name || req.user?.email} logged out from browser`, req);
    res.json({ success: true, message: 'Logged out successfully' });
  });

  app.post('/api/auth/change-password', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current password and new password are required' });
      return;
    }

    const db = readDB();
    const email = req.user?.email || '';
    const hashedPassword = db.userPasswords[email];

    if (!hashedPassword || !bcrypt.compareSync(currentPassword, hashedPassword)) {
      logAudit(email, 'PASSWORD_CHANGE_FAILED', '', 'Attempted to change password but current password was incorrect', req, { status: 'Failed' });
      res.status(401).json({ error: 'Incorrect current password' });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    db.userPasswords[email] = bcrypt.hashSync(newPassword, salt);
    writeDB(db);

    logAudit(email, 'PASSWORD_CHANGED', '', `Password updated successfully for ${email}`, req);
    res.json({ success: true, message: 'Password changed successfully' });
  });

  app.post('/api/auth/reset-password', (req: Request, res: Response) => {
    const { email, employeeId, newPassword } = req.body;
    if (!email || !employeeId || !newPassword) {
      res.status(400).json({ error: 'Email, Employee ID, and new password are required' });
      return;
    }

    const db = readDB();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.employeeId === employeeId);

    if (!user) {
      logAudit(email, 'PASSWORD_RESET_FAILED', '', `Failed password reset: User not found with Employee ID: ${employeeId}`, req, { status: 'Failed' });
      res.status(404).json({ error: 'Invalid Email or Employee ID combination' });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    db.userPasswords[user.email] = bcrypt.hashSync(newPassword, salt);
    writeDB(db);

    logAudit(user.email, 'PASSWORD_RESET', '', `Password successfully reset for ${user.email} (Employee ID: ${employeeId})`, req, {
      remarks: 'Reset by User Self-Verification'
    });
    res.json({ success: true, message: 'Password reset successfully' });
  });

  // API - AUDIT LOGS (SERVER-SIDE PAGINATION, FILTERING, STORAGE CONTROLS)
  const handleGetAuditLogs = (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'Super Admin') {
      logAudit(req.user?.email || 'Unknown', 'UNAUTHORIZED_ACCESS', '', `Attempted to access security audit logs without clearance`, req, { status: 'Failed' });
      res.status(403).json({ error: 'Forbidden: Super Admin authorization required to access audit trails.' });
      return;
    }

    const db = readDB();
    let logs = [...db.auditLogs];

    // Implement pagination and filtering
    const { page = 1, limit = 50, startDate, endDate, user, role, plant, module, action, status, search, model, serial } = req.query;

    // Filter logs
    if (startDate) {
      logs = logs.filter(l => new Date(l.timestamp || l.when || '').getTime() >= new Date(startDate as string).getTime());
    }
    if (endDate) {
      const endDateTime = new Date(endDate as string);
      endDateTime.setHours(23, 59, 59, 999);
      logs = logs.filter(l => new Date(l.timestamp || l.when || '').getTime() <= endDateTime.getTime());
    }
    if (user) {
      const uLower = (user as string).toLowerCase();
      logs = logs.filter(l => 
        (l.username || '').toLowerCase().includes(uLower) || 
        (l.who || '').toLowerCase().includes(uLower)
      );
    }
    if (role && role !== 'All') {
      logs = logs.filter(l => (l.role || '').toLowerCase() === (role as string).toLowerCase());
    }
    if (plant && plant !== 'All') {
      logs = logs.filter(l => (l.plant || '').toLowerCase() === (plant as string).toLowerCase());
    }
    if (module && module !== 'All') {
      logs = logs.filter(l => (l.module || '').toLowerCase() === (module as string).toLowerCase());
    }
    if (action && action !== 'All') {
      logs = logs.filter(l => (l.action || l.what || '').toLowerCase() === (action as string).toLowerCase());
    }
    if (status && status !== 'All') {
      logs = logs.filter(l => (l.status || 'Success').toLowerCase() === (status as string).toLowerCase());
    }
    if (model) {
      const mLower = (model as string).toLowerCase();
      logs = logs.filter(l => 
        (l.newValue || '').toLowerCase().includes(mLower) || 
        (l.oldValue || '').toLowerCase().includes(mLower) ||
        (l.description || '').toLowerCase().includes(mLower)
      );
    }
    if (serial) {
      const sLower = (serial as string).toLowerCase();
      logs = logs.filter(l => 
        (l.newValue || '').toLowerCase().includes(sLower) || 
        (l.oldValue || '').toLowerCase().includes(sLower) ||
        (l.description || '').toLowerCase().includes(sLower)
      );
    }
    if (search) {
      const q = (search as string).toLowerCase();
      logs = logs.filter(l => 
        (l.description || l.newValue || '').toLowerCase().includes(q) ||
        (l.remarks || '').toLowerCase().includes(q) ||
        (l.ipAddress || '').toLowerCase().includes(q) ||
        (l.employeeId || '').toLowerCase().includes(q) ||
        (l.id || '').toLowerCase().includes(q)
      );
    }

    // Compute stats on the raw audit log data (all logs)
    const allLogs = db.auditLogs;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const todayActivities = allLogs.filter(l => (l.timestamp || l.when || '').startsWith(todayStr)).length;
    const totalLogsCount = allLogs.length;

    // Critical events: delete, role change, password reset, unauthorized access, mass data clear, restore
    const criticalActions = ['DELETE_USER', 'ROLE_CHANGED', 'PASSWORD_RESET', 'PASSWORD_RESET_FAILED', 'UNAUTHORIZED_ACCESS', 'CLEAR_OPERATIONAL_DATA', 'DB_RESTORE', 'DELETE_PLANT', 'DELETE_MODEL', 'DELETE_CUSTOMER', 'DELETE_AUDIT_LOG', 'ARCHIVE_AUDIT_LOGS'];
    const criticalEvents = allLogs.filter(l => criticalActions.includes(l.action || l.what || '')).length;

    const failedLoginAttempts = allLogs.filter(l => (l.action || l.what || '') === 'LOGIN_FAILED').length;
    
    // Duplicate Serial Attempts
    const duplicateSerialAttempts = allLogs.filter(l => (l.action || l.what || '') === 'DUPLICATE_SERIAL_ATTEMPT').length;

    // Pending Approvals
    const pendingApprovals = db.transfers.filter(t => t.status === 'Pending').length;

    // Security Alerts (failed login, duplicate serial, unauthorized access, deleted records, role changes, failing status)
    const securityAlertActions = ['LOGIN_FAILED', 'DUPLICATE_SERIAL_ATTEMPT', 'UNAUTHORIZED_ACCESS', 'DELETE_USER', 'CLEAR_OPERATIONAL_DATA', 'ROLE_CHANGED', 'DELETE_AUDIT_LOG', 'ARCHIVE_AUDIT_LOGS'];
    const securityAlerts = allLogs.filter(l => securityAlertActions.includes(l.action || l.what || '') || l.status === 'Failed').length;

    // Pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = pageNum * limitNum;

    const paginatedLogs = logs.slice(startIndex, endIndex);
    const totalPages = Math.ceil(logs.length / limitNum) || 1;

    res.json({
      logs: paginatedLogs,
      total: logs.length,
      page: pageNum,
      limit: limitNum,
      totalPages,
      stats: {
        todayActivities,
        totalLogs: totalLogsCount,
        criticalEvents,
        failedLoginAttempts,
        duplicateSerialAttempts,
        pendingApprovals,
        securityAlerts
      }
    });
  };

  app.get('/api/reports/audit-logs', authenticateToken as any, handleGetAuditLogs as any);
  app.get('/api/audit-logs', authenticateToken as any, handleGetAuditLogs as any);

  app.post('/api/reports/audit-logs/archive', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'Super Admin') {
      logAudit(req.user?.email || 'Unknown', 'UNAUTHORIZED_ACCESS', '', `Attempted to archive ledger logs without permission`, req, { status: 'Failed' });
      res.status(403).json({ error: 'Forbidden: Super Admin only' });
      return;
    }

    const db = readDB();
    const oldVal = JSON.stringify({ count: db.auditLogs.length });
    const archivedCount = db.auditLogs.length;

    db.auditLogs = []; // Reset active audit logs
    writeDB(db);

    logAudit(req.user.email, 'ARCHIVE_AUDIT_LOGS', oldVal, '', req, {
      remarks: `Super Admin archived and cleared ${archivedCount} entries from active logs`,
      description: `Archived and cleared ${archivedCount} entries from live security ledger`
    });

    res.json({ success: true, message: `Archived and cleared ${archivedCount} active logs successfully.` });
  });

  app.delete('/api/reports/audit-logs/:id', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'Super Admin') {
      logAudit(req.user?.email || 'Unknown', 'UNAUTHORIZED_ACCESS', '', `Attempted to delete audit log entry ID ${req.params.id} without clearance`, req, { status: 'Failed' });
      res.status(403).json({ error: 'Forbidden: Super Admin only' });
      return;
    }

    const { id } = req.params;
    const db = readDB();
    const index = db.auditLogs.findIndex(l => l.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Audit log entry not found' });
      return;
    }

    const logToDelete = db.auditLogs[index];
    const oldVal = JSON.stringify(logToDelete);
    db.auditLogs.splice(index, 1);
    writeDB(db);

    logAudit(req.user.email, 'DELETE_AUDIT_LOG', oldVal, '', req, {
      remarks: `Super Admin deleted log entry ID ${id}`,
      description: `Audit log entry ID ${id} deleted by Super Admin`
    });

    res.json({ success: true, message: 'Audit log entry deleted successfully.' });
  });

  // API - NOTIFICATIONS
  app.get('/api/notifications', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const db = readDB();
    res.json(db.notifications);
  });

  app.post('/api/notifications/:id/read', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const db = readDB();
    const index = db.notifications.findIndex(n => n.id === req.params.id);
    if (index !== -1) {
      db.notifications[index].read = true;
      writeDB(db);
    }
    res.json({ success: true });
  });

  // API - TRACEABILITY / SEARCH
  app.get('/api/traceability/:serial', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const db = readDB();
    const serialNum = req.params.serial;
    const serialObj = db.serialNumbers.find(s => s.serialNumber === serialNum);

    if (!serialObj) {
      res.status(404).json({ error: `Serial Number '${serialNum}' does not exist in the system.` });
      return;
    }

    // Gather history logs or specific modules
    const mfgDate = serialObj.mfgDate;
    const model = db.models.find(m => m.code === serialObj.modelCode);
    const pdiInfo = db.pdi.filter(p => p.serialNumber === serialNum);
    const dispatchInfo = db.dispatches.find(d => d.serialNumbers.includes(serialNum));
    const transferHistory = db.transfers.filter(t => {
      // Find transfers that might have contained this serial
      // We can check range inclusion
      const modelCode = t.modelCode;
      if (modelCode !== serialObj.modelCode) return false;
      const sNum = parseInt(t.startSerial.slice(-6), 10);
      const eNum = parseInt(t.endSerial.slice(-6), 10);
      const targetNum = parseInt(serialObj.runningNumber, 10);
      return targetNum >= sNum && targetNum <= eNum && t.status === 'Approved';
    });

    res.json({
      serialNumber: serialObj.serialNumber,
      modelCode: serialObj.modelCode,
      modelName: model?.name || 'N/A',
      batteryType: model?.batteryType || 'N/A',
      capacity: model?.capacity || 'N/A',
      status: serialObj.status,
      currentPlant: serialObj.currentPlant,
      mfgDate: mfgDate || 'Not Produced Yet',
      shift: serialObj.shift || 'N/A',
      pdiStatus: serialObj.pdiStatus || 'Pending',
      pdiRemarks: serialObj.pdiRemarks || 'N/A',
      pdiBy: serialObj.pdiBy || 'N/A',
      pdiDate: serialObj.pdiDate || 'N/A',
      transferHistory: transferHistory.map(th => ({
        fromPlant: th.fromPlant,
        toPlant: th.toPlant,
        transferDate: th.transferDate,
        approvedBy: th.approvedBy,
        remarks: th.remarks,
        reason: th.reason
      })),
      dispatch: dispatchInfo ? {
        customerName: dispatchInfo.customerName,
        invoiceNumber: dispatchInfo.invoiceNumber,
        invoiceDate: dispatchInfo.invoiceDate,
        vehicle: dispatchInfo.vehicle,
        transport: dispatchInfo.transport,
        lrNumber: dispatchInfo.lrNumber,
        dispatchedBy: dispatchInfo.dispatchedBy,
        dispatchDate: dispatchInfo.createdAt.split('T')[0]
      } : null
    });
  });

  // API - SEARCH GLOBAL LISTS
  app.get('/api/search', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const { serialNumber, customer, model, invoice, date, plant, status, dateType, startDate, endDate } = req.query;
    const db = readDB();

    let results = db.serialNumbers;

    if (serialNumber) {
      results = results.filter(sn => sn.serialNumber.toLowerCase().includes((serialNumber as string).toLowerCase()));
    }
    if (model) {
      results = results.filter(sn => sn.modelCode.toLowerCase().includes((model as string).toLowerCase()));
    }
    if (plant) {
      results = results.filter(sn => sn.currentPlant.toLowerCase().includes((plant as string).toLowerCase()));
    }
    if (customer) {
      results = results.filter(sn => sn.customerName && sn.customerName.toLowerCase().includes((customer as string).toLowerCase()));
    }
    if (invoice) {
      results = results.filter(sn => sn.invoiceNo && sn.invoiceNo.toLowerCase().includes((invoice as string).toLowerCase()));
    }
    if (date) {
      results = results.filter(sn => sn.mfgDate === date || sn.invoiceDate === date || sn.dispatchDate === date);
    }
    if (status) {
      results = results.filter(sn => sn.status === status);
    }

    // Advanced Date Type Filtering (Mfg, Dispatch, Transfer)
    if (dateType && startDate && endDate) {
      const sDateStr = startDate as string;
      const eDateStr = endDate as string;

      if (dateType === 'mfgDate') {
        results = results.filter(sn => sn.mfgDate && sn.mfgDate >= sDateStr && sn.mfgDate <= eDateStr);
      } else if (dateType === 'dispatchDate') {
        results = results.filter(sn => sn.dispatchDate && sn.dispatchDate >= sDateStr && sn.dispatchDate <= eDateStr);
      } else if (dateType === 'transferDate') {
        const approvedTransfers = db.transfers.filter(t => t.status === 'Approved' && t.transferDate >= sDateStr && t.transferDate <= eDateStr);
        results = results.filter(sn => {
          return approvedTransfers.some(t => {
            if (t.modelCode !== sn.modelCode) return false;
            const sNum = parseInt(t.startSerial.slice(-6), 10);
            const eNum = parseInt(t.endSerial.slice(-6), 10);
            const targetNum = parseInt(sn.runningNumber, 10);
            return targetNum >= sNum && targetNum <= eNum;
          });
        });
      }
    }

    res.json(results);
  });

  // API - DASHBOARD REALTIME FEED (SSE)
  app.get('/api/dashboard/realtime', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    sseClients.push(res);

    // Keep-alive/connected check
    res.write(': connected\n\n');

    req.on('close', () => {
      const idx = sseClients.indexOf(res);
      if (idx !== -1) {
        sseClients.splice(idx, 1);
      }
    });
  });

  // API - DASHBOARD AGGREGATED STATS
  app.get('/api/dashboard/stats', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const db = readDB();
    const userPlant = req.user?.plant;

    // Filter serials, production, dispatches, and transfers based on user's authorized plant
    const hasPlantFilter = userPlant && userPlant !== 'All';
    const serials = hasPlantFilter ? db.serialNumbers.filter(s => s.currentPlant === userPlant) : db.serialNumbers;
    const prod = hasPlantFilter ? db.production.filter(p => p.plant === userPlant) : db.production;
    const disp = hasPlantFilter ? db.dispatches.filter(d => d.plant === userPlant) : db.dispatches;
    const tfr = hasPlantFilter ? db.transfers.filter(t => t.fromPlant === userPlant || t.toPlant === userPlant) : db.transfers;

    // Daily Calculations
    const todayStr = new Date().toISOString().split('T')[0];
    const todayProdQty = prod.filter(p => p.date === todayStr).length;

    // Today's Dispatch Count
    let todayDispQty = 0;
    disp.forEach(d => {
      const dDateStr = d.createdAt.split('T')[0];
      if (dDateStr === todayStr) {
        todayDispQty += d.serialNumbers.length;
      }
    });

    // Pending PDI count (Produced but no PDI checklist completed)
    const pendingPdiCount = serials.filter(s => s.status === 'Produced' && s.pdiStatus === 'Pending').length;

    // Available serials (PDI Approved and can be dispatched)
    const availableSerialsCount = serials.filter(s => s.status === 'PDI Approved').length;

    // Transferred Quantity (Approved transfers)
    const totalTransferred = tfr.filter(t => t.status === 'Approved').reduce((acc, t) => acc + t.quantity, 0);

    // Model-wise stock balance
    const modelBalances: Record<string, { produced: number, approved: number, dispatched: number }> = {};
    db.models.forEach(m => {
      modelBalances[m.code] = { produced: 0, approved: 0, dispatched: 0 };
    });
    serials.forEach(s => {
      if (!modelBalances[s.modelCode]) {
        modelBalances[s.modelCode] = { produced: 0, approved: 0, dispatched: 0 };
      }
      if (s.status === 'Produced') modelBalances[s.modelCode].produced++;
      if (s.status === 'PDI Approved') modelBalances[s.modelCode].approved++;
      if (s.status === 'Dispatched') modelBalances[s.modelCode].dispatched++;
    });

    // Plant-wise balance
    const plantBalances: Record<string, number> = {};
    db.plants.forEach(p => {
      plantBalances[p.name] = 0;
    });
    serials.forEach(s => {
      if (s.status !== 'Dispatched') {
        plantBalances[s.currentPlant] = (plantBalances[s.currentPlant] || 0) + 1;
      }
    });

    const rawProduction = prod.map(p => ({
      date: p.date,
      quantity: p.quantity || 1
    }));

    const rawDispatches = disp.map(d => ({
      date: d.invoiceDate || d.createdAt.split('T')[0],
      quantity: d.serialNumbers.length
    }));

    const stockBalance = Object.keys(modelBalances).map(code => ({
      name: code,
      Produced: modelBalances[code].produced,
      Available: modelBalances[code].approved,
      Dispatched: modelBalances[code].dispatched
    }));

    const filteredActivities = hasPlantFilter
      ? db.auditLogs.filter(log => {
          const plantLower = userPlant.toLowerCase();
          const newValueLower = (log.newValue || '').toLowerCase();
          const oldValueLower = (log.oldValue || '').toLowerCase();
          const whatLower = (log.what || '').toLowerCase();
          const plantUsers = db.users
            .filter(u => u.plant && u.plant.toLowerCase() === plantLower)
            .map(u => u.email.toLowerCase());
          const whoLower = (log.who || '').toLowerCase();

          return (
            newValueLower.includes(plantLower) ||
            oldValueLower.includes(plantLower) ||
            whatLower.includes(plantLower) ||
            plantUsers.includes(whoLower)
          );
        })
      : db.auditLogs;

    res.json({
      todayProduction: todayProdQty,
      todayDispatch: todayDispQty,
      pendingPdi: pendingPdiCount,
      availableSerials: availableSerialsCount,
      transferredQuantity: totalTransferred,
      modelBalances,
      plantBalances,
      rawProduction,
      rawDispatches,
      stockBalance,
      recentActivities: filteredActivities.slice(0, 10)
    });
  });

  app.get('/api/reports/model-wise', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const db = readDB();
    
    // Find duplicates first to tag them
    const snCountMap = new Map<string, number>();
    db.serialNumbers.forEach(s => {
      snCountMap.set(s.serialNumber, (snCountMap.get(s.serialNumber) || 0) + 1);
    });
    const duplicateSerialsSet = new Set<string>();
    snCountMap.forEach((cnt, sn) => {
      if (cnt > 1) {
        duplicateSerialsSet.add(sn);
      }
    });

    const rows = db.models.map(model => {
      const serialsOfModel = db.serialNumbers.filter(s => s.modelCode === model.code);
      
      const productionQty = serialsOfModel.filter(s => s.status !== 'Allotted').length;
      const packedQty = serialsOfModel.filter(s => s.packingStatus === 'Packed').length;
      const pdiInspectedQty = serialsOfModel.filter(s => s.pdiStatus && s.pdiStatus !== 'Pending').length;
      const pdiApprovedQty = serialsOfModel.filter(s => s.pdiStatus === 'Approved').length;
      const pdiRejectedQty = serialsOfModel.filter(s => s.pdiStatus === 'Rejected').length;
      const pdiHoldQty = serialsOfModel.filter(s => s.pdiStatus === 'Hold').length;
      const dispatchedQty = serialsOfModel.filter(s => s.status === 'Dispatched').length;
      const availableInventory = serialsOfModel.filter(s => (s.status === 'PDI Approved' || s.status === 'Transferred') && s.packingStatus === 'Packed').length;
      const duplicateCount = serialsOfModel.filter(s => duplicateSerialsSet.has(s.serialNumber)).length;
      
      const pendingToPack = serialsOfModel.filter(s => (s.packingStatus || 'Not Packed') !== 'Packed').length;
      
      const yieldPercent = pdiInspectedQty > 0 ? Number(((pdiApprovedQty / pdiInspectedQty) * 100).toFixed(1)) : 100.0;
      const rejectionPercent = pdiInspectedQty > 0 ? Number(((pdiRejectedQty / pdiInspectedQty) * 100).toFixed(1)) : 0.0;
      
      return {
        modelCode: model.code,
        modelName: model.name,
        productionQty,
        packedQty,
        pendingToPack,
        pdiInspectedQty,
        pdiApprovedQty,
        pdiRejectedQty,
        pdiHoldQty,
        dispatchedQty,
        yieldPercent,
        rejectionPercent,
        availableInventory,
        duplicateCount
      };
    });

    const totalPacked = rows.reduce((sum, r) => sum + r.packedQty, 0);
    const totalDispatched = rows.reduce((sum, r) => sum + r.dispatchedQty, 0);

    const summary = {
      totalProduction: rows.reduce((sum, r) => sum + r.productionQty, 0),
      totalPacked,
      totalInspected: rows.reduce((sum, r) => sum + r.pdiInspectedQty, 0),
      totalApproved: rows.reduce((sum, r) => sum + r.pdiApprovedQty, 0),
      totalDispatched,
      averageYield: totalPacked > 0 ? Number(((totalDispatched / totalPacked) * 100).toFixed(1)) : 100.0,
      totalHold: rows.reduce((sum, r) => sum + r.pdiHoldQty, 0),
      availableInventory: rows.reduce((sum, r) => sum + r.availableInventory, 0)
    };

    res.json({ rows, summary });
  });

  app.get('/api/reports/plant-wise', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const db = readDB();
    
    const rows = db.plants.map(plant => {
      const serialsOfPlant = db.serialNumbers.filter(s => s.currentPlant === plant.name);
      
      const productionQty = serialsOfPlant.filter(s => s.status !== 'Allotted').length;
      const packedQty = serialsOfPlant.filter(s => s.packingStatus === 'Packed').length;
      const pdiInspectedQty = serialsOfPlant.filter(s => s.pdiStatus && s.pdiStatus !== 'Pending').length;
      const pdiApprovedQty = serialsOfPlant.filter(s => s.pdiStatus === 'Approved').length;
      const pdiRejectedQty = serialsOfPlant.filter(s => s.pdiStatus === 'Rejected').length;
      const pdiHoldQty = serialsOfPlant.filter(s => s.pdiStatus === 'Hold').length;
      const dispatchedQty = serialsOfPlant.filter(s => s.status === 'Dispatched').length;
      const reworkQty = serialsOfPlant.filter(s => s.pdiRemarks && s.pdiRemarks.includes('[Rework')).length;
      
      const yieldPercent = pdiInspectedQty > 0 ? Number(((pdiApprovedQty / pdiInspectedQty) * 100).toFixed(1)) : 100.0;
      
      return {
        plantName: plant.name,
        location: plant.location,
        productionQty,
        packedQty,
        pdiInspectedQty,
        pdiApprovedQty,
        pdiRejectedQty, // Scrap
        pdiHoldQty,
        dispatchedQty,
        reworkQty,
        yieldPercent
      };
    });

    const summary = {
      totalProduction: rows.reduce((sum, r) => sum + r.productionQty, 0),
      totalPacked: rows.reduce((sum, r) => sum + r.packedQty, 0),
      totalInspected: rows.reduce((sum, r) => sum + r.pdiInspectedQty, 0),
      totalApproved: rows.reduce((sum, r) => sum + r.pdiApprovedQty, 0),
      totalDispatched: rows.reduce((sum, r) => sum + r.dispatchedQty, 0),
      totalScrap: rows.reduce((sum, r) => sum + r.pdiRejectedQty, 0),
      totalRework: rows.reduce((sum, r) => sum + r.reworkQty, 0),
      totalHold: rows.reduce((sum, r) => sum + r.pdiHoldQty, 0)
    };

    res.json({ rows, summary });
  });

  app.get('/api/reports/customer-wise', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const db = readDB();
    
    const rows = db.dispatches.map(dispatch => {
      return {
        id: dispatch.id,
        customerName: dispatch.customerName,
        invoiceNumber: dispatch.invoiceNumber,
        invoiceDate: dispatch.invoiceDate,
        modelCode: dispatch.modelCode,
        plant: dispatch.plant,
        quantity: dispatch.serialNumbers ? dispatch.serialNumbers.length : 0,
        serialNumberRange: collapseSerials(dispatch.serialNumbers),
        dispatchedBy: dispatch.dispatchedBy,
        createdAt: dispatch.createdAt
      };
    });

    // Calculate Customer Wise Allotted vs Pending to Pack vs Dispatched
    const customerMap = new Map<string, { totalAllotted: number; pendingToPack: number; dispatched: number }>();
    
    db.customers.forEach(c => {
      customerMap.set(c.name, { totalAllotted: 0, pendingToPack: 0, dispatched: 0 });
    });

    db.serialNumbers.forEach(s => {
      let custName = s.customerName;
      if (!custName && s.modelCode) {
        const model = db.models.find(m => m.code === s.modelCode);
        if (model && model.customerName) {
          custName = model.customerName;
        }
      }
      if (!custName) {
        custName = 'Unassigned';
      }

      if (!customerMap.has(custName)) {
        customerMap.set(custName, { totalAllotted: 0, pendingToPack: 0, dispatched: 0 });
      }

      const stats = customerMap.get(custName)!;
      stats.totalAllotted++;
      if ((s.packingStatus || 'Not Packed') !== 'Packed') {
        stats.pendingToPack++;
      }
      if (s.status === 'Dispatched') {
        stats.dispatched++;
      }
    });

    const customerMetrics = Array.from(customerMap.entries()).map(([customerName, stats]) => ({
      customerName,
      totalAllotted: stats.totalAllotted,
      pendingToPack: stats.pendingToPack,
      dispatched: stats.dispatched
    }));

    // Calculate Average Dispatch Aging Days After Packing & PDI
    const dispatchedSerials = db.serialNumbers.filter(s => s.status === 'Dispatched');
    let totalAgingDays = 0;
    let agingCount = 0;

    dispatchedSerials.forEach(s => {
      const dispatchTime = s.dispatchDate ? new Date(s.dispatchDate).getTime() : (s.invoiceDate ? new Date(s.invoiceDate).getTime() : null);
      const startStageTime = s.pdiDate ? new Date(s.pdiDate).getTime() : (s.mfgDate ? new Date(s.mfgDate).getTime() : (s.createdAt ? new Date(s.createdAt).getTime() : null));

      if (dispatchTime && startStageTime) {
        const diffMs = dispatchTime - startStageTime;
        const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        totalAgingDays += diffDays;
        agingCount++;
      }
    });

    const averageDispatchAgingDays = agingCount > 0 ? Number((totalAgingDays / agingCount).toFixed(1)) : 0;

    const summary = {
      totalDispatchedInvoices: rows.length,
      totalDispatchedQty: rows.reduce((sum, r) => sum + r.quantity, 0),
      totalCustomersServed: new Set(rows.map(r => r.customerName)).size,
      activeModelsDispatched: new Set(rows.map(r => r.modelCode)).size,
      averageDispatchAgingDaysAfterPDI: averageDispatchAgingDays
    };

    res.json({ rows, summary, customerMetrics });
  });

  app.get('/api/reports/unused-serials', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const db = readDB();
    
    const unusedSerials = db.serialNumbers.filter(s => 
      (s.packingStatus || 'Not Packed') !== 'Packed' && 
      s.status !== 'Dispatched'
    );

    const rows = unusedSerials.map(s => {
      const createdTime = s.createdAt ? new Date(s.createdAt).getTime() : Date.now();
      const ageingDays = Math.max(0, Math.floor((Date.now() - createdTime) / (1000 * 60 * 60 * 24)));
      
      return {
        serialNumber: s.serialNumber,
        modelCode: s.modelCode,
        plantName: s.currentPlant || 'Unknown',
        allotmentDate: s.createdAt ? s.createdAt.split('T')[0] : 'Unknown',
        status: s.status,
        ageing: ageingDays
      };
    });

    rows.sort((a, b) => b.ageing - a.ageing);

    const summary = {
      totalUnusedSerials: rows.length,
      allottedNotProduced: rows.filter(r => r.status === 'Allotted').length,
      producedNotPacked: rows.filter(r => r.status === 'Produced').length,
      averageAgeingDays: rows.length > 0 ? Math.floor(rows.reduce((sum, r) => sum + r.ageing, 0) / rows.length) : 0
    };

    res.json({ rows, summary });
  });

  app.get('/api/reports/duplicate-checks', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const db = readDB();
    
    const snMap = new Map<string, SerialNumber[]>();
    db.serialNumbers.forEach(s => {
      if (!snMap.has(s.serialNumber)) {
        snMap.set(s.serialNumber, []);
      }
      snMap.get(s.serialNumber)!.push(s);
    });

    const duplicateGroups: any[] = [];
    const rows: any[] = [];

    snMap.forEach((serials, sn) => {
      if (serials.length > 1) {
        duplicateGroups.push({
          serialNumber: sn,
          occurrences: serials.length,
          records: serials
        });

        serials.forEach((s, idx) => {
          rows.push({
            serialNumber: s.serialNumber,
            occurrenceIndex: idx + 1,
            modelCode: s.modelCode,
            plantName: s.currentPlant,
            status: s.status,
            packingStatus: s.packingStatus || 'Not Packed',
            mfgDate: s.mfgDate || '-',
            createdAt: s.createdAt ? s.createdAt.split('T')[0] : '-',
            user: s.pdiBy || 'System'
          });
        });
      }
    });

    const summary = {
      totalCheckedSerials: db.serialNumbers.length,
      totalDuplicatesCount: rows.length,
      uniqueDuplicateSerials: duplicateGroups.length,
      duplicateRatioPercent: db.serialNumbers.length > 0 
        ? Number(((duplicateGroups.length / db.serialNumbers.length) * 100).toFixed(3)) 
        : 0.0
    };

    res.json({ rows, summary, duplicateGroups });
  });

  app.get('/api/reports/hold-summary', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const db = readDB();
    
    if (!db.firstTimeHoldHistory) {
      db.firstTimeHoldHistory = [];
    }

    if (db.firstTimeHoldHistory.length === 0 && db.pdi.length > 0) {
      const holdPdis = db.pdi.filter(p => p.status === 'Hold');
      
      holdPdis.forEach(pdi => {
        const serial = db.serialNumbers.find(s => s.serialNumber === pdi.serialNumber);
        const isReleased = serial && serial.pdiStatus !== 'Hold' && serial.status !== 'PDI Hold';
        
        const releasePdi = isReleased 
          ? db.pdi.find(p => p.serialNumber === pdi.serialNumber && p.status === 'Approved' && new Date(p.createdAt || p.inspectionDate).getTime() > new Date(pdi.createdAt || pdi.inspectionDate).getTime()) 
          : null;

        const holdDateStr = pdi.inspectionDate;
        const releaseDateStr = releasePdi ? releasePdi.inspectionDate : undefined;
        let holdDuration: number | undefined = undefined;
        if (releaseDateStr) {
          holdDuration = Math.max(1, Math.floor((new Date(releaseDateStr).getTime() - new Date(holdDateStr).getTime()) / (1000 * 60 * 60 * 24)));
        } else {
          holdDuration = Math.max(1, Math.floor((Date.now() - new Date(holdDateStr).getTime()) / (1000 * 60 * 60 * 24)));
        }

        const historyEntry = {
          id: `hold-${pdi.id}`,
          holdDate: holdDateStr,
          inspectionTime: pdi.createdAt ? new Date(pdi.createdAt).toLocaleTimeString() : '10:00 AM',
          plant: serial?.currentPlant || 'Plant Alpha',
          model: serial?.modelCode || 'Unknown',
          location: serial?.currentPlant || 'Plant Alpha',
          lotNumber: serial?.year ? `${serial.year}${serial.month}` : 'Unknown',
          serialNumber: pdi.serialNumber,
          serialNumberRange: pdi.serialNumber,
          holdReason: pdi.remarks || 'PDI Inspection Hold',
          holdCategory: 'PDI Defect',
          holdBy: pdi.inspectedBy || 'QA Auditor',
          releaseDate: releaseDateStr,
          releasedBy: releasePdi ? releasePdi.inspectedBy : undefined,
          holdDuration,
          currentStatus: serial?.status === 'PDI Hold' ? 'Hold' : (isReleased ? 'Released' : 'Hold'),
          remarks: pdi.remarks || '',
          statusHistory: [
            {
              status: 'Hold',
              changedAt: pdi.createdAt || new Date(pdi.inspectionDate).toISOString(),
              changedBy: pdi.inspectedBy || 'QA Auditor',
              remarks: pdi.remarks || 'Placed on Hold'
            }
          ]
        };

        if (releasePdi) {
          historyEntry.statusHistory.push({
            status: 'Released',
            changedAt: releasePdi.createdAt || new Date(releasePdi.inspectionDate).toISOString(),
            changedBy: releasePdi.inspectedBy || 'QA Auditor',
            remarks: releasePdi.remarks || 'Rework cleared and released'
          });
        }

        db.firstTimeHoldHistory!.push(historyEntry);
      });

      writeDB(db);
    }

    const rows = db.firstTimeHoldHistory.map(h => {
      let duration = h.holdDuration;
      if (h.currentStatus === 'Hold' && !h.releaseDate) {
        duration = Math.max(1, Math.floor((Date.now() - new Date(h.holdDate).getTime()) / (1000 * 60 * 60 * 24)));
      }
      return {
        ...h,
        holdDuration: duration
      };
    });

    const summary = {
      totalHoldIncidents: rows.length,
      currentlyOnHold: rows.filter(r => r.currentStatus === 'Hold').length,
      releasedFromHold: rows.filter(r => r.currentStatus !== 'Hold' && r.currentStatus !== 'PDI Hold').length,
      averageHoldDurationDays: rows.length > 0 
        ? Math.floor(rows.reduce((sum, r) => sum + (r.holdDuration || 0), 0) / rows.length) 
        : 0
    };

    res.json({ rows, summary });
  });

  // API - EXPORT REPORTS / SIMULATE DOWNLOAD
  app.get('/api/reports/export', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    const { type, format } = req.query; // type: model, plant, customer, dispatch, production, audit
    const db = readDB();

    let reportData: any[] = [];
    let filename = `ERP-Report-${type || 'all'}-${Date.now()}`;

    if (type === 'production') {
      reportData = db.production;
      filename = `Production_Register_${Date.now()}`;
    } else if (type === 'dispatch') {
      reportData = db.dispatches;
      filename = `Dispatch_Register_${Date.now()}`;
    } else if (type === 'transfer') {
      reportData = db.transfers;
      filename = `Transfer_History_${Date.now()}`;
    } else if (type === 'audit') {
      reportData = db.auditLogs;
      filename = `Audit_Report_${Date.now()}`;
    } else if (type === 'unused') {
      reportData = db.serialNumbers.filter(sn => sn.status === 'Allotted');
      filename = `Unused_Serials_${Date.now()}`;
    } else if (type === 'duplicates') {
      // Find duplicates if any
      const seen = new Set();
      const duplicates: string[] = [];
      db.serialNumbers.forEach(s => {
        if (seen.has(s.serialNumber)) {
          duplicates.push(s.serialNumber);
        }
        seen.add(s.serialNumber);
      });
      reportData = db.serialNumbers.filter(s => duplicates.includes(s.serialNumber));
      filename = `Duplicate_Check_Report_${Date.now()}`;
    } else {
      reportData = db.serialNumbers;
    }

    logAudit(req.user?.email || 'System', 'EXPORT_REPORT', '', `Exported ${type || 'all'} ledger report in ${format || 'JSON'} format (${reportData.length} records)`, req);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);

      if (reportData.length === 0) {
        res.send('No records found');
        return;
      }

      const keys = Object.keys(reportData[0]);
      const csvContent = [
        keys.join(','),
        ...reportData.map(row => keys.map(k => JSON.stringify(row[k] || '')).join(','))
      ].join('\n');

      res.send(csvContent);
    } else {
      // Default return json
      res.json(reportData);
    }
  });

  // API - EXCEL BULK IMPORT SIMULATION
  app.post('/api/reports/import', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'QA' && req.user?.role !== 'Super Admin') {
      res.status(403).json({ error: 'Forbidden: QA or Super Admin only' });
      return;
    }
    const { rows } = req.body; // Array of items to import
    if (!rows || !Array.isArray(rows)) {
      res.status(400).json({ error: 'Invalid payload structure. Array of rows required.' });
      return;
    }

    const db = readDB();
    const errors: string[] = [];
    const validatedAllotments: any[] = [];
    const serialsToAdd: any[] = [];

    // Track active ranges being imported to check for self-overlaps
    const importRanges: Array<{ modelCode: string; start: number; end: number; rowIndex: number }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Map potential column names (Model vs modelCode, Starting Serial Number vs startSerialNum etc.)
      let modelCode = (row.modelCode || row.Model || row['Battery Model'] || row['Model Code'] || '').toString().trim().toUpperCase();
      const startStr = (row.startSerialNum || row.start || row['Starting Serial Running No.'] || row['Starting Serial Number'] || '').toString().trim();
      const endStr = (row.endSerialNum || row.end || row['Ending Serial Running No.'] || row['Ending Serial Number'] || '').toString().trim();
      const plantName = (row.plantName || row.Plant || row['Target Plant'] || '').toString().trim();
      const date = row.date || row.Date || row['Allotment Date'] || new Date().toISOString().split('T')[0];
      const customerName = (row.customerName || row.Customer || row['Customer Name'] || '').toString().trim();
      const serialCode = (row.serialCode || row['Unique Code'] || '').toString().trim();
      const status = (row.status || row.Status || 'Active').toString().trim();
      const remarks = (row.remarks || row.Remarks || 'Imported via Bulk Excel Upload').toString().trim();

      if (!modelCode || !startStr || !endStr || !plantName) {
        errors.push(`Row ${i + 1}: Missing required columns. Ensure columns for Battery Model, Target Plant, Starting Serial Running No., and Ending Serial Running No. exist.`);
        continue;
      }

      // Check model validity against Model Master with flexible name/code matches & stripped BATTERY prefixes
      const cleanModelCode = modelCode.replace(/^BATTERY\s+/i, '').trim().toUpperCase();
      const model = db.models.find(m => {
        const mc = m.code.toUpperCase().trim();
        const mn = m.name.toUpperCase().trim();
        return mc === cleanModelCode || mn === cleanModelCode || mc === modelCode || mn === modelCode;
      });

      if (!model) {
        errors.push(`Row ${i + 1}: Model '${modelCode}' does not exist in the Model Master.`);
        continue;
      }

      // Normalize modelCode to the proper, validated prefix code from the Model Master
      modelCode = model.code;

      // Check plant validity
      const plantExists = db.plants.some(p => p.name.toLowerCase() === plantName.toLowerCase());
      if (!plantExists) {
        errors.push(`Row ${i + 1}: Plant '${plantName}' does not exist in the Plant Master.`);
        continue;
      }

      const sNum = parseInt(startStr, 10);
      const eNum = parseInt(endStr, 10);
      if (isNaN(sNum) || isNaN(eNum) || sNum > eNum) {
        errors.push(`Row ${i + 1}: Invalid serial number range [${startStr} - ${endStr}]. Start must be numeric and <= End.`);
        continue;
      }

      // Determine prefix
      const prefix = serialCode ? serialCode : `${modelCode}`;

      // Customer unique code validations if customer matches
      if (customerName) {
        const selectedCustomer = db.customers.find(c => c.name.toLowerCase() === customerName.toLowerCase());
        if (selectedCustomer && selectedCustomer.uniqueCodeLength) {
          if (prefix.length !== selectedCustomer.uniqueCodeLength) {
            errors.push(`Row ${i + 1}: Unique Code / Model Code prefix '${prefix}' must be exactly ${selectedCustomer.uniqueCodeLength} characters for customer '${customerName}'.`);
            continue;
          }
        }
      }

      // Determine padding length
      let digitsLength = startStr.length || (customerName ? db.customers.find(c => c.name.toLowerCase() === customerName.toLowerCase())?.numericDigitsOfSerial || 4 : 4);
      if (customerName) {
        const customer = db.customers.find(c => c.name.toLowerCase() === customerName.toLowerCase());
        if (customer && customer.numericDigitsOfSerial) {
          digitsLength = customer.numericDigitsOfSerial;
        }
      }

      // Check for self-overlap in the current import file
      const selfOverlap = importRanges.find(r => r.modelCode === modelCode && ((sNum >= r.start && sNum <= r.end) || (eNum >= r.start && eNum <= r.end) || (r.start >= sNum && r.start <= eNum)));
      if (selfOverlap) {
        errors.push(`Row ${i + 1}: Range [${sNum} - ${eNum}] overlaps with another range in the same file at Row ${selfOverlap.rowIndex + 1}.`);
        continue;
      }
      importRanges.push({ modelCode, start: sNum, end: eNum, rowIndex: i });

      // Determine year and month from date
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        errors.push(`Row ${i + 1}: Invalid allotment date format '${date}'. Ensure dates are in YYYY-MM-DD or valid date format.`);
        continue;
      }
      const curYear = parsedDate.getFullYear().toString();
      const curMonth = String(parsedDate.getMonth() + 1).padStart(2, '0');

      // Check for duplicate individual serial numbers in db.serialNumbers
      let dupFound = false;
      for (let num = sNum; num <= eNum; num++) {
        const sCode = `${prefix}${String(num).padStart(digitsLength, '0')}`;
        if (db.serialNumbers.some(sn => sn.serialNumber === sCode)) {
          errors.push(`Row ${i + 1}: Serial number '${sCode}' already exists in database.`);
          dupFound = true;
          break;
        }
      }
      if (dupFound) continue;

      // If we got here, this row is completely valid!
      const startSerialCode = `${prefix}${String(sNum).padStart(digitsLength, '0')}`;
      const endSerialCode = `${prefix}${String(eNum).padStart(digitsLength, '0')}`;
      const qty = eNum - sNum + 1;

      validatedAllotments.push({
        id: `allot-import-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
        date,
        modelCode,
        plantName: db.plants.find(p => p.name.toLowerCase() === plantName.toLowerCase())?.name || plantName,
        startSerial: startSerialCode,
        endSerial: endSerialCode,
        quantity: qty,
        remarks,
        allottedBy: req.user?.name || 'Super Admin',
        createdAt: new Date().toISOString(),
        customerName: db.customers.find(c => c.name.toLowerCase() === customerName.toLowerCase())?.name || customerName || null,
        serialCode: serialCode || null,
        status: status || 'Active',
        year: curYear,
        month: curMonth,
        digitsLength,
        endNo: eNum
      });

      for (let num = sNum; num <= eNum; num++) {
        const sCode = `${prefix}${String(num).padStart(digitsLength, '0')}`;
        serialsToAdd.push({
          serialNumber: sCode,
          modelCode,
          year: curYear,
          month: curMonth,
          runningNumber: String(num).padStart(digitsLength, '0'),
          status: 'Allotted',
          currentPlant: db.plants.find(p => p.name.toLowerCase() === plantName.toLowerCase())?.name || plantName,
          customerName: db.customers.find(c => c.name.toLowerCase() === customerName.toLowerCase())?.name || customerName || null,
          createdAt: new Date().toISOString()
        });
      }
    }

    // Atomic transaction: only process if there are ZERO errors across all rows!
    if (errors.length > 0) {
      res.status(200).json({
        success: false,
        imported: 0,
        errors,
        message: 'Import failed due to validation errors. Correct them and try again.'
      });
      return;
    }

    // Apply the allotments and serials to the DB
    validatedAllotments.forEach(allot => {
      db.serialRanges.push(allot);
      // Also update model's currentSerial running count
      const modelIndex = db.models.findIndex(m => m.code === allot.modelCode);
      if (modelIndex !== -1) {
        const endNo = allot.endNo || parseInt(allot.endSerial.slice(-6), 10);
        db.models[modelIndex].currentSerial = String(endNo + 1);
      }
    });

    serialsToAdd.forEach(serial => {
      db.serialNumbers.push(serial);
    });

    writeDB(db);
    broadcastDashboardStats();

    logAudit(req.user.email, 'BULK_IMPORT', '', `Imported ${validatedAllotments.length} ranges (${serialsToAdd.length} serials) via Excel sheet.`, req);

    res.json({
      success: true,
      imported: validatedAllotments.length,
      errors: [],
      message: `Successfully imported ${validatedAllotments.length} ranges and generated ${serialsToAdd.length} allotted serial numbers.`
    });
  });

  // API - DATABASE BACKUP / RESTORE
  app.get('/api/admin/backup', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'Super Admin') {
      res.status(403).json({ error: 'Forbidden: Super Admin only' });
      return;
    }
    const db = readDB();
    res.json({
      timestamp: new Date().toISOString(),
      database: db
    });
  });

  app.post('/api/admin/restore', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'Super Admin') {
      res.status(403).json({ error: 'Forbidden: Super Admin only' });
      return;
    }
    const { database } = req.body;
    if (!database || !database.users || !database.plants || !database.models) {
      res.status(400).json({ error: 'Invalid database backup structure' });
      return;
    }

    writeDB(database);
    logAudit(req.user.email, 'DB_RESTORE', '', 'Database restored from backup package', req);
    res.json({ success: true, message: 'Database successfully restored.' });
  });

  app.post('/api/admin/clear-serial-data', authenticateToken as any, (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== 'Super Admin') {
      res.status(403).json({ error: 'Forbidden: Super Admin only' });
      return;
    }

    const db = readDB();
    db.serialRanges = [];
    db.serialNumbers = [];
    db.production = [];
    db.transfers = [];
    db.dispatches = [];
    db.pdi = [];
    db.pdiOffered = [];
    db.firstTimeHoldHistory = [];

    if (db.models && db.models.length > 0) {
      db.models.forEach(m => {
        m.currentSerial = '100001';
      });
    }

    writeDB(db);
    logAudit(req.user.email, 'CLEAR_OPERATIONAL_DATA', '', 'Cleared all serial range allocations, serial numbers, PDI records, and dispatches', req);
    broadcastDashboardStats();

    res.json({ success: true, message: 'All serial numbers and operational transaction logs cleared successfully.' });
  });

  // 404 API Fallback: Unmatched /api/* routes must return JSON, not HTML index pages
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API endpoint ${req.method} ${req.url} not found` });
  });

  // Vercel serves the client bundle itself and forwards only /api/* requests
  // to this function, so no development or static-file middleware is needed.
  if (process.env.VERCEL) {
    return app;
  }

  // Vite Middleware Setup or Production Static Files
  if (process.env.NODE_ENV !== 'production') {
    // Vite is a development dependency at runtime. Loading it while a Vercel
    // function starts can fail because its optional native build dependencies
    // are not included in the serverless bundle.
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

