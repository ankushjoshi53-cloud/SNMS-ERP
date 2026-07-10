import { CustomerAuthorizations, ModulePermissions } from '../types';

export function normalizeRole(role: string): string {
  if (!role) return 'Viewer';
  if (role === 'QA Head' || role === 'QA Manager') return 'QA';
  if (role === 'Plant User' || role === 'Plant Operator') return 'Production';
  if (role === 'Dispatch User' || role === 'Dispatch Officer') return 'Dispatch';
  return role;
}

export function getPermissions(currentUser: any, moduleKey: keyof CustomerAuthorizations): ModulePermissions {
  // Super Admin always has full access
  if (currentUser?.role === 'Super Admin') {
    return { view: true, add: true, edit: true, delete: true };
  }
  
  const defaultPermissions: ModulePermissions = { view: false, add: false, edit: false, delete: false };
  
  if (!currentUser) return defaultPermissions;
  
  // If the user has custom authorizations configured in their account, use them!
  if (currentUser.authorizations && currentUser.authorizations[moduleKey]) {
    return currentUser.authorizations[moduleKey];
  }
  
  // Otherwise, fall back to default role-based assignments
  const role = normalizeRole(currentUser.role);
  
  if (moduleKey === 'plantMaster' || moduleKey === 'modelMaster') {
    const hasView = ['QA', 'Viewer'].includes(role);
    const hasWrite = ['QA'].includes(role);
    return { view: hasView, add: hasWrite, edit: hasWrite, delete: false };
  }
  if (moduleKey === 'customerMaster') {
    const hasView = ['QA', 'Dispatch', 'Viewer'].includes(role);
    const hasWrite = ['QA'].includes(role);
    return { view: hasView, add: hasWrite, edit: hasWrite, delete: false };
  }
  if (moduleKey === 'rangeAllotment') {
    const isQA = ['QA'].includes(role);
    return { view: isQA, add: isQA, edit: isQA, delete: false };
  }
  if (moduleKey === 'packingEntry') {
    const isProd = ['Production'].includes(role);
    return { view: isProd, add: isProd, edit: isProd, delete: false };
  }
  if (moduleKey === 'pdiQualityCheck') {
    const isPDIOrQA = ['QA', 'PDI'].includes(role);
    return { view: isPDIOrQA, add: isPDIOrQA, edit: isPDIOrQA, delete: false };
  }
  if (moduleKey === 'interPlantTransfer') {
    const hasView = ['QA', 'Production'].includes(role);
    return { view: hasView, add: hasView, edit: hasView, delete: false };
  }
  if (moduleKey === 'dispatchControl') {
    const isDispatch = ['Dispatch'].includes(role);
    return { view: isDispatch, add: isDispatch, edit: isDispatch, delete: false };
  }
  
  return defaultPermissions;
}
