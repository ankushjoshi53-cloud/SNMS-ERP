const fs = require('fs');

const pdiFile = './src/components/PDIModule.tsx';
let pdiContent = fs.readFileSync(pdiFile, 'utf8');

pdiContent = pdiContent.replace(
  "const total = Array.from(totalMap.values());",
  "const total = Array.from(totalMap.values());\n    const pending = (producedBatteries || []).filter(b => b.status === 'Produced').map(b => ({ serialNumber: b.serialNumber, status: 'Pending', source: 'Packing Terminal', date: b.mfgDate || '', remarks: 'Pending for PDI' }));"
);

pdiContent = pdiContent.replace(
  "return { approved, hold, rejected, total };",
  "return { approved, hold, rejected, total, pending };"
);

pdiContent = pdiContent.replace(
  "totalInspected: details.total.length,",
  "totalInspected: details.total.length,\n      totalPending: details.pending.length,"
);

pdiContent = pdiContent.replace(
  "const [activeSummaryDetail, setActiveSummaryDetail] = useState<'Approved' | 'Hold' | 'Rejected' | 'Total' | null>(null);",
  "const [activeSummaryDetail, setActiveSummaryDetail] = useState<'Approved' | 'Hold' | 'Rejected' | 'Total' | 'Pending' | null>(null);"
);

pdiContent = pdiContent.replace(
  /activeSummaryDetail === 'Total'/g,
  "activeSummaryDetail === 'Pending'"
);

pdiContent = pdiContent.replace(
  /setActiveSummaryDetail\(prev => prev === 'Total' \? null : 'Total'\);/g,
  "setActiveSummaryDetail(prev => prev === 'Pending' ? null : 'Pending');"
);

fs.writeFileSync(pdiFile, pdiContent);
console.log('Patched');
