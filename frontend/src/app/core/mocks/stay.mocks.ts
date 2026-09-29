/**
 * Hardcoded data taken from the Stitch designs. Services return these until
 * the GraphQL API is wired up; delete this file once every service is live.
 */
import {
  GuestContext,
  PersonalizationOptions,
} from '../models/stay.models';

const IMG = 'https://lh3.googleusercontent.com/aida-public/';

export const MOCK_GUEST: GuestContext = {
  suite: 'Suite 1204',
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
};
