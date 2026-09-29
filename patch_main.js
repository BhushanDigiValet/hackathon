const fs = require('fs');
const path = 'backend/src/main.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. Add new entities to import
content = content.replace('MemoryReel,', 'MemoryReel,\n  MasterAtmosphere,\n  MasterCadence,\n  MasterTravelCompany,');

// 2. Add repos initialization
const repoInit = `const memoryReelRepo = app.get(getRepositoryToken(MemoryReel));
  const atmosphereRepo = app.get(getRepositoryToken(MasterAtmosphere));
  const cadenceRepo = app.get(getRepositoryToken(MasterCadence));
  const travelCompanyRepo = app.get(getRepositoryToken(MasterTravelCompany));`;
content = content.replace('const memoryReelRepo = app.get(getRepositoryToken(MemoryReel));', repoInit);

// 3. Add to seedAll call
const seedAllCall = `eventRepo,
    memoryReelRepo,
    atmosphereRepo,
    cadenceRepo,
    travelCompanyRepo,`;
content = content.replace('eventRepo,\n    memoryReelRepo,', seedAllCall);

fs.writeFileSync(path, content);
console.log('main.ts patched');
