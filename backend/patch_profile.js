const fs = require('fs');

// Patch profile.service.ts
const svcPath = 'src/profile/profile.service.ts';
let svc = fs.readFileSync(svcPath, 'utf8');

svc = svc.replace('import { StayProfile }', 'import { StayProfile, MasterAtmosphere, MasterCadence, MasterTravelCompany }');
svc = svc.replace('private readonly eventsService: EventsService,', `private readonly eventsService: EventsService,
    @InjectRepository(MasterAtmosphere) private atmosphereRepo: Repository<MasterAtmosphere>,
    @InjectRepository(MasterCadence) private cadenceRepo: Repository<MasterCadence>,
    @InjectRepository(MasterTravelCompany) private travelCompanyRepo: Repository<MasterTravelCompany>,`);

const getOptionsMethod = `
  async getOptions() {
    return {
      atmosphereAndMood: await this.atmosphereRepo.find({ where: { isActive: true }, order: { id: 'ASC' } }),
      itineraryCadence: await this.cadenceRepo.find({ where: { isActive: true }, order: { id: 'ASC' } }),
      travelCompany: await this.travelCompanyRepo.find({ where: { isActive: true }, order: { id: 'ASC' } })
    };
  }
`;
svc = svc.replace('  async getProfile', getOptionsMethod + '\n  async getProfile');

fs.writeFileSync(svcPath, svc);

// Patch profile.controller.ts
const ctrlPath = 'src/profile/profile.controller.ts';
let ctrl = fs.readFileSync(ctrlPath, 'utf8');

const getOptionsRoute = `
  @Get('options')
  async getOptions() {
    return this.profileService.getOptions();
  }
`;
ctrl = ctrl.replace('  @Get()', getOptionsRoute + '\n  @Get()');

fs.writeFileSync(ctrlPath, ctrl);
console.log('Profile patched');
