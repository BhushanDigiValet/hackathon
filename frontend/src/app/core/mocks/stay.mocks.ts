/**
 * Hardcoded data taken from the Stitch designs. Services return these until
 * the GraphQL API is wired up; delete this file once every service is live.
 */
import {
  GuestContext,
  Invitation,
  PersonalizationOptions,
} from '../models/stay.models';

const IMG = 'https://lh3.googleusercontent.com/aida-public/';

export const MOCK_GUEST: GuestContext = {
  suite: 'Suite 1204',
  tier: 'Sanctuary tier',
  concierge: 'Private concierge',
};

export const MOCK_BRAND_LOGO_URL =
  IMG +
  'AB6AXuD63Trr6RsvgfQifq16T6JCKaNktEDEjlpk36rXh-NAN-b_rzVGtrl9BIOt8x5JhPJEYp8JDPlnZk5O0xnulzvnE3wV2RuCrWXlqCdBlt2ZCMxCMGkqAqjC-cx0r9SSi_ZSqcBKihNCu83XInzBM2dBA4k5MGg7S3jj88Fsde_qwxzGDtINiwWrQ_nvrk_pwe7qLiM1Ps27yS5Gdaxi6-r6c-lg28HmLlKGWyw1UqZqD8gfc9_llFM';

/** Parts of the welcome screen the options/profile APIs don't provide yet. */
export const MOCK_PERSONALIZATION: Omit<PersonalizationOptions, 'moods' | 'paces' | 'travelCompanies'> = {
  synthesisSteps: [
    'Reading how you want to feel...',
    'Understanding your pace...',
    'Balancing your days...',
    'Creating moments worth remembering...',
  ],
  demoPrompt:
    "I've had a crazy few months. I want this trip to feel luxurious and relaxing. Give me great food, a spa, a beautiful sunset and maybe something social tonight. I don't want to plan everything myself.",
  modelLabel: 'Private concierge model v4.2',
};

export const MOCK_INVITATIONS: Invitation[] = [
  {
    id: 'inv-1',
    title: 'Twilight Champagne & Vinyl on the Fountain Terrace',
    startsAtLabel: 'Tonight · 21:00',
    spotsRemaining: 2,
    verifiedLabel: 'Verified Resident Invitation',
    venue: 'North Veranda Pavilion · Private Fire Pit #3',
    imageUrl:
      IMG +
      'AB6AXuAixV22UvYeB1Bp1cTb06gw5P4b6vdxk4QJa2KLfw0mo7AUb6xOVKR062JkGIbhfyj4TcWXJt51OTGA_3t6Hf69xSvwJDw7qC5rIqI74eg4o_OyT5xfIuPlQ5SaYcz9-AUv-7axuSkx_fNhhmhTTyA0dER7pYtXzbNpKudwd4GGLx2pRPVsW0ljKYc7vcfaL0U-F2d1LWQMQAr5U5B23CBIeMpF6qTzHAxNwkF3Av6MNinubdPDqfI',
    hostNote:
      'Opening a magnum of Dom Pérignon 2012 by the fountain fire bowl. Seeking two fellow art or wine lovers for slow jazz and midnight conversation.',
    host: { names: 'Julian & Claire', initials: 'JC', suite: 'Suite 1408', role: 'Resident Hosts' },
    tags: [
      { icon: 'graphic_eq', label: 'Acoustic Jazz' },
      { icon: 'wine_bar', label: 'Grand Cru Tasting' },
      { icon: 'chat_bubble', label: 'Unrushed Convo' },
    ],
  },
  {
    id: 'inv-2',
    title: 'Midnight Cellar Tasting in Vault IV',
    startsAtLabel: 'Midnight · 00:00',
    spotsRemaining: 4,
    verifiedLabel: 'Verified Resident Invitation',
    venue: 'Private Cellar Vault IV · Lower Atrium',
    imageUrl:
      IMG +
      'AB6AXuDQlFe8rc3moRs1ijJ4gsItqL-zc0zfRE7E-xoMvKYSUSHQ-TwNDCn-GMbHsr5T54QPPJH6e1ht-LpbVfbITMeK48qnHs6SAKbhCyVObqLI3hkb6A-cxJ0_QI9xpFUCvIdd8rGNXmMFjkOry_6xOBqwxIiI70CVj92qFtjjzcX6GFtBhnT6UQnqpcYjIT0-B40EzEhfaLzQBpi3VQEk46miLcgYZa0qtLD17Ssrq8usE0fEGhwlPng',
    hostNote:
      'Our sommelier is pulling three vintages of Barolo we have been saving. Four seats around the vault table for curious palates.',
    host: { names: 'Marcus', initials: 'MR', suite: 'Suite 1502', role: 'Resident Host' },
    tags: [
      { icon: 'wine_bar', label: 'Barolo Vertical' },
      { icon: 'candle', label: 'Candlelit' },
      { icon: 'lock', label: 'Members Only' },
    ],
  },
  {
    id: 'inv-3',
    title: 'Sunrise Sound Bath at the Obsidian Pool',
    startsAtLabel: 'Tomorrow · 06:30',
    spotsRemaining: 3,
    verifiedLabel: 'Verified Resident Invitation',
    venue: 'Obsidian Pool Deck · East Cabanas',
    imageUrl:
      IMG +
      'AB6AXuDtJJBGp4lXDj-elODaCLG67iWO0ix6myeWoChW-UWdghZG3tpePPcIxniBm8xygNRkoe7zicX5plLI4Ki7n_wpKsUBzQoXBxFDBwvcoSCgtpXbZRULteS6kbFZs2iXS985KmO4TvmGxi_eCI02xjhkmPE0-lRDmDfiWlL9kyR1A4rT4gDHnMLAn9igy29k-9AE0-hTARh_4dkSBbbygX1U5sMJGNsuily_2yNZuhMvPhVft5saLWc',
    hostNote:
      'Crystal bowls, warm towels and fresh-pressed juice as the sun comes up over the water. Come as you are.',
    host: { names: 'Anaya & Theo', initials: 'AT', suite: 'Suite 1106', role: 'Resident Hosts' },
    tags: [
      { icon: 'spa', label: 'Sound Bath' },
      { icon: 'wb_twilight', label: 'Sunrise' },
      { icon: 'self_improvement', label: 'Restorative' },
    ],
  },
];
