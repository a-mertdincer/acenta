'use server';

import { prisma } from '@/lib/prisma';

export type SubmitPriceInquiryInput = {
  tourId: string;
  name: string;
  email: string;
  phoneDial: string;
  phoneLocal: string;
  country: string;
  preferredDate: string;
  people: number;
  hotelOrCruise: string;
  message: string;
};

function sanitizeLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export type SubmitPriceInquiryResult = { ok: true } | { ok: false; error: string };

export async function submitPriceInquiry(raw: SubmitPriceInquiryInput): Promise<SubmitPriceInquiryResult> {
  const tourId = sanitizeLine(raw.tourId);
  const name = sanitizeLine(raw.name);
  const email = sanitizeLine(raw.email).toLowerCase();
  const country = sanitizeLine(raw.country);
  const preferredDate = sanitizeLine(raw.preferredDate);
  const hotelOrCruise = sanitizeLine(raw.hotelOrCruise);
  const message = raw.message.replace(/\r\n/g, '\n').trim();
  const phoneDial = sanitizeLine(raw.phoneDial);
  const phoneLocal = sanitizeLine(raw.phoneLocal);
  const phone = sanitizeLine(`${phoneDial} ${phoneLocal}`);

  if (!tourId) return { ok: false, error: 'Invalid tour.' };
  if (name.length < 2 || name.length > 200) return { ok: false, error: 'Please enter your full name.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }
  if (!phone || phone.length < 6 || phone.length > 80) return { ok: false, error: 'Please enter a valid phone number.' };
  if (country.length < 2 || country.length > 120) return { ok: false, error: 'Please enter your country.' };
  if (!preferredDate) return { ok: false, error: 'Please choose a date.' };
  if (!Number.isFinite(raw.people) || raw.people < 1 || raw.people > 50) {
    return { ok: false, error: 'Number of people must be between 1 and 50.' };
  }
  if (hotelOrCruise.length > 300) return { ok: false, error: 'Hotel name is too long.' };
  if (message.length > 5000) return { ok: false, error: 'Message is too long.' };

  try {
    const tour = await prisma.tour.findUnique({
      where: { id: tourId },
      select: { id: true, isAskForPrice: true },
    });
    if (!tour) return { ok: false, error: 'Tour not found.' };
    if (!tour.isAskForPrice) return { ok: false, error: 'This tour does not accept price inquiries.' };

    await prisma.priceInquiry.create({
      data: {
        tourId,
        name,
        email,
        phone,
        country: country || null,
        preferredDate,
        people: raw.people,
        hotelOrCruise: hotelOrCruise || null,
        message: message || null,
      },
    });
    return { ok: true };
  } catch (e) {
    console.error('submitPriceInquiry', e);
    return { ok: false, error: 'Could not send your request. Please try again later.' };
  }
}
