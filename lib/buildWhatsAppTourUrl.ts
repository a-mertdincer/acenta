/** Default WhatsApp business number (E.164 without +). */
export const WHATSAPP_BUSINESS_E164 = '905362115993';

export function buildTourWhatsAppHref(params: { tourTitle: string; dateYmd: string; people: number }): string {
  const text = `Hi, I'm interested in ${params.tourTitle} on ${params.dateYmd} for ${params.people} people.`;
  return `https://wa.me/${WHATSAPP_BUSINESS_E164}?text=${encodeURIComponent(text)}`;
}
