const fs = require('fs');
const path = 'backend/src/seed/all.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. Add new entities to import
content = content.replace('MemoryReel,', 'MemoryReel,\n  MasterAtmosphere,\n  MasterCadence,\n  MasterTravelCompany,');

// 2. Add repos to seedAll parameters
content = content.replace('memoryReelRepo: Repository<MemoryReel>,', 'memoryReelRepo: Repository<MemoryReel>,\n  atmosphereRepo: Repository<MasterAtmosphere>,\n  cadenceRepo: Repository<MasterCadence>,\n  travelCompanyRepo: Repository<MasterTravelCompany>,');

// 3. Clear tables in the beginning
const clearBlock = `  await memoryReelRepo.clear();
  await atmosphereRepo.clear();
  await cadenceRepo.clear();
  await travelCompanyRepo.clear();`;
content = content.replace('  await memoryReelRepo.clear();', clearBlock);

// 4. Add seeding logic before "console.log('✅ Seed data successfully injected"
const newSeedingLogic = `

  // 12. Seed Master Tables (Figma Data)
  await atmosphereRepo.save([
    { name: 'Relaxed' },
    { name: 'Indulgent' },
    { name: 'Adventurous' },
    { name: 'Romantic' },
    { name: 'Social' },
    { name: 'Recharge' }
  ]);

  await cadenceRepo.save([
    { name: 'Slow', description: 'Take your time, fewer activities.' },
    { name: 'Balanced', description: 'Balanced tempo.' },
    { name: 'Packed', description: 'Full itinerary, maximum experiences.' }
  ]);

  await travelCompanyRepo.save([
    { name: 'Just me', icon: 'person' },
    { name: 'With my partner', icon: 'heart' },
    { name: 'With friends', icon: 'group' },
    { name: 'With family', icon: 'family' }
  ]);

`;

content = content.replace("  console.log('✅ Seed data successfully injected", newSeedingLogic + "  console.log('✅ Seed data successfully injected");

fs.writeFileSync(path, content);
console.log('seed/all.ts patched');
