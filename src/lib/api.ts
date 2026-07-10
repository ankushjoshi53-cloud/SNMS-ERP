import { UserRole } from '../types';

const API_BASE = '/api';

function getHeaders() {
  const token = localStorage.getItem('erp_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

export async function request(url: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers
    }
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Server responded with status ${res.status}`);
  }

  return res.json();
}

export const api = {
  auth: {
    login: (body: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    me: () => request('/auth/me')
  },
  plants: {
    list: () => request('/plants'),
    create: (body: any) => request('/plants', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) => request(`/plants/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: string) => request(`/plants/${id}`, { method: 'DELETE' })
  },
  models: {
    list: () => request('/models'),
    create: (body: any) => request('/models', { method: 'POST', body: JSON.stringify(body) }),
    bulk: (body: { rows: any[] }) => request('/models/bulk', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) => request(`/models/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: string) => request(`/models/${id}`, { method: 'DELETE' })
  },
  customers: {
    list: () => request('/customers'),
    create: (body: any) => request('/customers', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: string) => request(`/customers/${id}`, { method: 'DELETE' })
  },
  users: {
    list: () => request('/users'),
    create: (body: any) => request('/users', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: string) => request(`/users/${id}`, { method: 'DELETE' })
  },
  allotments: {
    list: () => request('/allotments'),
    create: (body: any) => request('/allotments', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) => request(`/allotments/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: string) => request(`/allotments/${id}`, { method: 'DELETE' })
  },
  production: {
    list: () => request('/production'),
    create: (body: any) => request('/production', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) => request(`/production/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: string) => request(`/production/${id}`, { method: 'DELETE' })
  },
  pdi: {
    list: () => request('/pdi'),
    create: (body: any) => request('/pdi', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) => request(`/pdi/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: string) => request(`/pdi/${id}`, { method: 'DELETE' })
  },
  pdiOffered: {
    list: () => request('/pdi-offered'),
    create: (body: any) => request('/pdi-offered', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) => request(`/pdi-offered/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: string) => request(`/pdi-offered/${id}`, { method: 'DELETE' })
  },
  transfers: {
    list: () => request('/transfers'),
    create: (body: any) => request('/transfers', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) => request(`/transfers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: string) => request(`/transfers/${id}`, { method: 'DELETE' }),
    approve: (id: string, remarks?: string) => request(`/transfers/${id}/approve`, { method: 'POST', body: JSON.stringify({ remarks }) }),
    reject: (id: string, remarks?: string) => request(`/transfers/${id}/reject`, { method: 'POST', body: JSON.stringify({ remarks }) }),
    suggestRanges: (fromPlant: string, modelCode: string, customerName?: string) => {
      let url = `/transfers/suggest-ranges?fromPlant=${encodeURIComponent(fromPlant)}&modelCode=${encodeURIComponent(modelCode)}`;
      if (customerName) {
        url += `&customerName=${encodeURIComponent(customerName)}`;
      }
      return request(url);
    }
  },
  dispatches: {
    list: () => request('/dispatches'),
    create: (body: any) => request('/dispatches', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) => request(`/dispatches/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: string) => request(`/dispatches/${id}`, { method: 'DELETE' })
  },
  traceability: {
    get: (serial: string) => request(`/traceability/${serial}`)
  },
  search: {
    query: (params: Record<string, string>) => {
      const q = new URLSearchParams(params).toString();
      return request(`/search?${q}`);
    }
  },
  dashboard: {
    stats: () => request('/dashboard/stats')
  },
  notifications: {
    list: () => request('/notifications'),
    read: (id: string) => request(`/notifications/${id}/read`, { method: 'POST' })
  },
  reports: {
    modelWise: () => request('/reports/model-wise'),
    plantWise: () => request('/reports/plant-wise'),
    customerWise: () => request('/reports/customer-wise'),
    unusedSerials: () => request('/reports/unused-serials'),
    duplicateChecks: () => request('/reports/duplicate-checks'),
    holdSummary: () => request('/reports/hold-summary'),
    auditLogs: (params: Record<string, any> = {}) => {
      const q = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          q.append(key, String(val));
        }
      });
      const queryStr = q.toString();
      return request(`/reports/audit-logs${queryStr ? '?' + queryStr : ''}`);
    },
    deleteAuditLog: (id: string) => request(`/reports/audit-logs/${id}`, { method: 'DELETE' }),
    archiveAuditLogs: () => request('/reports/audit-logs/archive', { method: 'POST' }),
    exportUrl: (type: string, format: string) => `${API_BASE}/reports/export?type=${type}&format=${format}&token=${localStorage.getItem('erp_token')}`,
    exportData: (type: string) => request(`/reports/export?type=${type}`),
    bulkImport: (rows: any[]) => request('/reports/import', { method: 'POST', body: JSON.stringify({ rows }) })
  },
  admin: {
    backup: () => request('/admin/backup'),
    restore: (database: any) => request('/admin/restore', { method: 'POST', body: JSON.stringify({ database }) }),
    clearSerialData: () => request('/admin/clear-serial-data', { method: 'POST' }),
    clearAllData: () => request('/admin/clear-all', { method: 'POST' })
  },
  environment: {
    get: () => request('/environment'),
    set: (env: 'live' | 'demo') => request('/environment', { method: 'POST', body: JSON.stringify({ environment: env }) })
  }
};
