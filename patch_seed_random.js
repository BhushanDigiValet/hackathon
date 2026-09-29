const fs = require('fs');
const path = 'backend/src/seed/all.ts';
let content = fs.readFileSync(path, 'utf8');

const regex = /const defaultPromptText = "I've had a crazy few months.*?await profileRepo\.save\(profiles\);/s;

const newLogic = `const prompts = [
    "I've had a crazy few months. I want this trip to feel luxurious and relaxing. Give me great food, a spa, a beautiful sunset and maybe something social tonight. I don't want to plan everything myself.",
    "Looking for an adventurous and packed weekend! I want to explore, try unique dining experiences, and maybe catch a late-night show.",
    "A quiet, romantic getaway for two. We just want to recharge, enjoy some fine dining, and sleep in every morning."
  ];

  for (let i = 0; i < 50; i++) {
    // Randomize Atmosphere (pick 2 unique random IDs from 1 to 6)
    const allAtmospheres = [1, 2, 3, 4, 5, 6];
    const atmosphereMoodIds = allAtmospheres.sort(() => 0.5 - Math.random()).slice(0, 2);
    
    const itineraryCadenceId = Math.floor(Math.random() * 3) + 1; // 1 to 3
    const travelCompanyId = Math.floor(Math.random() * 4) + 1; // 1 to 4
    const openToGuestCircles = Math.random() > 0.5;
    
    const wakeTimes = ['08:00 AM', '09:00 AM', '10:00 AM'];
    const doNotDisturbBefore = wakeTimes[Math.floor(Math.random() * wakeTimes.length)];
    
    const budgetTiers = ['Tier 2 - Elevated', 'Tier 3 - Luxury', 'Tier 4 - Unrestricted'];
    const budgetTier = budgetTiers[Math.floor(Math.random() * budgetTiers.length)];
    
    const defaultPrompt = prompts[Math.floor(Math.random() * prompts.length)];

    profiles.push(
      profileRepo.create({
        guestId: guests[i].id,
        preferences: {
          atmosphereMoodIds,
          itineraryCadenceId,
          travelCompanyId,
          openToGuestCircles,
          doNotDisturbBefore,
          budgetTier,
          defaultPrompt
        },
      }),
    );
  }
  await profileRepo.save(profiles);`;

content = content.replace(regex, newLogic);
fs.writeFileSync(path, content);
console.log('Randomness added to profiles.');
