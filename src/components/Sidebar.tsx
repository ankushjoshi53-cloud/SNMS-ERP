import {
  LayoutDashboard,
  Factory,
  Cpu,
  ShoppingBag,
  Users,
  Layers,
  ClipboardCheck,
  ArrowLeftRight,
  Truck,
  Search,
  FileSpreadsheet,
  History,
  X
} from 'lucide-react';
import { UserRole } from '../types';

export function normalizeRole(role: string): string {
  if (!role) return 'Viewer';
  if (role === 'QA Head' || role === 'QA Manager') return 'QA';
  if (role === 'Plant User' || role === 'Plant Operator') return 'Production';
  if (role === 'Dispatch User' || role === 'Dispatch Officer') return 'Dispatch';
  return role;
}

const authKeyMap: Record<string, string> = {
  plants: 'plantMaster',
  models: 'modelMaster',
  customers: 'customerMaster',
  allotments: 'rangeAllotment',
  production: 'packingEntry',
  pdi: 'pdiQualityCheck',
  transfers: 'interPlantTransfer',
  dispatches: 'dispatchControl'
};

interface SidebarProps {
  currentTab: string;
  onChangeTab: (tab: string) => void;
  currentUser: any;
  isOpen: boolean;
  onClose: () => void;
}

interface NavSection {
  title: string;
  items: {
    id: string;
    label: string;
    icon: any;
    roles: UserRole[];
  }[];
}

export default function Sidebar({ currentTab, onChangeTab, currentUser, isOpen, onClose }: SidebarProps) {
  const userRole = normalizeRole(currentUser?.role || '') as UserRole;
  const authorizations = currentUser?.authorizations;

  const sections: NavSection[] = [
    {
      title: 'Analytics',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Super Admin', 'QA', 'Production', 'PDI', 'Dispatch', 'Viewer'] }
      ]
    },
    {
      title: 'Master Modules',
      items: [
        { id: 'plants', label: 'Plant Master', icon: Factory, roles: ['Super Admin', 'QA', 'Viewer'] },
        { id: 'models', label: 'Model Master', icon: Cpu, roles: ['Super Admin', 'QA', 'Viewer'] },
        { id: 'customers', label: 'Customer Master', icon: ShoppingBag, roles: ['Super Admin', 'QA', 'Dispatch', 'Viewer'] },
        { id: 'users', label: 'User Master', icon: Users, roles: ['Super Admin'] }
      ]
    },
    {
      title: 'Industrial Workflow',
      items: [
        { id: 'allotments', label: 'Range Allotment', icon: Layers, roles: ['Super Admin', 'QA'] },
        { id: 'transfers', label: 'Inter-Plant Transfer', icon: ArrowLeftRight, roles: ['Super Admin', 'QA', 'Production'] },
        { id: 'production', label: 'Packing Entry', icon: ClipboardCheck, roles: ['Super Admin', 'Production'] },
        { id: 'pdi', label: 'PDI Quality Check', icon: ClipboardCheck, roles: ['Super Admin', 'QA', 'PDI'] },
        { id: 'dispatches', label: 'Dispatch Control', icon: Truck, roles: ['Super Admin', 'Dispatch'] }
      ]
    },
    {
      title: 'Trace & Reports',
      items: [
        { id: 'traceability', label: 'Traceability Engine', icon: Search, roles: ['Super Admin', 'QA', 'Production', 'PDI', 'Dispatch', 'Viewer'] },
        { id: 'reports', label: 'Enterprise Reports', icon: FileSpreadsheet, roles: ['Super Admin', 'QA', 'Production', 'PDI', 'Dispatch', 'Viewer'] },
        { id: 'audit-logs', label: 'Security Audit Trail', icon: History, roles: ['Super Admin'] }
      ]
    }
  ];

  return (
    <>
      {/* Mobile Sidebar Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 w-64 bg-slate-950 border-r border-slate-900 text-slate-300 flex flex-col h-full select-none shrink-0 overflow-y-auto z-50 transition-transform duration-300 transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-bold text-white font-display">P</div>
            <div>
              <span className="text-white font-bold tracking-tight text-lg font-display block leading-none">SNMS-ERP</span>
              <span className="text-[10px] font-semibold text-indigo-400 block mt-1 tracking-wider uppercase font-mono">Pilot Industries Ltd</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition cursor-pointer"
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      <div className="flex-1 py-6 space-y-6">
        {sections.map((section, idx) => {
          // Filter items based on user permission roles and granular view authorizations
          const visibleItems = section.items.filter(item => {
            if (!item.roles.includes(userRole)) {
              return false;
            }
            const authKey = authKeyMap[item.id];
            if (authKey && authorizations && authorizations[authKey]) {
              return authorizations[authKey].view;
            }
            return true;
          });
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="px-4">
              <h3 className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                {section.title}
              </h3>
              <div className="space-y-1">
                {visibleItems.map(item => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onChangeTab(item.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                          : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Corporate Version Footer */}
      <div className="p-4 border-t border-slate-900 bg-slate-950/40 text-center text-[10px] text-slate-500 shrink-0">
        <p className="font-semibold text-slate-400">SNMS Enterprise Suite</p>
        <p className="font-mono mt-0.5">v2026.07.07</p>
        <p className="mt-1 font-semibold text-slate-400">Developed By:- Ankush Joshi</p>
      </div>
    </aside>
   </>
  );
}
