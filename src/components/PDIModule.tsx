import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { PDIEntry, SerialNumber, PDIOfferedRange, BatteryModel, Plant } from '../types';
import { 
  ClipboardCheck, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Search, 
  HelpCircle, 
  ShieldAlert, 
  FileText, 
  Printer, 
  Check, 
  Info, 
  ArrowRight, 
  Calendar, 
  Layers, 
  MapPin, 
  ListOrdered,
  AlertTriangle,
  Edit2,
  Trash2,
  X
} from 'lucide-react';
import { getPermissions } from '../lib/permissions';

export default function PDIModule({ currentUser }: { currentUser: any }) {
  const perms = getPermissions(currentUser, 'pdiQualityCheck');
  const [activeTab, setActiveTab] = useState<'individual' | 'offered-range' | 'offered-list' | 'pdi-rework'>('offered-range');
  const [pdiList, setPdiList] = useState<PDIEntry[]>([]);
  const [offeredList, setOfferedList] = useState<PDIOfferedRange[]>([]);
  const [producedBatteries, setProducedBatteries] = useState<SerialNumber[]>([]);
  const [models, setModels] = useState<BatteryModel[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 1.1 REWORK FORM STATES
  const [reworkSubTab, setReworkSubTab] = useState<'individual' | 'range'>(
    currentUser?.role === 'Super Admin' ? 'individual' : 'range'
  );
  
  // Force range subtab for non-admins if role changes
  useEffect(() => {
    if (currentUser?.role !== 'Super Admin' && reworkSubTab === 'individual') {
      setReworkSubTab('range');
    }
  }, [currentUser, reworkSubTab]);

  const [reworkSerial, setReworkSerial] = useState('');
  const [reworkStatus, setReworkStatus] = useState<'Approved' | 'Rejected' | 'Hold'>('Approved');
  const [reworkRemarks, setReworkRemarks] = useState('');
  
  const [reworkVoltageCheck, setReworkVoltageCheck] = useState(true);
  const [reworkGravityCheck, setReworkGravityCheck] = useState(true);
  const [reworkLeakCheck, setReworkLeakCheck] = useState(true);
  const [reworkTerminalCheck, setReworkTerminalCheck] = useState(true);
  
  const [reworkOcvLow, setReworkOcvLow] = useState(false);
  const [reworkOcvHigh, setReworkOcvHigh] = useState(false);
  const [reworkGravityLow, setReworkGravityLow] = useState(false);
  const [reworkGravityHigh, setReworkGravityHigh] = useState(false);
  const [reworkTerminalOxidation, setReworkTerminalOxidation] = useState(false);
  const [reworkVentLeakage, setReworkVentLeakage] = useState(false);
  const [reworkVentLoose, setReworkVentLoose] = useState(false);

  // Auto-switch rework status to 'Hold' if any of the defect checkboxes are selected
  useEffect(() => {
    if (reworkOcvLow || reworkOcvHigh || reworkGravityLow || reworkGravityHigh || reworkTerminalOxidation || reworkVentLeakage || reworkVentLoose) {
      setReworkStatus('Hold');
    }
  }, [reworkOcvLow, reworkOcvHigh, reworkGravityLow, reworkGravityHigh, reworkTerminalOxidation, reworkVentLeakage, reworkVentLoose]);

  // 1.2 REWORK RANGE FORM STATES
  const [reworkSelectedPlant, setReworkSelectedPlant] = useState('');
  const [reworkSelectedModel, setReworkSelectedModel] = useState('');
  const [reworkStartSerial, setReworkStartSerial] = useState('');
  const [reworkEndSerial, setReworkEndSerial] = useState('');
  
  const [reworkRangeSerials, setReworkRangeSerials] = useState<SerialNumber[]>([]);
  const [reworkSerialDecisions, setReworkSerialDecisions] = useState<Record<string, 'Approved' | 'Hold' | 'Rejected'>>({});
  const [reworkAestheticIssuesCheck, setReworkAestheticIssuesCheck] = useState(false);
  const [reworkAestheticIssueRemarks, setReworkAestheticIssueRemarks] = useState('');
  const [reworkGeneralRemarks, setReworkGeneralRemarks] = useState('');

  const [reworkOcvLowRange, setReworkOcvLowRange] = useState(false);
  const [reworkOcvHighRange, setReworkOcvHighRange] = useState(false);
  const [reworkGravityLowRange, setReworkGravityLowRange] = useState(false);
  const [reworkGravityHighRange, setReworkGravityHighRange] = useState(false);
  const [reworkTerminalOxidationRange, setReworkTerminalOxidationRange] = useState(false);
  const [reworkVentLeakageRange, setReworkVentLeakageRange] = useState(false);
  const [reworkVentLooseRange, setReworkVentLooseRange] = useState(false);

  // Auto-switch status of range decisions to 'Hold' if any defect is selected
  useEffect(() => {
    if (reworkOcvLowRange || reworkOcvHighRange || reworkGravityLowRange || reworkGravityHighRange || reworkTerminalOxidationRange || reworkVentLeakageRange || reworkVentLooseRange) {
      setReworkSerialDecisions(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(sn => {
          updated[sn] = 'Hold';
        });
        return updated;
      });
    }
  }, [reworkOcvLowRange, reworkOcvHighRange, reworkGravityLowRange, reworkGravityHighRange, reworkTerminalOxidationRange, reworkVentLeakageRange, reworkVentLooseRange]);

  // Reset rework range selections on plant/model change
  useEffect(() => {
    setReworkStartSerial('');
    setReworkEndSerial('');
    setReworkRangeSerials([]);
    setReworkSerialDecisions({});
    setReworkOcvLowRange(false);
    setReworkOcvHighRange(false);
    setReworkGravityLowRange(false);
    setReworkGravityHighRange(false);
    setReworkTerminalOxidationRange(false);
    setReworkVentLeakageRange(false);
    setReworkVentLooseRange(false);
  }, [reworkSelectedPlant, reworkSelectedModel]);

  // Edit Individual PDI states
  const [editingIndividual, setEditingIndividual] = useState<PDIEntry | null>(null);
  const [editStatus, setEditStatus] = useState<'Approved' | 'Hold' | 'Rejected'>('Approved');
  const [editRemarks, setEditRemarks] = useState('');
  const [editSerialNumber, setEditSerialNumber] = useState('');
  const [editInspectionDate, setEditInspectionDate] = useState('');

  // Edit Offered PDI states
  const [editingOffered, setEditingOffered] = useState<PDIOfferedRange | null>(null);
  const [editOfferedDate, setEditOfferedDate] = useState('');
  const [editOfferedGeneralRemarks, setEditOfferedGeneralRemarks] = useState('');
  const [editOfferedAestheticIssuesCheck, setEditOfferedAestheticIssuesCheck] = useState(false);
  const [editOfferedAestheticIssueRemarks, setEditOfferedAestheticIssueRemarks] = useState('');
  const [editOfferedModelCode, setEditOfferedModelCode] = useState('');
  const [editOfferedPlantName, setEditOfferedPlantName] = useState('');
  const [editOfferedStartSerial, setEditOfferedStartSerial] = useState('');
  const [editOfferedEndSerial, setEditOfferedEndSerial] = useState('');

  // 1. INDIVIDUAL FORM STATES
  const [serialNumber, setSerialNumber] = useState('');
  const [status, setStatus] = useState<'Approved' | 'Rejected' | 'Hold'>('Approved');
  const [remarks, setRemarks] = useState('');
  const [voltageCheck, setVoltageCheck] = useState(true);
  const [gravityCheck, setGravityCheck] = useState(true);
  const [leakCheck, setLeakCheck] = useState(true);
  const [terminalCheck, setTerminalCheck] = useState(true);

  // New failure checkpoints requested by user:
  const [ocvLow, setOcvLow] = useState(false);
  const [ocvHigh, setOcvHigh] = useState(false);
  const [gravityLow, setGravityLow] = useState(false);
  const [gravityHigh, setGravityHigh] = useState(false);
  const [terminalOxidation, setTerminalOxidation] = useState(false);
  const [ventLeakage, setVentLeakage] = useState(false);
  const [ventLoose, setVentLoose] = useState(false);

  // Auto-switch status to 'Hold' if any of the defect checkboxes are selected
  useEffect(() => {
    if (ocvLow || ocvHigh || gravityLow || gravityHigh || terminalOxidation || ventLeakage || ventLoose) {
      setStatus('Hold');
    }
  }, [ocvLow, ocvHigh, gravityLow, gravityHigh, terminalOxidation, ventLeakage, ventLoose]);

  // 2. OFFERED RANGE FORM STATES
  const [offeredDate, setOfferedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [startSerial, setStartSerial] = useState('');
  const [endSerial, setEndSerial] = useState('');
  
  // Real-time classification list of serial numbers in chosen range
  const [rangeSerials, setRangeSerials] = useState<SerialNumber[]>([]);
  const [serialDecisions, setSerialDecisions] = useState<Record<string, 'Approved' | 'Hold' | 'Rejected'>>({});
  
  // Aesthetic issue checkpoint states
  const [aestheticIssuesCheck, setAestheticIssuesCheck] = useState(false);
  const [aestheticIssueRemarks, setAestheticIssueRemarks] = useState('');
  const [generalRemarks, setGeneralRemarks] = useState('');

  // New range defect checkpoints (mirroring individual)
  const [ocvLowRange, setOcvLowRange] = useState(false);
  const [ocvHighRange, setOcvHighRange] = useState(false);
  const [gravityLowRange, setGravityLowRange] = useState(false);
  const [gravityHighRange, setGravityHighRange] = useState(false);
  const [terminalOxidationRange, setTerminalOxidationRange] = useState(false);
  const [ventLeakageRange, setVentLeakageRange] = useState(false);
  const [ventLooseRange, setVentLooseRange] = useState(false);

  // Auto-switch status of range decisions to 'Hold' if any defect is selected
  useEffect(() => {
    if (ocvLowRange || ocvHighRange || gravityLowRange || gravityHighRange || terminalOxidationRange || ventLeakageRange || ventLooseRange) {
      setSerialDecisions(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(sn => {
          updated[sn] = 'Hold';
        });
        return updated;
      });
    }
  }, [ocvLowRange, ocvHighRange, gravityLowRange, gravityHighRange, terminalOxidationRange, ventLeakageRange, ventLooseRange]);

  // 3. REPORT / MODAL / SCORECARD DETAIL STATE
  const [selectedReport, setSelectedReport] = useState<PDIOfferedRange | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSummaryDetail, setActiveSummaryDetail] = useState<'Approved' | 'Hold' | 'Rejected' | 'Total' | 'Pending' | null>(null);
  const [summaryDetailSearch, setSummaryDetailSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, offeredRes, modelList, plantList, serials] = await Promise.all([
        api.pdi.list(),
        api.pdiOffered.list(),
        api.models.list(),
        api.plants.list(),
        api.search.query({})
      ]);

      setPdiList(list);
      setOfferedList(offeredRes);
      setModels(modelList.filter(m => m.status === 'Active'));
      setPlants(plantList);

      // Save produced/hold batteries
      setProducedBatteries(serials);

      if (plantList.length > 0) {
        setSelectedPlant(plantList[0].name);
        setReworkSelectedPlant(plantList[0].name);
      }
      const firstActiveModel = modelList.find(m => m.status === 'Active') || modelList[0];
      if (firstActiveModel) {
        setSelectedModel(firstActiveModel.code);
        setReworkSelectedModel(firstActiveModel.code);
      }

      // Default the individual serial selector
      const pending = serials.filter((s: SerialNumber) => s.status === 'Produced' || s.status === 'PDI Hold');
      if (pending.length > 0) {
        setSerialNumber(pending[0].serialNumber);
      }

      // Default the rework individual serial selector
      const reworkPending = serials.filter((s: SerialNumber) => s.status === 'PDI Hold' || s.status === 'PDI Rejected');
      if (reworkPending.length > 0) {
        setReworkSerial(reworkPending[0].serialNumber);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch quality records');
    } finally {
      setLoading(false);
    }
  };

  const startEditIndividual = (entry: PDIEntry) => {
    setEditingIndividual(entry);
    setEditStatus(entry.status as any);
    setEditRemarks(entry.remarks || '');
    setEditSerialNumber(entry.serialNumber || '');
    setEditInspectionDate(entry.inspectionDate || '');
  };

  const handleUpdateIndividual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIndividual) return;
    setError('');
    setSuccess('');
    try {
      await api.pdi.update(editingIndividual.id, {
        status: editStatus,
        remarks: editRemarks,
        serialNumber: editSerialNumber,
        inspectionDate: editInspectionDate
      });
      setSuccess('PDI inspection entry successfully updated!');
      setEditingIndividual(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update PDI entry');
    }
  };

  const handleDeleteIndividual = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this PDI inspection entry?')) return;
    setError('');
    setSuccess('');
    try {
      await api.pdi.delete(id);
      setSuccess('PDI entry successfully deleted!');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete PDI entry');
    }
  };

  const startEditOffered = (offer: PDIOfferedRange) => {
    setEditingOffered(offer);
    setEditOfferedDate(offer.offeredDate);
    setEditOfferedGeneralRemarks(offer.generalRemarks || '');
    setEditOfferedAestheticIssuesCheck(!!offer.aestheticIssuesCheck);
    setEditOfferedAestheticIssueRemarks(offer.aestheticIssueRemarks || '');
    setEditOfferedModelCode(offer.modelCode);
    setEditOfferedPlantName(offer.plantName);
    setEditOfferedStartSerial(offer.startSerial);
    setEditOfferedEndSerial(offer.endSerial);
  };

  const handleUpdateOffered = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOffered) return;
    setError('');
    setSuccess('');
    try {
      await api.pdiOffered.update(editingOffered.id, {
        offeredDate: editOfferedDate,
        generalRemarks: editOfferedGeneralRemarks,
        aestheticIssuesCheck: editOfferedAestheticIssuesCheck,
        aestheticIssueRemarks: editOfferedAestheticIssueRemarks,
        modelCode: editOfferedModelCode,
        plantName: editOfferedPlantName,
        startSerial: editOfferedStartSerial,
        endSerial: editOfferedEndSerial
      });
      setSuccess('Offered PDI range successfully updated!');
      setEditingOffered(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update offered range');
    }
  };

  const handleDeleteOffered = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this entire offered PDI range? This will revert associated battery serial numbers.')) return;
    setError('');
    setSuccess('');
    try {
      await api.pdiOffered.delete(id);
      setSuccess('Offered PDI range successfully deleted!');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete offered PDI range');
    }
  };

  // Whenever Plant or Model changes in Offered Range, reset range selections
  useEffect(() => {
    setStartSerial('');
    setEndSerial('');
    setRangeSerials([]);
    setSerialDecisions({});
    setOcvLowRange(false);
    setOcvHighRange(false);
    setGravityLowRange(false);
    setGravityHighRange(false);
    setTerminalOxidationRange(false);
    setVentLeakageRange(false);
    setVentLooseRange(false);
  }, [selectedPlant, selectedModel]);

  // Filter serials matching selected plant and model (only Produced or PDI Hold - NEVER PDI Approved or PDI Rejected)
  const availableForRange = producedBatteries.filter(sn => 
    sn.modelCode === selectedModel && 
    sn.currentPlant === selectedPlant &&
    (sn.status === 'Produced' || sn.status === 'PDI Hold')
  );

  // Sort alphabetically/numerically
  const sortedAvailable = [...availableForRange].sort((a, b) => a.serialNumber.localeCompare(b.serialNumber));

  // Determine running number trailing digits for comparison
  const getRunningNum = (sn: string) => {
    const match = sn.match(/\d+$/);
    return match ? parseInt(match[0], 10) : 0;
  };

  // Build range list when start or end serial changes
  useEffect(() => {
    if (!startSerial || !endSerial) {
      setRangeSerials([]);
      setSerialDecisions({});
      return;
    }

    const startIdx = sortedAvailable.findIndex(s => s.serialNumber === startSerial);
    const endIdx = sortedAvailable.findIndex(s => s.serialNumber === endSerial);

    if (startIdx !== -1 && endIdx !== -1 && startIdx <= endIdx) {
      const sliced = sortedAvailable.slice(startIdx, endIdx + 1);
      setRangeSerials(sliced);
      
      // Initialize decisions to Approved (OK) or Hold (if defects are selected)
      const defaultStatus = (ocvLowRange || ocvHighRange || gravityLowRange || gravityHighRange || terminalOxidationRange || ventLeakageRange || ventLooseRange) ? 'Hold' : 'Approved';
      const initialDecisions: Record<string, 'Approved' | 'Hold' | 'Rejected'> = {};
      sliced.forEach(s => {
        initialDecisions[s.serialNumber] = defaultStatus;
      });
      setSerialDecisions(initialDecisions);
    } else {
      setRangeSerials([]);
      setSerialDecisions({});
    }
  }, [startSerial, endSerial, ocvLowRange, ocvHighRange, gravityLowRange, gravityHighRange, terminalOxidationRange, ventLeakageRange, ventLooseRange]);

  // Handle Individual QA submission
  const handleIndividualPDI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialNumber) {
      setError('Please select/scan a produced battery serial number.');
      return;
    }
    setError('');
    setSuccess('');

    let finalRemarks = remarks;
    if (!remarks) {
      const defects = [];
      if (ocvLow) defects.push("OCV Low");
      if (ocvHigh) defects.push("OCV High");
      if (gravityLow) defects.push("Specific Gravity Low");
      if (gravityHigh) defects.push("Specific Gravity High");
      if (terminalOxidation) defects.push("Terminal Oxidation");
      if (ventLeakage) defects.push("Vent Leakage");
      if (ventLoose) defects.push("Vent Loose");

      const passedChecks = [];
      if (voltageCheck) passedChecks.push("Voltage & OCV Test");
      if (gravityCheck) passedChecks.push("Specific Gravity Test");
      if (leakCheck) passedChecks.push("Case Welding Leakage Check");
      if (terminalCheck) passedChecks.push("Terminal Alignment Audit");

      if (defects.length > 0) {
        finalRemarks = `Hold Reason (Defects): ${defects.join(', ')}. Passed: ${passedChecks.join(', ')}`;
      } else {
        finalRemarks = `All Standard Checks Passed (${passedChecks.join(', ')})`;
      }
    }

    try {
      await api.pdi.create({
        serialNumber,
        status,
        remarks: finalRemarks
      });
      setSuccess(`Individual PDI logged for Serial: ${serialNumber}. Status: ${status}`);
      setRemarks('');
      setVoltageCheck(true);
      setGravityCheck(true);
      setLeakCheck(true);
      setTerminalCheck(true);
      setOcvLow(false);
      setOcvHigh(false);
      setGravityLow(false);
      setGravityHigh(false);
      setTerminalOxidation(false);
      setVentLeakage(false);
      setVentLoose(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to submit quality check');
    }
  };

  // Change decision of a single serial within the offered range
  const handleDecisionChange = (sn: string, value: 'Approved' | 'Hold' | 'Rejected') => {
    setSerialDecisions(prev => ({
      ...prev,
      [sn]: value
    }));
  };

  // Compute stats of current range
  const currentOkSerials = Object.entries(serialDecisions).filter(([_, status]) => status === 'Approved').map(([sn]) => sn);
  const currentHoldSerials = Object.entries(serialDecisions).filter(([_, status]) => status === 'Hold').map(([sn]) => sn);
  const currentRejectedSerials = Object.entries(serialDecisions).filter(([_, status]) => status === 'Rejected').map(([sn]) => sn);

  const totalQty = rangeSerials.length;
  const okQty = currentOkSerials.length;
  const holdQty = currentHoldSerials.length;
  const rejectedQty = currentRejectedSerials.length;

  // Handle registering of Offered Range PDI
  const handleRegisterOfferedRange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!startSerial || !endSerial || rangeSerials.length === 0) {
      setError('Please select a valid produced serial number range.');
      return;
    }

    const rangeDefects: string[] = [];
    if (ocvLowRange) rangeDefects.push("OCV Low");
    if (ocvHighRange) rangeDefects.push("OCV High");
    if (gravityLowRange) rangeDefects.push("Specific Gravity Low");
    if (gravityHighRange) rangeDefects.push("Specific Gravity High");
    if (terminalOxidationRange) rangeDefects.push("Terminal Oxidation");
    if (ventLeakageRange) rangeDefects.push("Vent Leakage");
    if (ventLooseRange) rangeDefects.push("Vent Loose");

    const finalRemarks = rangeDefects.length > 0
      ? `[Quality Defects Flagged: ${rangeDefects.join(', ')}] ${generalRemarks}`
      : generalRemarks;

    try {
      const result = await api.pdiOffered.create({
        offeredDate,
        modelCode: selectedModel,
        plantName: selectedPlant,
        startSerial,
        endSerial,
        totalQty,
        okQty,
        holdQty,
        rejectedQty,
        okSerials: currentOkSerials,
        holdSerials: currentHoldSerials,
        rejectedSerials: currentRejectedSerials,
        aestheticIssuesCheck,
        aestheticIssueRemarks: aestheticIssuesCheck ? aestheticIssueRemarks : '',
        generalRemarks: finalRemarks,
        ocvLowRange,
        ocvHighRange,
        gravityLowRange,
        gravityHighRange,
        terminalOxidationRange,
        ventLeakageRange,
        ventLooseRange
      });

      setSuccess(`Successfully registered PDI Offered Range Allotment! (${totalQty} Batteries Processed)`);
      
      // Reset form states
      setStartSerial('');
      setEndSerial('');
      setRangeSerials([]);
      setSerialDecisions({});
      setAestheticIssuesCheck(false);
      setAestheticIssueRemarks('');
      setGeneralRemarks('');
      setOcvLowRange(false);
      setOcvHighRange(false);
      setGravityLowRange(false);
      setGravityHighRange(false);
      setTerminalOxidationRange(false);
      setVentLeakageRange(false);
      setVentLooseRange(false);

      // Reload lists and switch to list tab
      await loadData();
      setActiveTab('offered-list');
    } catch (err: any) {
      setError(err.message || 'Failed to register PDI Offered Range.');
    }
  };

  // ==========================================
  // PDI FOR REWORK BATTERY LOGIC & HANDLERS
  // ==========================================

  // Filter serials matching selected plant and model that are currently 'PDI Hold'
  const reworkAvailableForRange = producedBatteries.filter(sn => 
    sn.modelCode === reworkSelectedModel && 
    sn.currentPlant === reworkSelectedPlant &&
    sn.status === 'PDI Hold'
  );

  // Sort alphabetically/numerically
  const reworkSortedAvailable = [...reworkAvailableForRange].sort((a, b) => a.serialNumber.localeCompare(b.serialNumber));

  // Build rework range list when start or end serial changes
  useEffect(() => {
    if (!reworkStartSerial || !reworkEndSerial) {
      setReworkRangeSerials([]);
      setReworkSerialDecisions({});
      return;
    }

    const startIdx = reworkSortedAvailable.findIndex(s => s.serialNumber === reworkStartSerial);
    const endIdx = reworkSortedAvailable.findIndex(s => s.serialNumber === reworkEndSerial);

    if (startIdx !== -1 && endIdx !== -1 && startIdx <= endIdx) {
      const sliced = reworkSortedAvailable.slice(startIdx, endIdx + 1);
      setReworkRangeSerials(sliced);
      
      // Initialize decisions to Approved (OK) or Hold (if defects are selected)
      const defaultStatus = (reworkOcvLowRange || reworkOcvHighRange || reworkGravityLowRange || reworkGravityHighRange || reworkTerminalOxidationRange || reworkVentLeakageRange || reworkVentLooseRange) ? 'Hold' : 'Approved';
      const initialDecisions: Record<string, 'Approved' | 'Hold' | 'Rejected'> = {};
      sliced.forEach(s => {
        initialDecisions[s.serialNumber] = defaultStatus;
      });
      setReworkSerialDecisions(initialDecisions);
    } else {
      setReworkRangeSerials([]);
      setReworkSerialDecisions({});
    }
  }, [reworkStartSerial, reworkEndSerial, reworkOcvLowRange, reworkOcvHighRange, reworkGravityLowRange, reworkGravityHighRange, reworkTerminalOxidationRange, reworkVentLeakageRange, reworkVentLooseRange]);

  // Handle Rework Individual QA submission
  const handleReworkIndividualPDI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reworkSerial) {
      setError('Please select/scan a Hold or Rejected battery serial number.');
      return;
    }
    setError('');
    setSuccess('');

    let finalRemarks = reworkRemarks;
    if (!reworkRemarks) {
      const defects = [];
      if (reworkOcvLow) defects.push("OCV Low");
      if (reworkOcvHigh) defects.push("OCV High");
      if (reworkGravityLow) defects.push("Specific Gravity Low");
      if (reworkGravityHigh) defects.push("Specific Gravity High");
      if (reworkTerminalOxidation) defects.push("Terminal Oxidation");
      if (reworkVentLeakage) defects.push("Vent Leakage");
      if (reworkVentLoose) defects.push("Vent Loose");

      const passedChecks = [];
      if (reworkVoltageCheck) passedChecks.push("Voltage & OCV Test");
      if (reworkGravityCheck) passedChecks.push("Specific Gravity Test");
      if (reworkLeakCheck) passedChecks.push("Case Welding Leakage Check");
      if (reworkTerminalCheck) passedChecks.push("Terminal Alignment Audit");

      if (defects.length > 0) {
        finalRemarks = `Hold Reason (Defects): ${defects.join(', ')}. Passed: ${passedChecks.join(', ')}`;
      } else {
        finalRemarks = `All Standard Checks Passed (${passedChecks.join(', ')})`;
      }
    }

    try {
      await api.pdi.create({
        serialNumber: reworkSerial,
        status: reworkStatus,
        remarks: `[Rework Clearance] ${finalRemarks}`
      });
      setSuccess(`Individual Rework PDI logged for Serial: ${reworkSerial}. Status: ${reworkStatus}`);
      setReworkRemarks('');
      setReworkVoltageCheck(true);
      setReworkGravityCheck(true);
      setReworkLeakCheck(true);
      setReworkTerminalCheck(true);
      setReworkOcvLow(false);
      setReworkOcvHigh(false);
      setReworkGravityLow(false);
      setReworkGravityHigh(false);
      setReworkTerminalOxidation(false);
      setReworkVentLeakage(false);
      setReworkVentLoose(false);
      
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to submit rework quality check');
    }
  };

  // Change decision of a single serial within the rework range
  const handleReworkDecisionChange = (sn: string, value: 'Approved' | 'Hold' | 'Rejected') => {
    setReworkSerialDecisions(prev => ({
      ...prev,
      [sn]: value
    }));
  };

  // Compute stats of current rework range
  const currentReworkOkSerials = Object.entries(reworkSerialDecisions).filter(([_, status]) => status === 'Approved').map(([sn]) => sn);
  const currentReworkHoldSerials = Object.entries(reworkSerialDecisions).filter(([_, status]) => status === 'Hold').map(([sn]) => sn);
  const currentReworkRejectedSerials = Object.entries(reworkSerialDecisions).filter(([_, status]) => status === 'Rejected').map(([sn]) => sn);

  const reworkTotalQty = reworkRangeSerials.length;
  const reworkOkQty = currentReworkOkSerials.length;
  const reworkHoldQty = currentReworkHoldSerials.length;
  const reworkRejectedQty = currentReworkRejectedSerials.length;

  // Handle registering of Rework Range PDI
  const handleRegisterReworkRange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!reworkStartSerial || !reworkEndSerial || reworkRangeSerials.length === 0) {
      setError('Please select a valid Hold or Rejected serial number range.');
      return;
    }

    const rangeDefects: string[] = [];
    if (reworkOcvLowRange) rangeDefects.push("OCV Low");
    if (reworkOcvHighRange) rangeDefects.push("OCV High");
    if (reworkGravityLowRange) rangeDefects.push("Specific Gravity Low");
    if (reworkGravityHighRange) rangeDefects.push("Specific Gravity High");
    if (reworkTerminalOxidationRange) rangeDefects.push("Terminal Oxidation");
    if (reworkVentLeakageRange) rangeDefects.push("Vent Leakage");
    if (reworkVentLooseRange) rangeDefects.push("Vent Loose");

    const finalRemarks = rangeDefects.length > 0
      ? `[Rework Defects Flagged: ${rangeDefects.join(', ')}] ${reworkGeneralRemarks}`
      : reworkGeneralRemarks;

    try {
      await api.pdiOffered.create({
        offeredDate,
        modelCode: reworkSelectedModel,
        plantName: reworkSelectedPlant,
        startSerial: reworkStartSerial,
        endSerial: reworkEndSerial,
        totalQty: reworkTotalQty,
        okQty: reworkOkQty,
        holdQty: reworkHoldQty,
        rejectedQty: reworkRejectedQty,
        okSerials: currentReworkOkSerials,
        holdSerials: currentReworkHoldSerials,
        rejectedSerials: currentReworkRejectedSerials,
        aestheticIssuesCheck: reworkAestheticIssuesCheck,
        aestheticIssueRemarks: reworkAestheticIssuesCheck ? reworkAestheticIssueRemarks : '',
        generalRemarks: `[Rework Clearance Range] ${finalRemarks}`
      });

      setSuccess(`Successfully registered Rework PDI Range! (${reworkTotalQty} Batteries Cleared/Processed)`);
      
      // Reset form states
      setReworkStartSerial('');
      setReworkEndSerial('');
      setReworkRangeSerials([]);
      setReworkSerialDecisions({});
      setReworkAestheticIssuesCheck(false);
      setReworkAestheticIssueRemarks('');
      setReworkGeneralRemarks('');
      setReworkOcvLowRange(false);
      setReworkOcvHighRange(false);
      setReworkGravityLowRange(false);
      setReworkGravityHighRange(false);
      setReworkTerminalOxidationRange(false);
      setReworkVentLeakageRange(false);
      setReworkVentLooseRange(false);

      // Reload lists and switch to list tab
      await loadData();
      setActiveTab('offered-list');
    } catch (err: any) {
      setError(err.message || 'Failed to register Rework PDI Range.');
    }
  };

  const filteredOffered = offeredList.filter(o => 
    o.modelCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.plantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.offeredBy.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPDISummaryDetails = () => {
    // We will use Maps to store unique entries keyed by serialNumber to prevent duplicates.
    const approvedMap = new Map<string, { serialNumber: string; source: string; date: string; remarks?: string }>();
    const holdMap = new Map<string, { serialNumber: string; source: string; date: string; remarks?: string }>();
    const rejectedMap = new Map<string, { serialNumber: string; source: string; date: string; remarks?: string }>();
    const totalMap = new Map<string, { serialNumber: string; status: 'Approved' | 'Hold' | 'Rejected'; source: string; date: string; remarks?: string }>();

    // Get the set of dispatched serial numbers to exclude them from the Approved (OK) stock count
    const dispatchedSerials = new Set(
      (producedBatteries || [])
        .filter(b => b.status === 'Dispatched')
        .map(b => b.serialNumber)
    );

    interface PDIEvent {
      timestamp: number;
      serialNumber: string;
      status: 'Approved' | 'Hold' | 'Rejected';
      detail: {
        serialNumber: string;
        source: string;
        date: string;
        remarks: string;
      };
    }

    const events: PDIEvent[] = [];

    // 1. Process individual PDI entries
    pdiList.forEach(entry => {
      const timestamp = entry.createdAt ? new Date(entry.createdAt).getTime() : new Date(entry.inspectionDate).getTime();
      events.push({
        timestamp,
        serialNumber: entry.serialNumber,
        status: entry.status,
        detail: {
          serialNumber: entry.serialNumber,
          source: entry.remarks?.includes('[Rework') ? 'Rework PDI Terminal' : 'Individual PDI Terminal',
          date: entry.inspectionDate,
          remarks: entry.remarks || ''
        }
      });
    });

    // 2. Process Offered Range PDI entries
    offeredList.forEach(item => {
      const timestamp = item.createdAt ? new Date(item.createdAt).getTime() : new Date(item.offeredDate).getTime();
      const dateStr = item.offeredDate;
      const rangeRemarks = item.generalRemarks || '';
      const source = rangeRemarks.includes('[Rework')
        ? `Rework Offered Range: ${item.modelCode} (${item.plantName})`
        : `Offered Range: ${item.modelCode} (${item.plantName})`;

      if (item.okSerials) {
        item.okSerials.forEach((sn: string) => {
          events.push({
            timestamp,
            serialNumber: sn,
            status: 'Approved',
            detail: {
              serialNumber: sn,
              source,
              date: dateStr,
              remarks: rangeRemarks
            }
          });
        });
      }
      if (item.holdSerials) {
        item.holdSerials.forEach((sn: string) => {
          events.push({
            timestamp,
            serialNumber: sn,
            status: 'Hold',
            detail: {
              serialNumber: sn,
              source,
              date: dateStr,
              remarks: rangeRemarks
            }
          });
        });
      }
      if (item.rejectedSerials) {
        item.rejectedSerials.forEach((sn: string) => {
          events.push({
            timestamp,
            serialNumber: sn,
            status: 'Rejected',
            detail: {
              serialNumber: sn,
              source,
              date: dateStr,
              remarks: rangeRemarks
            }
          });
        });
      }
    });

    // 3. Sort events chronologically (oldest to newest) so that latest state updates override older ones
    events.sort((a, b) => a.timestamp - b.timestamp);

    // 4. Replay events in order to compute the final, accurate state for every serial number
    events.forEach(event => {
      const sn = event.serialNumber;
      
      // Remove from all maps to ensure it only exists in the map representing its final active state
      approvedMap.delete(sn);
      holdMap.delete(sn);
      rejectedMap.delete(sn);

      if (event.status === 'Approved') {
        if (!dispatchedSerials.has(sn)) {
          approvedMap.set(sn, event.detail);
        }
        totalMap.set(sn, { ...event.detail, status: 'Approved' });
      } else if (event.status === 'Hold') {
        holdMap.set(sn, event.detail);
        totalMap.set(sn, { ...event.detail, status: 'Hold' });
      } else if (event.status === 'Rejected') {
        rejectedMap.set(sn, event.detail);
        totalMap.set(sn, { ...event.detail, status: 'Rejected' });
      }
    });

    const approved = Array.from(approvedMap.values());
    const hold = Array.from(holdMap.values());
    const rejected = Array.from(rejectedMap.values());
    const total = Array.from(totalMap.values());
    const pending = (producedBatteries || []).filter(b => b.status === 'Produced').map(b => ({ serialNumber: b.serialNumber, status: 'Pending', source: 'Packing Terminal', date: b.mfgDate || '', remarks: 'Pending for PDI' }));

    return { approved, hold, rejected, total, pending };
  };

  const getPDISummaryStats = () => {
    const details = getPDISummaryDetails();
    return {
      totalPending: details.pending.length,
      totalInspected: details.total.length,
      totalOk: details.approved.length,
      totalHold: details.hold.length,
      totalRejected: details.rejected.length
    };
  };

  const stats = getPDISummaryStats();

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto animate-fade-in">
      {/* Dynamic @media print stylesheet for pixel-perfect corporate reports */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-pdi-report, #print-pdi-report * {
            visibility: visible !important;
          }
          #print-pdi-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            Quality Assurance & PDI Offering Terminal
          </h2>
          <p className="text-xs text-gray-500">Perform standard Pre-Delivery Inspections individually or manage comprehensive Offered Ranges </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-gray-100 dark:bg-slate-950 p-1 rounded-xl border border-gray-200 dark:border-slate-800 self-start no-print">
          <button
            onClick={() => { setActiveTab('offered-range'); setError(''); setSuccess(''); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'offered-range' ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
          >
            Offer PDI Range
          </button>
          <button
            onClick={() => { setActiveTab('offered-list'); setError(''); setSuccess(''); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'offered-list' ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
          >
            Offered History & PDF Reports
          </button>
          <button
            onClick={() => { setActiveTab('pdi-rework'); setError(''); setSuccess(''); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'pdi-rework' ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm border border-gray-150/10' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
          >
            PDI for Rework Battery
          </button>
        </div>
      </div>

      {/* QA & PDI Scorecard Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print animate-fade-in">
        <div 
          onClick={() => {
            setActiveSummaryDetail(prev => prev === 'Pending' ? null : 'Pending');
            setSummaryDetailSearch('');
          }}
          className={`p-4 bg-white dark:bg-slate-900 border rounded-2xl shadow-xs flex items-center gap-3 cursor-pointer hover:scale-[1.02] hover:shadow-md transition-all select-none ${
            activeSummaryDetail === 'Pending' 
              ? 'border-cyan-500 ring-2 ring-cyan-500/20' 
              : 'border-gray-100 dark:border-slate-800'
          }`}
        >
          <div className="p-2.5 bg-cyan-50 dark:bg-cyan-950/20 text-cyan-600 dark:text-cyan-400 rounded-xl">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Pending for PDI</span>
            <span className="text-lg font-extrabold text-cyan-600 dark:text-cyan-400 leading-none">{stats.totalPending}</span>
          </div>
        </div>

        <div 
          onClick={() => {
            setActiveSummaryDetail(prev => prev === 'Approved' ? null : 'Approved');
            setSummaryDetailSearch('');
          }}
          className={`p-4 bg-white dark:bg-slate-900 border rounded-2xl shadow-xs flex items-center gap-3 cursor-pointer hover:scale-[1.02] hover:shadow-md transition-all select-none ${
            activeSummaryDetail === 'Approved' 
              ? 'border-emerald-500 ring-2 ring-emerald-500/20' 
              : 'border-gray-100 dark:border-slate-800'
          }`}
        >
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Approved (OK)</span>
            <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 leading-none">{stats.totalOk}</span>
          </div>
        </div>

        <div 
          onClick={() => {
            setActiveSummaryDetail(prev => prev === 'Hold' ? null : 'Hold');
            setSummaryDetailSearch('');
          }}
          className={`p-4 bg-white dark:bg-slate-900 border rounded-2xl shadow-xs flex items-center gap-3 cursor-pointer hover:scale-[1.02] hover:shadow-md transition-all select-none ${
            activeSummaryDetail === 'Hold' 
              ? 'border-amber-500 ring-2 ring-amber-500/20' 
              : 'border-gray-100 dark:border-slate-800'
          }`}
        >
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-xl">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">On Hold</span>
            <span className="text-lg font-extrabold text-amber-500 dark:text-amber-400 leading-none">{stats.totalHold}</span>
          </div>
        </div>

        <div 
          onClick={() => {
            setActiveSummaryDetail(prev => prev === 'Rejected' ? null : 'Rejected');
            setSummaryDetailSearch('');
          }}
          className={`p-4 bg-white dark:bg-slate-900 border rounded-2xl shadow-xs flex items-center gap-3 cursor-pointer hover:scale-[1.02] hover:shadow-md transition-all select-none ${
            activeSummaryDetail === 'Rejected' 
              ? 'border-rose-500 ring-2 ring-rose-500/20' 
              : 'border-gray-100 dark:border-slate-800'
          }`}
        >
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Rejected</span>
            <span className="text-lg font-extrabold text-rose-600 dark:text-rose-400 leading-none">{stats.totalRejected}</span>
          </div>
        </div>
      </div>

      {/* Interactive Detail View of Clicked Summary Category */}
      {activeSummaryDetail && (
        <div className="p-5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-xs animate-fade-in no-print space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-50 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${
                activeSummaryDetail === 'Approved' ? 'bg-emerald-500 animate-pulse' :
                activeSummaryDetail === 'Hold' ? 'bg-amber-500 animate-pulse' :
                activeSummaryDetail === 'Rejected' ? 'bg-rose-500 animate-pulse' : 'bg-cyan-500 animate-pulse'
              }`} />
              <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Inspection Details: <span className={
                  activeSummaryDetail === 'Approved' ? 'text-emerald-600 dark:text-emerald-400' :
                  activeSummaryDetail === 'Hold' ? 'text-amber-500 dark:text-amber-400' :
                  activeSummaryDetail === 'Rejected' ? 'text-rose-600 dark:text-rose-400' : 'text-cyan-600 dark:text-cyan-400'
                }>{activeSummaryDetail} Batteries</span>
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-60">
                <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-400">
                  <Search className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  placeholder="Filter serials..."
                  value={summaryDetailSearch}
                  onChange={e => setSummaryDetailSearch(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg py-1 px-2.5 pl-8 text-xs text-gray-900 dark:text-white focus:outline-none"
                />
              </div>
              <button 
                onClick={() => { setActiveSummaryDetail(null); setSummaryDetailSearch(''); }}
                className="px-2.5 py-1 text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-750 rounded-lg transition"
              >
                Close List
              </button>
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {(() => {
              const details = getPDISummaryDetails();
              const fullList = 
                activeSummaryDetail === 'Approved' ? details.approved :
                activeSummaryDetail === 'Hold' ? details.hold :
                activeSummaryDetail === 'Rejected' ? details.rejected : 
                activeSummaryDetail === 'Pending' ? details.pending : details.total;

              const filtered = fullList.filter(item => 
                item.serialNumber.toLowerCase().includes(summaryDetailSearch.toLowerCase()) ||
                (item.remarks && item.remarks.toLowerCase().includes(summaryDetailSearch.toLowerCase())) ||
                item.source.toLowerCase().includes(summaryDetailSearch.toLowerCase())
              );

              if (filtered.length === 0) {
                return (
                  <p className="p-6 text-center text-xs text-gray-400">No serial numbers found matching "{summaryDetailSearch}".</p>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filtered.map((item, idx) => {
                    const snStatus = 'status' in item ? (item as any).status : activeSummaryDetail;
                    return (
                      <div key={`${item.serialNumber}-${idx}`} className="p-3 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-850 rounded-xl space-y-1.5 hover:shadow-xs transition">
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-[11px] font-extrabold text-cyan-600 dark:text-cyan-400 bg-cyan-50/50 dark:bg-cyan-950/20 px-2 py-0.5 rounded">
                            {item.serialNumber}
                          </span>
                          <span className={`px-1.5 py-0.5 text-[9px] rounded font-extrabold uppercase tracking-wide ${
                            snStatus === 'Approved' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-950/30' :
                            snStatus === 'Hold' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-950/30' :
                            snStatus === 'Pending' ? 'bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-950/30' :
                            'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-950/30'
                          }`}>
                            {snStatus}
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                          <span>{item.source}</span>
                          <span>{item.date ? new Date(item.date).toLocaleDateString() : ''}</span>
                        </div>
                        {item.remarks && (
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-900 border border-gray-50 dark:border-slate-850/50 rounded p-1.5 leading-snug line-clamp-2">
                            {item.remarks}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-xs rounded-xl font-medium flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* TAB 1: OFFER PDI RANGE */}
      {activeTab === 'offered-range' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-gray-50 dark:border-slate-800 pb-3">
                <Layers className="w-4 h-4 text-cyan-500" />
                Step 1: Set Range Scope
              </h3>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Offered Inspection Date</label>
                  <input
                    type="date"
                    value={offeredDate}
                    onChange={e => setOfferedDate(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Location / Plant Master</label>
                  <select
                    value={selectedPlant}
                    onChange={e => setSelectedPlant(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-white focus:outline-none"
                  >
                    {plants.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Battery Model Code</label>
                  <select
                    value={selectedModel}
                    onChange={e => setSelectedModel(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-white focus:outline-none animate-fade-in"
                  >
                    {models.map(m => (
                      <option key={m.id} value={m.code}>{m.code} - {m.name} ({m.capacity})</option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 border-t border-gray-50 dark:border-slate-800 space-y-3">
                  <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Boundary Selectors</span>
                  
                  {sortedAvailable.length === 0 ? (
                    <div className="p-3 bg-amber-50/60 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 rounded-xl text-[11px] text-amber-700 dark:text-amber-400">
                      No produced/active batteries found for model <strong className="font-mono">{selectedModel}</strong> at <strong className="font-semibold">{selectedPlant}</strong>.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">Start Serial Boundary</label>
                        <select
                          value={startSerial}
                          onChange={e => setStartSerial(e.target.value)}
                          className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-white font-mono focus:outline-none"
                        >
                          <option value="">— Select Start Serial —</option>
                          {sortedAvailable.map(sn => (
                            <option key={sn.serialNumber} value={sn.serialNumber}>{sn.serialNumber} ({sn.status})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1">End Serial Boundary</label>
                        <select
                          value={endSerial}
                          onChange={e => setEndSerial(e.target.value)}
                          className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-white font-mono focus:outline-none"
                        >
                          <option value="">— Select End Serial —</option>
                          {sortedAvailable.map(sn => (
                            <option key={sn.serialNumber} value={sn.serialNumber}>{sn.serialNumber} ({sn.status})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quality Defect Checkpoints card */}
            {rangeSerials.length > 0 && (
              <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 animate-fade-in">
                <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-gray-50 dark:border-slate-800 pb-3">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Step 3: Quality Checkpoints
                </h3>
                <div className="space-y-3.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 tracking-wider block">Quality Defect Checkpoints (Auto-triggers Hold)</span>
                      {(ocvLowRange || ocvHighRange || gravityLowRange || gravityHighRange || terminalOxidationRange || ventLeakageRange || ventLooseRange) && (
                        <span className="text-[9px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-400 px-1.5 py-0.5 rounded uppercase animate-pulse">
                          Hold Triggered
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ocvLowRange}
                          onChange={e => setOcvLowRange(e.target.checked)}
                          className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                        />
                        <span className={ocvLowRange ? "font-semibold text-rose-600 dark:text-rose-400" : ""}>OCV Low</span>
                      </label>
                      <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ocvHighRange}
                          onChange={e => setOcvHighRange(e.target.checked)}
                          className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                        />
                        <span className={ocvHighRange ? "font-semibold text-rose-600 dark:text-rose-400" : ""}>OCV High</span>
                      </label>
                      <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={gravityLowRange}
                          onChange={e => setGravityLowRange(e.target.checked)}
                          className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                        />
                        <span className={gravityLowRange ? "font-semibold text-rose-600 dark:text-rose-400" : ""}>Specific Gravity Low</span>
                      </label>
                      <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={gravityHighRange}
                          onChange={e => setGravityHighRange(e.target.checked)}
                          className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                        />
                        <span className={gravityHighRange ? "font-semibold text-rose-600 dark:text-rose-400" : ""}>Specific Gravity High</span>
                      </label>
                      <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={terminalOxidationRange}
                          onChange={e => setTerminalOxidationRange(e.target.checked)}
                          className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                        />
                        <span className={terminalOxidationRange ? "font-semibold text-rose-600 dark:text-rose-400" : ""}>Terminal Oxidation</span>
                      </label>
                      <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ventLeakageRange}
                          onChange={e => setVentLeakageRange(e.target.checked)}
                          className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                        />
                        <span className={ventLeakageRange ? "font-semibold text-rose-600 dark:text-rose-400" : ""}>Vent Leakage</span>
                      </label>
                      <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ventLooseRange}
                          onChange={e => setVentLooseRange(e.target.checked)}
                          className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                        />
                        <span className={ventLooseRange ? "font-semibold text-rose-600 dark:text-rose-400" : ""}>Vent Loose</span>
                      </label>
                    </div>

                    {(ocvLowRange || ocvHighRange || gravityLowRange || gravityHighRange || terminalOxidationRange || ventLeakageRange || ventLooseRange) && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-[11px] text-amber-700 dark:text-amber-400 rounded-xl flex items-center gap-2 font-medium">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>Defects selected. All batteries in this range will automatically default to <strong>Hold</strong> status.</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">General Remarks / Work Order ID</label>
                    <textarea
                      value={generalRemarks}
                      onChange={e => setGeneralRemarks(e.target.value)}
                      placeholder="Enter quality department audit logs, work order id, or remarks..."
                      rows={3}
                      className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-white focus:outline-none resize-none"
                    />
                  </div>

                  <button
                    onClick={handleRegisterOfferedRange}
                    className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs shadow transition flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Register PDI Offered Range</span>
                  </button>
                </div>
            )}
          </div>

          {/* Real-time Series Grid for classification */}
          <div className="lg:col-span-2 space-y-6">
            {rangeSerials.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-dashed border-gray-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3.5 flex flex-col items-center justify-center h-[400px]">
                <div className="p-4 bg-cyan-50 dark:bg-cyan-950/20 text-cyan-600 dark:text-cyan-400 rounded-2xl shadow-sm">
                  <ListOrdered className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">Awaiting Scope Definition</h4>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">Select a Start Serial and an End Serial boundary from the scope panel to generate the serial sequence.</p>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-5 animate-fade-in flex flex-col">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b border-gray-50 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <ListOrdered className="w-4.5 h-4.5 text-cyan-500" />
                      Step 2: Classify Serial Numbers ({rangeSerials.length} Batteries)
                    </h3>
                    <p className="text-[11px] text-gray-400">Classify individual serials below. Statuses are mapped back to tracking registers automatically.</p>
                  </div>

                  {/* Summary Scorecard Badge Row */}
                  <div className="flex gap-2 text-[11px] font-bold">
                    <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                      OK: {okQty}
                    </span>
                    <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-lg border border-amber-100 dark:border-amber-900/30">
                      Hold: {holdQty}
                    </span>
                    <span className="px-2.5 py-1 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-lg border border-rose-100 dark:border-rose-900/30">
                      Reject: {rejectedQty}
                    </span>
                  </div>
                </div>

                {/* Grid list of individual serial selectors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-1">
                  {rangeSerials.map((s, idx) => {
                    const currentDecision = serialDecisions[s.serialNumber] || 'Approved';
                    return (
                      <div 
                        key={s.serialNumber} 
                        className={`p-3 border rounded-xl flex flex-col justify-between gap-3.5 transition-all ${
                          currentDecision === 'Approved'
                            ? 'bg-emerald-50/20 dark:bg-emerald-950/5 border-emerald-100 dark:border-emerald-900/20'
                            : currentDecision === 'Hold'
                            ? 'bg-amber-50/20 dark:bg-amber-950/5 border-amber-100 dark:border-amber-900/20'
                            : 'bg-rose-50/20 dark:bg-rose-950/5 border-rose-100 dark:border-rose-900/20'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-gray-400 font-bold">#{idx + 1}</span>
                            <span className="font-mono text-xs font-bold text-gray-900 dark:text-white block">{s.serialNumber}</span>
                          </div>
                          <span className={`px-1.5 py-0.5 text-[9px] rounded font-semibold ${s.status === 'PDI Approved' ? 'bg-emerald-50 text-emerald-600' : s.status === 'PDI Hold' ? 'bg-amber-50 text-amber-600' : s.status === 'PDI Rejected' ? 'bg-rose-50 text-rose-600' : 'bg-gray-100 text-gray-600'}`}>
                            {s.status}
                          </span>
                        </div>

                        {/* Individual Decisions Choice (OK, Hold, Reject) */}
                        <div className="grid grid-cols-3 gap-1 bg-gray-100 dark:bg-slate-950 p-0.5 rounded-lg border border-gray-200 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => handleDecisionChange(s.serialNumber, 'Approved')}
                            className={`py-1 rounded-md text-[10px] font-bold transition-all ${currentDecision === 'Approved' ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'}`}
                          >
                            OK
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDecisionChange(s.serialNumber, 'Hold')}
                            className={`py-1 rounded-md text-[10px] font-bold transition-all ${currentDecision === 'Hold' ? 'bg-amber-500 text-white' : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'}`}
                          >
                            Hold
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDecisionChange(s.serialNumber, 'Rejected')}
                            className={`py-1 rounded-md text-[10px] font-bold transition-all ${currentDecision === 'Rejected' ? 'bg-rose-600 text-white' : 'text-gray-500 hover:text-gray-800 dark:hover:text-white'}`}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3.5 bg-cyan-50/50 dark:bg-cyan-950/10 border border-cyan-150 dark:border-cyan-900/30 rounded-xl flex gap-2 text-[11px] text-cyan-800 dark:text-cyan-400 leading-normal font-medium">
                  <Info className="w-4.5 h-4.5 text-cyan-600 shrink-0" />
                  <span>
                    <strong>Integrity Rule:</strong> Each serial number listed in this range will be updated. Standard PDI records will be generated for auditability and compliance, syncing with plant inventory logs.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: OFFERED LIST & PDF REPORTS */}
      {activeTab === 'offered-list' && (
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-gray-50 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4.5 h-4.5 text-cyan-500" />
                PDI Offered Registers & Certificate Outputs
              </h3>
              <p className="text-xs text-gray-500">Track and generate compliant corporate PDF reports for offered batches.</p>
            </div>

            <div className="relative w-full sm:w-72">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search by Model, Plant, Auditor..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-gray-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredOffered.length === 0 ? (
              <p className="p-8 text-center text-xs text-gray-400">No offered PDI records found matching your search.</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-950 border-b border-gray-100 dark:border-slate-850 text-xs font-bold text-gray-500">
                    <th className="px-4 py-3">Offered Date</th>
                    <th className="px-4 py-3">Model Code</th>
                    <th className="px-4 py-3">Plant Location</th>
                    <th className="px-4 py-3 font-mono">Boundaries</th>
                    <th className="px-4 py-3 text-center">Quantities (OK/H/R)</th>
                    <th className="px-4 py-3">Inspected By</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-850 text-xs text-gray-700 dark:text-gray-300">
                  {filteredOffered.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/10 transition-colors">
                      <td className="px-4 py-3 font-medium">{new Date(item.offeredDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-bold font-mono text-cyan-600 dark:text-cyan-400">{item.modelCode}</td>
                      <td className="px-4 py-3">{item.plantName}</td>
                      <td className="px-4 py-3 font-mono text-gray-500">
                        {item.startSerial} → {item.endSerial}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold">
                        <span className="text-gray-400">{item.totalQty} Offered</span> (
                        <span className="text-emerald-600">{item.okQty}</span>/
                        <span className="text-amber-500">{item.holdQty}</span>/
                        <span className="text-rose-600">{item.rejectedQty}</span>)
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end items-center gap-2">
                          <button
                            onClick={() => setSelectedReport(item)}
                            className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-white rounded-lg font-bold text-[10px] transition inline-flex items-center gap-1"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>PDF Report</span>
                          </button>
                          {perms.edit && (
                            <button
                              onClick={() => startEditOffered(item)}
                              className="p-1.5 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/20 dark:hover:bg-cyan-900/40 text-cyan-600 rounded-lg transition"
                              title="Edit Offered Range"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {false && (
                            <button
                              onClick={() => handleDeleteOffered(item.id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/40 text-rose-600 rounded-lg transition"
                              title="Delete Offered Range"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: INDIVIDUAL PDI INSPECTION TERMINAL (DISABLED) */}
      {false && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleIndividualPDI} className="p-6 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-5">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-cyan-500" />
                Perform QA Parameter Audit (Single Battery)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Scan / Select Serial Number</label>
                  <select
                    value={serialNumber}
                    onChange={e => setSerialNumber(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs text-gray-900 dark:text-white font-mono focus:outline-none"
                  >
                    {producedBatteries.filter(b => b.status === 'Produced' || b.status === 'PDI Hold').length === 0 ? (
                      <option value="">— No produced batteries awaiting PDI —</option>
                    ) : (
                      producedBatteries
                        .filter(b => b.status === 'Produced' || b.status === 'PDI Hold')
                        .map(b => (
                          <option key={b.serialNumber} value={b.serialNumber}>{b.serialNumber} ({b.modelCode}){b.status === 'PDI Hold' ? ' [ON HOLD]' : ''}</option>
                        ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Quality Audit Status</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setStatus('Approved')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${status === 'Approved' ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'bg-gray-50 dark:bg-slate-950 border-gray-200 dark:border-slate-800 text-gray-500'}`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus('Hold')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${status === 'Hold' ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-500 text-amber-600 dark:text-amber-400' : 'bg-gray-50 dark:bg-slate-950 border-gray-200 dark:border-slate-800 text-gray-500'}`}
                    >
                      <HelpCircle className="w-4 h-4" />
                      <span>Hold</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus('Rejected')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${status === 'Rejected' ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-500 text-rose-600 dark:text-rose-400' : 'bg-gray-50 dark:bg-slate-950 border-gray-200 dark:border-slate-800 text-gray-500'}`}
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Parameter checklist */}
              <div className="space-y-4">
                {/* Standard Parameters */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-3 border border-gray-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Standard QA Parameters</span>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 select-none">
                      <input
                        type="checkbox"
                        checked={voltageCheck}
                        onChange={e => setVoltageCheck(e.target.checked)}
                        className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                      />
                      <span>Voltage & OCV Test (Pass)</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 select-none">
                      <input
                        type="checkbox"
                        checked={gravityCheck}
                        onChange={e => setGravityCheck(e.target.checked)}
                        className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                      />
                      <span>Specific Gravity Test (Pass)</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 select-none">
                      <input
                        type="checkbox"
                        checked={leakCheck}
                        onChange={e => setLeakCheck(e.target.checked)}
                        className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                      />
                      <span>Case Welding Leakage Check</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 select-none">
                      <input
                        type="checkbox"
                        checked={terminalCheck}
                        onChange={e => setTerminalCheck(e.target.checked)}
                        className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                      />
                      <span>Terminal Alignment Audit</span>
                    </label>
                  </div>
                </div>

                {/* Defect Checkpoints */}
                <div className="p-4 bg-rose-50/20 dark:bg-rose-950/10 rounded-xl space-y-3 border border-rose-100 dark:border-rose-900/20">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 tracking-wider block">Quality Defect Checkpoints (Auto-triggers Hold)</span>
                    {(ocvLow || ocvHigh || gravityLow || gravityHigh || terminalOxidation || ventLeakage || ventLoose) && (
                      <span className="text-[9px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-400 px-1.5 py-0.5 rounded uppercase animate-pulse">
                        Hold Triggered
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ocvLow}
                        onChange={e => setOcvLow(e.target.checked)}
                        className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span className={ocvLow ? "font-semibold text-rose-600 dark:text-rose-400" : ""}>OCV Low</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ocvHigh}
                        onChange={e => setOcvHigh(e.target.checked)}
                        className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span className={ocvHigh ? "font-semibold text-rose-600 dark:text-rose-400" : ""}>OCV High</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={gravityLow}
                        onChange={e => setGravityLow(e.target.checked)}
                        className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span className={gravityLow ? "font-semibold text-rose-600 dark:text-rose-400" : ""}>Specific Gravity Low</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={gravityHigh}
                        onChange={e => setGravityHigh(e.target.checked)}
                        className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span className={gravityHigh ? "font-semibold text-rose-600 dark:text-rose-400" : ""}>Specific Gravity High</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={terminalOxidation}
                        onChange={e => setTerminalOxidation(e.target.checked)}
                        className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span className={terminalOxidation ? "font-semibold text-rose-600 dark:text-rose-400" : ""}>Terminal Oxidation</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ventLeakage}
                        onChange={e => setVentLeakage(e.target.checked)}
                        className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span className={ventLeakage ? "font-semibold text-rose-600 dark:text-rose-400" : ""}>Vent Leakage</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ventLoose}
                        onChange={e => setVentLoose(e.target.checked)}
                        className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span className={ventLoose ? "font-semibold text-rose-600 dark:text-rose-400" : ""}>Vent Loose</span>
                    </label>
                  </div>

                  {(ocvLow || ocvHigh || gravityLow || gravityHigh || terminalOxidation || ventLeakage || ventLoose) && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-[11px] text-amber-700 dark:text-amber-400 rounded-xl flex items-center gap-2 font-medium">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>One or more defects selected. Option of <strong>Hold</strong> has been activated and selected automatically.</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Inspected Remarks / Diagnosis (Optional)</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  placeholder="Leave blank to auto-compile parameters list"
                  className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={!serialNumber}
                  className="w-full sm:w-auto px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs shadow transition disabled:opacity-40"
                >
                  Log QA Checklist
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm p-5 flex flex-col h-[500px]">
            <div className="flex justify-between items-center pb-3 border-b border-gray-50 dark:border-slate-800 mb-4">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Recent QA Decisions
              </h4>
              <div className="flex gap-1 text-[9px] font-extrabold">
                <span className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded border border-emerald-100 dark:border-emerald-900/20">
                  OK: {pdiList.filter(p => p.status === 'Approved').length}
                </span>
                <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded border border-amber-100 dark:border-amber-900/20">
                  Hold: {pdiList.filter(p => p.status === 'Hold').length}
                </span>
                <span className="px-1.5 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded border border-rose-100 dark:border-rose-900/20">
                  Reject: {pdiList.filter(p => p.status === 'Rejected').length}
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3">
              {pdiList.length === 0 ? (
                <p className="p-4 text-center text-xs text-gray-400">No QA inspections logged this session.</p>
              ) : (
                pdiList.map(entry => (
                  <div key={entry.id} className="p-3 bg-gray-50 dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-xl space-y-2">
                    <div className="flex justify-between items-start text-xs">
                      <div>
                        <span className="font-bold font-mono text-gray-950 dark:text-white">{entry.serialNumber}</span>
                        <p className="text-[10px] text-gray-400">By: {entry.inspectedBy}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase flex items-center gap-1 ${
                        entry.status === 'Approved'
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
                          : entry.status === 'Hold'
                          ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400'
                          : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400'
                      }`}>
                        {entry.status === 'Approved' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : entry.status === 'Hold' ? (
                          <HelpCircle className="w-3 h-3" />
                        ) : (
                          <ShieldAlert className="w-3 h-3" />
                        )}
                        {entry.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">{entry.remarks}</p>
                    {(perms.edit || false) && (
                      <div className="flex justify-end gap-1.5 pt-1.5 border-t border-gray-100 dark:border-slate-800/40">
                        {perms.edit && (
                          <button
                            onClick={() => startEditIndividual(entry)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 text-cyan-600 rounded"
                            title="Edit"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                        {false && (
                          <button
                            onClick={() => handleDeleteIndividual(entry.id)}
                            className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PDI FOR REWORK BATTERY */}
      {activeTab === 'pdi-rework' && (
        <div className="space-y-6">
          {/* Rework Sub-tabs switcher */}
          <div className="flex bg-gray-50 dark:bg-slate-950 p-1 rounded-xl border border-gray-200 dark:border-slate-800 self-start no-print max-w-md">
            {currentUser?.role === 'Super Admin' && (
              <button
                onClick={() => { setReworkSubTab('individual'); setError(''); setSuccess(''); }}
                className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all ${reworkSubTab === 'individual' ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm border border-gray-100 dark:border-slate-800' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
              >
                Individual Rework Terminal
              </button>
            )}
            <button
              onClick={() => { setReworkSubTab('range'); setError(''); setSuccess(''); }}
              className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all ${reworkSubTab === 'range' ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm border border-gray-100 dark:border-slate-800' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
            >
              Range of Hold Batteries
            </button>
          </div>

          {reworkSubTab === 'individual' && currentUser?.role === 'Super Admin' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <form onSubmit={handleReworkIndividualPDI} className="p-6 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm space-y-5">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-cyan-500" />
                    Perform QA Parameter Audit (Reworked Single Battery)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">Select Hold / Rejected Serial Number</label>
                      <select
                        value={reworkSerial}
                        onChange={e => setReworkSerial(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs text-gray-900 dark:text-white font-mono focus:outline-none"
                      >
                        {producedBatteries.filter(b => b.status === 'PDI Hold' || b.status === 'PDI Rejected').length === 0 ? (
                          <option value="">— No Hold/Rejected batteries awaiting Rework PDI —</option>
                        ) : (
                          producedBatteries
                            .filter(b => b.status === 'PDI Hold' || b.status === 'PDI Rejected')
                            .map(b => (
                              <option key={b.serialNumber} value={b.serialNumber}>
                                {b.serialNumber} ({b.modelCode}) — {b.status === 'PDI Hold' ? 'ON HOLD' : 'REJECTED'}
                              </option>
                            ))
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">Quality Audit Status</label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setReworkStatus('Approved')}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${reworkStatus === 'Approved' ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'bg-gray-50 dark:bg-slate-950 border-gray-200 dark:border-slate-800 text-gray-500'}`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approve</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setReworkStatus('Hold')}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${reworkStatus === 'Hold' ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-500 text-amber-600 dark:text-amber-400' : 'bg-gray-50 dark:bg-slate-950 border-gray-200 dark:border-slate-800 text-gray-500'}`}
                        >
                          <HelpCircle className="w-4 h-4" />
                          <span>Hold</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setReworkStatus('Rejected')}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${reworkStatus === 'Rejected' ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-500 text-rose-600 dark:text-rose-400' : 'bg-gray-50 dark:bg-slate-950 border-gray-200 dark:border-slate-800 text-gray-500'}`}
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Standard parameters audit checks */}
                  <div className="p-4 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl space-y-3">
                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Standard Parameters Checklist</span>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={reworkVoltageCheck}
                          onChange={e => setReworkVoltageCheck(e.target.checked)}
                          className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        <span>Voltage & OCV Test</span>
                      </label>
                      <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={reworkGravityCheck}
                          onChange={e => setReworkGravityCheck(e.target.checked)}
                          className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        <span>Specific Gravity Test</span>
                      </label>
                      <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={reworkLeakCheck}
                          onChange={e => setReworkLeakCheck(e.target.checked)}
                          className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        <span>Case Welding Leakage Check</span>
                      </label>
                      <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={reworkTerminalCheck}
                          onChange={e => setReworkTerminalCheck(e.target.checked)}
                          className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        <span>Terminal Alignment Audit</span>
                      </label>
                    </div>
                  </div>

                  {/* Quality Defect Checkpoints (Auto-triggers Hold) */}
                  <div className="p-4 bg-rose-50/20 dark:bg-rose-950/10 rounded-xl space-y-3 border border-rose-100 dark:border-rose-900/20">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 tracking-wider block">Quality Defect Checkpoints (Auto-triggers Hold)</span>
                      {(reworkOcvLow || reworkOcvHigh || reworkGravityLow || reworkGravityHigh || reworkTerminalOxidation || reworkVentLeakage || reworkVentLoose) && (
                        <span className="text-[9px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-400 px-1.5 py-0.5 rounded uppercase animate-pulse">
                          Hold Triggered
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={reworkOcvLow}
                          onChange={e => setReworkOcvLow(e.target.checked)}
                          className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                        />
                        <span className={reworkOcvLow ? "font-semibold text-rose-600 dark:text-rose-400" : ""}>OCV Low</span>
                      </label>
                      <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={reworkOcvHigh}
                          onChange={e => setReworkOcvHigh(e.target.checked)}
                          className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                        />
                        <span className={reworkOcvHigh ? "font-semibold text-rose-600 dark:text-rose-400" : ""}>OCV High</span>
                      </label>
                      <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={reworkGravityLow}
                          onChange={e => setReworkGravityLow(e.target.checked)}
                          className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                        />
                        <span className={reworkGravityLow ? "font-semibold text-rose-600 dark:text-rose-400" : ""}>Gravity Low</span>
                      </label>
                      <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={reworkGravityHigh}
                          onChange={e => setReworkGravityHigh(e.target.checked)}
                          className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                        />
                        <span className={reworkGravityHigh ? "font-semibold text-rose-600 dark:text-rose-400" : ""}>Gravity High</span>
                      </label>
                      <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={reworkTerminalOxidation}
                          onChange={e => setReworkTerminalOxidation(e.target.checked)}
                          className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                        />
                        <span className={reworkTerminalOxidation ? "font-semibold text-rose-600 dark:text-rose-400" : ""}>Terminal Oxidation</span>
                      </label>
                      <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={reworkVentLeakage}
                          onChange={e => setReworkVentLeakage(e.target.checked)}
                          className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                        />
                        <span className={reworkVentLeakage ? "font-semibold text-rose-600 dark:text-rose-400" : ""}>Vent Leakage</span>
                      </label>
                      <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={reworkVentLoose}
                          onChange={e => setReworkVentLoose(e.target.checked)}
                          className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                        />
                        <span className={reworkVentLoose ? "font-semibold text-rose-600 dark:text-rose-400" : ""}>Vent Loose</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Inspected Remarks / Diagnostics Remarks</label>
                    <textarea
                      value={reworkRemarks}
                      onChange={e => setReworkRemarks(e.target.value)}
                      placeholder="e.g. Cleared after terminal cleaning, OCV restabilized after charging..."
                      className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs text-gray-900 dark:text-white focus:outline-none min-h-[80px]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!reworkSerial}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition duration-200 shadow-sm"
                  >
                    Log Rework Clearance PDI
                  </button>
                </form>
              </div>

              {/* Rework Side Panel */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-gray-50 dark:border-slate-800 pb-3">
                    <Layers className="w-4 h-4 text-cyan-500" />
                    Pending Rework Backlog
                  </h3>
                  <p className="text-[11px] text-gray-400">List of batteries currently on Quality Hold or Rejected waiting for rework PDI audit.</p>
                  
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                    {producedBatteries.filter(b => b.status === 'PDI Hold' || b.status === 'PDI Rejected').length === 0 ? (
                      <div className="p-4 bg-emerald-50/50 text-emerald-600 dark:bg-emerald-950/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/20 text-xs rounded-xl font-medium text-center">
                        All batteries cleared! No pending rework.
                      </div>
                    ) : (
                      producedBatteries
                        .filter(b => b.status === 'PDI Hold' || b.status === 'PDI Rejected')
                        .map(b => (
                          <div 
                            key={b.serialNumber}
                            onClick={() => setReworkSerial(b.serialNumber)}
                            className={`p-3 bg-gray-50 dark:bg-slate-950 border rounded-xl flex justify-between items-center cursor-pointer transition-all hover:border-cyan-300 ${reworkSerial === b.serialNumber ? 'border-cyan-500 ring-2 ring-cyan-500/15' : 'border-gray-100 dark:border-slate-800'}`}
                          >
                            <div className="space-y-1">
                              <span className="font-mono text-xs font-bold text-gray-900 dark:text-white">{b.serialNumber}</span>
                              <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                <span>{b.modelCode}</span>
                                <span>•</span>
                                <span>{b.currentPlant}</span>
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 text-[9px] rounded font-bold ${b.status === 'PDI Hold' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400'}`}>
                              {b.status === 'PDI Hold' ? 'HOLD' : 'REJECTED'}
                            </span>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // RANGE REWORK TERMINAL
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Controls Panel */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-gray-50 dark:border-slate-800 pb-3">
                    <Layers className="w-4 h-4 text-cyan-500" />
                    Step 1: Set Range Scope
                  </h3>

                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Location / Plant Master</label>
                      <select
                        value={reworkSelectedPlant}
                        onChange={e => setReworkSelectedPlant(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-white focus:outline-none"
                      >
                        {plants.map(p => (
                          <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Battery Model Code</label>
                      <select
                        value={reworkSelectedModel}
                        onChange={e => setReworkSelectedModel(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-white focus:outline-none"
                      >
                        {models.map(m => (
                          <option key={m.id} value={m.code}>{m.code} - {m.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="pt-2 border-t border-gray-50 dark:border-slate-800 space-y-3">
                      <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">Hold Range Selectors</span>
                      
                      {reworkSortedAvailable.length === 0 ? (
                        <div className="p-3 bg-amber-50/60 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 rounded-xl text-[11px] text-amber-700 dark:text-amber-400">
                          No hold batteries found for model <strong className="font-mono">{reworkSelectedModel}</strong> at <strong className="font-semibold">{reworkSelectedPlant}</strong>.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Start Serial Boundary</label>
                            <select
                              value={reworkStartSerial}
                              onChange={e => setReworkStartSerial(e.target.value)}
                              className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-white font-mono focus:outline-none"
                            >
                              <option value="">— Select Start Serial —</option>
                              {reworkSortedAvailable.map(sn => (
                                <option key={sn.serialNumber} value={sn.serialNumber}>{sn.serialNumber} (HOLD)</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1">End Serial Boundary</label>
                            <select
                              value={reworkEndSerial}
                              onChange={e => setReworkEndSerial(e.target.value)}
                              className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-white font-mono focus:outline-none"
                            >
                              <option value="">— Select End Serial —</option>
                              {reworkSortedAvailable.map(sn => (
                                <option key={sn.serialNumber} value={sn.serialNumber}>{sn.serialNumber} (HOLD)</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quality Defect Checkpoints card */}
                {reworkRangeSerials.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 animate-fade-in">
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-gray-50 dark:border-slate-800 pb-3">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      Step 2: Quality Checkpoints
                    </h3>
                    <div className="space-y-3.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 tracking-wider block">Quality Defect Checkpoints</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                            <input
                              type="checkbox"
                              checked={reworkOcvLowRange}
                              onChange={e => setReworkOcvLowRange(e.target.checked)}
                              className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                            />
                            <span className={reworkOcvLowRange ? "font-semibold text-rose-600 dark:text-rose-400" : ""}>OCV Low</span>
                          </label>
                          <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                            <input
                              type="checkbox"
                              checked={reworkOcvHighRange}
                              onChange={e => setReworkOcvHighRange(e.target.checked)}
                              className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                            />
                            <span className={reworkOcvHighRange ? "font-semibold text-rose-600 dark:text-rose-400" : ""}>OCV High</span>
                          </label>
                          <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                            <input
                              type="checkbox"
                              checked={reworkGravityLowRange}
                              onChange={e => setReworkGravityLowRange(e.target.checked)}
                              className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                            />
                            <span className={reworkGravityLowRange ? "font-semibold text-rose-600 dark:text-rose-400" : ""}>Gravity Low</span>
                          </label>
                          <label className="flex items-center space-x-2 text-xs text-gray-700 dark:text-gray-300 select-none cursor-pointer">
                            <input
                              type="checkbox"
                              checked={reworkGravityHighRange}
                              onChange={e => setReworkGravityHighRange(e.target.checked)}
                              className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                            />
                            <span className={reworkGravityHighRange ? "font-semibold text-rose-600 dark:text-rose-400" : ""}>Gravity High</span>
                          </label>
                        </div>
                      </div>
                  </div>
                )}
              </div>

              {/* Rework Range Table/Classification Panel */}
              <div className="lg:col-span-2 space-y-6">
                {reworkRangeSerials.length === 0 ? (
                  <div className="p-8 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm text-center space-y-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 text-gray-400 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
                      <HelpCircle className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">Boundary Not Defined</h4>
                      <p className="text-xs text-gray-500 max-w-sm mx-auto">Please select the Start and End Serial numbers on the left sidebar to generate the rework PDI checklist.</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleRegisterReworkRange} className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-gray-50 dark:border-slate-800 pb-4 gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Step 3: Clear Hold Range</h4>
                        <p className="text-[11px] text-gray-400">Classify individual battery statuses in the loaded boundary range.</p>
                      </div>

                      {/* Range Stats Panel */}
                      <div className="flex gap-2">
                        <span className="bg-cyan-50 text-cyan-700 dark:bg-cyan-950/20 dark:text-cyan-400 font-mono text-[10px] font-bold px-2 py-1 rounded-lg">
                          Total: {reworkTotalQty}
                        </span>
                        <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 font-mono text-[10px] font-bold px-2 py-1 rounded-lg">
                          Clear: {reworkOkQty}
                        </span>
                        <span className="bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 font-mono text-[10px] font-bold px-2 py-1 rounded-lg">
                          Hold: {reworkHoldQty}
                        </span>
                        <span className="bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 font-mono text-[10px] font-bold px-2 py-1 rounded-lg">
                          Reject: {reworkRejectedQty}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-1">
                      {reworkRangeSerials.map((sn, idx) => (
                        <div key={sn.serialNumber} className="p-3 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-150 dark:border-slate-800 flex justify-between items-center text-xs">
                          <div className="space-y-0.5">
                            <span className="font-mono font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                              <span className="text-[10px] text-gray-400 font-normal">#{idx + 1}</span>
                              {sn.serialNumber}
                            </span>
                            <span className="text-[10px] text-gray-400 block">Current: {sn.status}</span>
                          </div>

                          <div className="flex bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-gray-100 dark:border-slate-800">
                            {(['Approved', 'Hold', 'Rejected'] as const).map((decision) => (
                              <button
                                key={decision}
                                type="button"
                                onClick={() => handleReworkDecisionChange(sn.serialNumber, decision)}
                                className={`px-2 py-1 rounded-md text-[9px] font-bold transition-all ${reworkSerialDecisions[sn.serialNumber] === decision ? (decision === 'Approved' ? 'bg-emerald-500 text-white shadow-xs' : decision === 'Hold' ? 'bg-amber-500 text-white shadow-xs' : 'bg-rose-500 text-white shadow-xs') : 'text-gray-400 hover:text-gray-600'}`}
                              >
                                {decision === 'Approved' ? 'CLEAR' : decision === 'Hold' ? 'HOLD' : 'REJECT'}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4 pt-4 border-t border-gray-50 dark:border-slate-800">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">General Inspection remarks / Rework logs</label>
                        <input
                          type="text"
                          value={reworkGeneralRemarks}
                          onChange={e => setReworkGeneralRemarks(e.target.value)}
                          placeholder="e.g., cleared range after complete terminal alignment audit and OCV test stabilization"
                          className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-white focus:outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition duration-200 shadow-sm"
                      >
                        Register Rework Range PDI Clearance
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PRINT VIEW PREVIEW / MODAL */}
      {selectedReport && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto no-print animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xl max-w-4xl w-full flex flex-col max-h-[90vh]">
            {/* Modal Controls Bar */}
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-950 rounded-t-2xl">
              <span className="text-xs font-bold text-gray-900 dark:text-white">PDI Certificate Generation Output</span>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="px-3.5 py-1.5 bg-gray-250 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-white rounded-xl text-xs font-bold transition"
                >
                  Close Preview
                </button>
              </div>
            </div>

            {/* Document sheet container */}
            <div className="flex-1 overflow-y-auto p-8 bg-gray-100 dark:bg-slate-950">
              {/* Document sheet styled for printing */}
              <div 
                id="print-pdi-report" 
                className="mx-auto max-w-[210mm] min-h-[297mm] p-10 bg-white border border-gray-200 dark:border-none rounded-xl text-black space-y-8 shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-8">
                  {/* Corporate Header with Logo & Pilot Industries Ltd */}
                  <div className="flex justify-between items-center border-b-2 border-red-600 pb-5">
                    <div className="flex items-center gap-4 text-left">
                      {/* LEADER LOGO */}
                      <div className="w-32 h-auto flex-shrink-0">
                        <svg className="w-full h-auto" viewBox="0 0 320 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <linearGradient id="silver-grad-pdi" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#CBD5E1" />
                              <stop offset="30%" stopColor="#F1F5F9" />
                              <stop offset="50%" stopColor="#94A3B8" />
                              <stop offset="70%" stopColor="#E2E8F0" />
                              <stop offset="100%" stopColor="#475569" />
                            </linearGradient>
                          </defs>
                          {/* L */}
                          <path d="M10 15 H22 V50 H45 V62 H10 V15 Z" fill="#E11D48" />
                          {/* E */}
                          <path d="M52 15 H87 V27 H64 V33 H84 V44 H64 V50 H88 V62 H52 V15 Z" fill="#E11D48" />
                          {/* Stylized Triangular A (Silver metallic with red highlights) */}
                          <path d="M120 15 L95 62 H110 L113 51 H127 L130 62 H145 L120 15 Z" fill="url(#silver-grad-pdi)" />
                          <path d="M120 22 L116 38 H124 L120 22 Z" fill="#FFFFFF" />
                          <path d="M120 22 L118 28 H122 L120 22 Z" fill="#E11D48" />
                          <path d="M114 34 H126 L120 46 L114 34 Z" fill="#E11D48" />
                          {/* D */}
                          <path d="M152 15 H177 C192 15 202 24 202 38.5 C202 53 192 62 177 62 H152 V15 Z M164 27 V50 H176 C184 50 189 45 189 38.5 C189 32 184 27 176 27 H164 Z" fill="#E11D48" />
                          {/* E */}
                          <path d="M209 15 H244 V27 H221 V33 H241 V44 H221 V50 H245 V62 H209 V15 Z" fill="#E11D48" />
                          {/* R */}
                          <path d="M252 15 H278 C290 15 298 22 298 34 C298 43 292 48 283 50 L300 62 H286 L271 51 H264 V62 H252 V15 Z M264 27 V41 H276 C282 41 286 38 286 34 C286 30 282 27 276 27 H264 Z" fill="#E11D48" />
                          {/* TM */}
                          <text x="302" y="24" fill="#E11D48" fontFamily="sans-serif" fontWeight="900" fontSize="10">TM</text>
                          {/* ENERGY TO PERFORM Tagline */}
                          <text x="10" y="76" fill="#E11D48" fontFamily="sans-serif" fontWeight="800" fontStyle="italic" fontSize="11" letterSpacing="3.5">ENERGY TO PERFORM</text>
                        </svg>
                      </div>
                      <div className="border-l border-gray-250 pl-4 space-y-0.5">
                        <span className="text-[9px] font-extrabold tracking-widest text-red-600 uppercase block">QUALITY ASSURANCE WING</span>
                        <h1 className="text-lg font-black text-gray-900 leading-none">PILOT INDUSTRIES LTD</h1>
                        <p className="text-[9px] text-gray-500 font-medium">ISO 9001:2015 & ISO 14001 Certified Enterprise Systems</p>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <span className="px-2 py-0.5 bg-red-50 text-red-700 font-mono text-[9px] font-bold rounded border border-red-100">PDI REPORT RECORD</span>
                      <p className="text-[10px] text-gray-400 font-mono pt-1">ID: {selectedReport.id}</p>
                    </div>
                  </div>

                  {/* Document Title */}
                  <div className="text-center space-y-1">
                    <h2 className="text-base font-extrabold tracking-wide uppercase text-gray-900">PRE-DELIVERY INSPECTION (PDI) OFFERED CERTIFICATE</h2>
                    <p className="text-[10px] text-gray-500 font-medium">Compliance verification records under Quality Control Standards (QCS-Lead-Acid)</p>
                  </div>

                  {/* Metainfo block */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs border-y border-dashed border-gray-200 py-4 font-medium text-gray-700">
                    <div className="flex justify-between border-b border-gray-100 pb-1">
                      <span className="text-gray-400">Offered & Audit Date:</span>
                      <span className="font-bold text-gray-900 font-mono">{new Date(selectedReport.offeredDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 pb-1">
                      <span className="text-gray-400">Inspection Location:</span>
                      <span className="font-bold text-gray-900">{selectedReport.plantName}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 pb-1">
                      <span className="text-gray-400">Battery Model Code:</span>
                      <span className="font-bold text-gray-900 font-mono text-cyan-700">{selectedReport.modelCode}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 pb-1">
                      <span className="text-gray-400">Quality Lead Auditor:</span>
                      <span className="font-bold text-gray-900">{selectedReport.offeredBy}</span>
                    </div>
                  </div>

                  {/* Quantities Scorecard */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase block">Inspection Quantum Breakdown</span>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="p-3 bg-gray-50 border border-gray-150 rounded-xl text-center space-y-1">
                        <span className="text-[9px] text-gray-400 font-bold block uppercase">Total Offered</span>
                        <span className="text-lg font-black text-gray-900 font-mono">{selectedReport.totalQty}</span>
                      </div>
                      <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl text-center space-y-1">
                        <span className="text-[9px] text-emerald-600 font-bold block uppercase">Approved (OK)</span>
                        <span className="text-lg font-black text-emerald-700 font-mono">{selectedReport.okQty}</span>
                      </div>
                      <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-center space-y-1">
                        <span className="text-[9px] text-amber-600 font-bold block uppercase">On Hold</span>
                        <span className="text-lg font-black text-amber-700 font-mono">{selectedReport.holdQty}</span>
                      </div>
                      <div className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl text-center space-y-1">
                        <span className="text-[9px] text-rose-600 font-bold block uppercase">Rejected</span>
                        <span className="text-lg font-black text-rose-700 font-mono">{selectedReport.rejectedQty}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quality Checkpoints */}
                  <div className="p-4 bg-gray-50 border border-gray-150 rounded-xl space-y-3.5 text-xs">
                    <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase block">QUALITY DEFECT CHECKPOINTS STATUS</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
                      {[
                        { label: "OCV Low", isDefect: !!selectedReport.ocvLowRange || (selectedReport.generalRemarks?.toLowerCase().includes("ocv low") ?? false) },
                        { label: "OCV High", isDefect: !!selectedReport.ocvHighRange || (selectedReport.generalRemarks?.toLowerCase().includes("ocv high") ?? false) },
                        { label: "Specific Gravity Low", isDefect: !!selectedReport.gravityLowRange || (selectedReport.generalRemarks?.toLowerCase().includes("specific gravity low") ?? false) },
                        { label: "Specific Gravity High", isDefect: !!selectedReport.gravityHighRange || (selectedReport.generalRemarks?.toLowerCase().includes("specific gravity high") ?? false) },
                        { label: "Terminal Oxidation", isDefect: !!selectedReport.terminalOxidationRange || (selectedReport.generalRemarks?.toLowerCase().includes("terminal oxidation") ?? false) },
                        { label: "Vent Leakage", isDefect: !!selectedReport.ventLeakageRange || (selectedReport.generalRemarks?.toLowerCase().includes("vent leakage") ?? false) },
                        { label: "Vent Loose", isDefect: !!selectedReport.ventLooseRange || (selectedReport.generalRemarks?.toLowerCase().includes("vent loose") ?? false) },
                      ].map((cp, idx) => (
                        <div key={idx} className="flex items-center justify-between border-b border-gray-200 pb-1">
                          <span className="text-gray-700 font-medium">{cp.label}:</span>
                          {cp.isDefect ? (
                            <span className="text-[9px] font-extrabold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200 uppercase shrink-0 flex items-center gap-1">
                              ⚠️ HOLD
                            </span>
                          ) : (
                            <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 uppercase shrink-0 flex items-center gap-0.5">
                              ✓ OK
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Serial Categories Listing */}
                  <div className="space-y-4">
                    <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase block">Individual Serial Numbers Classifications</span>
                    
                    <div className="space-y-3.5 text-xs">
                      {selectedReport.okSerials.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-emerald-700 uppercase flex items-center gap-1">
                            ● Approved OK Range ({selectedReport.okQty})
                          </span>
                          <div className="p-3 bg-emerald-50/20 border border-emerald-100 rounded-lg text-gray-800 font-mono leading-relaxed text-[11px] break-all">
                            {selectedReport.okSerials.join(', ')}
                          </div>
                        </div>
                      )}

                      {selectedReport.holdSerials.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-amber-700 uppercase flex items-center gap-1">
                            ● QA Hold Batteries ({selectedReport.holdQty})
                          </span>
                          <div className="p-3 bg-amber-50/20 border border-amber-100 rounded-lg text-gray-800 font-mono leading-relaxed text-[11px] break-all">
                            {selectedReport.holdSerials.join(', ')}
                          </div>
                        </div>
                      )}

                      {selectedReport.rejectedSerials.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-rose-700 uppercase flex items-center gap-1">
                            ● Rejected / Defective Batteries ({selectedReport.rejectedQty})
                          </span>
                          <div className="p-3 bg-rose-50/20 border border-rose-100 rounded-lg text-gray-800 font-mono leading-relaxed text-[11px] break-all">
                            {selectedReport.rejectedSerials.join(', ')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* General Remarks / Work Order ID */}
                  <div className="p-4 bg-gray-50 border border-gray-150 rounded-xl space-y-2 text-xs">
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">GENERAL REMARKS / WORK ORDER ID</span>
                    <p className="text-gray-800 font-medium whitespace-pre-wrap leading-relaxed">
                      {selectedReport.generalRemarks || "No custom remarks or Work Order ID recorded."}
                    </p>
                  </div>
                </div>

                {/* Professional Signature Block */}
                <div className="border-t border-gray-200 pt-10 grid grid-cols-3 gap-6 text-center text-[10px] text-gray-600 font-medium">
                  <div className="space-y-8">
                    <p className="border-b border-gray-300 pb-2 mx-4"></p>
                    <p className="font-bold text-gray-800">Quality Control Executive / Inspector</p>
                    <p className="text-[8px] text-gray-400 font-mono">Date Signed: __________________</p>
                  </div>
                  <div className="space-y-8">
                    <p className="border-b border-gray-300 pb-2 mx-4"></p>
                    <p className="font-bold text-gray-800">QA Lead / Auditor</p>
                    <p className="text-[8px] text-gray-400 font-mono">Date Signed: __________________</p>
                  </div>
                  <div className="space-y-8">
                    <p className="border-b border-gray-300 pb-2 mx-4"></p>
                    <p className="font-bold text-gray-800">Plant Supervisor / Superintendent</p>
                    <p className="text-[8px] text-gray-400 font-mono">Date Signed: __________________</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Individual PDI Modal */}
      {editingIndividual && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative animate-scale-up space-y-4 text-left">
            <button
              onClick={() => setEditingIndividual(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
            
            <h3 className="text-sm font-bold text-gray-950 dark:text-white uppercase tracking-wider">Edit QA Inspection</h3>
            
            <form onSubmit={handleUpdateIndividual} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Serial Number</label>
                <input
                  type="text"
                  required
                  value={editSerialNumber}
                  onChange={e => setEditSerialNumber(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-gray-955 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Inspection Date</label>
                <input
                  type="date"
                  required
                  value={editInspectionDate}
                  onChange={e => setEditInspectionDate(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-955 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Audit Status</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value as any)}
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-955 dark:text-white focus:outline-none"
                >
                  <option value="Approved">Approved</option>
                  <option value="Hold">Hold</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Inspected Remarks</label>
                <textarea
                  value={editRemarks}
                  onChange={e => setEditRemarks(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-955 dark:text-white focus:outline-none min-h-[60px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingIndividual(null)}
                  className="px-3 py-1.5 border border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-400 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Offered PDI Range Modal */}
      {editingOffered && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative animate-scale-up space-y-4 text-left max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingOffered(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
            
            <h3 className="text-sm font-bold text-gray-950 dark:text-white uppercase tracking-wider">Edit Offered PDI Range</h3>
            
            <form onSubmit={handleUpdateOffered} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Offered Date</label>
                  <input
                    type="date"
                    required
                    value={editOfferedDate}
                    onChange={e => setEditOfferedDate(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-955 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Plant Location</label>
                  <select
                    required
                    value={editOfferedPlantName}
                    onChange={e => setEditOfferedPlantName(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-955 dark:text-white focus:outline-none"
                  >
                    {plants.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Battery Model</label>
                  <select
                    required
                    value={editOfferedModelCode}
                    onChange={e => setEditOfferedModelCode(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-955 dark:text-white focus:outline-none"
                  >
                    {models.map(m => (
                      <option key={m.id} value={m.code}>{m.code} - {m.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Start Serial Number</label>
                  <input
                    type="text"
                    required
                    value={editOfferedStartSerial}
                    onChange={e => setEditOfferedStartSerial(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-gray-955 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">End Serial Number</label>
                  <input
                    type="text"
                    required
                    value={editOfferedEndSerial}
                    onChange={e => setEditOfferedEndSerial(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-gray-955 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">General Remarks</label>
                  <textarea
                    value={editOfferedGeneralRemarks}
                    onChange={e => setEditOfferedGeneralRemarks(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-gray-955 dark:text-white focus:outline-none"
                    placeholder="General observations..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingOffered(null)}
                  className="px-3 py-1.5 border border-gray-200 dark:border-slate-800 text-gray-600 dark:text-gray-400 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
