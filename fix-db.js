const fs = require('fs');
const path = require('path');
const dbFile = path.join(__dirname, 'db.json');
const demoDbFile = path.join(__dirname, 'db_demo.json');
const liveDbFile = path.join(__dirname, 'db_live.json');

const files = [dbFile, demoDbFile, liveDbFile];

files.forEach(file => {
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    let changed = false;
    data.serialNumbers.forEach(sn => {
      if (sn.status === 'PDI Approved' && (!sn.pdiStatus || sn.pdiStatus === 'Pending') && sn.packingStatus === 'Not Packed') {
        sn.status = 'Allotted';
        changed = true;
      }
    });
    if (changed) {
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
      console.log('Fixed', file);
    }
  }
});
