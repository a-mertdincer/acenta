/**
 * Kategori slug → görsel URL (Pexels, telifsiz – aktiviteyle uyumlu).
 * Kart üstünde gösterilir. w=440 ile 4:3’e yakın kırpılır.
 */
const PEXELS = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=440&fit=crop`;

export const ACTIVITY_CATEGORY_IMAGES: Record<string, string> = {
  'hot-air-balloon': PEXELS(670061),   // Balonlar, Göreme – gün batımı
  'daily-tours': PEXELS(5246814),     // Tur otobüsü, kırsal yol
  'adventure-activities': PEXELS(7625042),  // Dağ yürüyüşü, macera
  'cultural-experiences': PEXELS(32265865),  // Efes antik kenti, Türkiye
  'private-tours': PEXELS(13228336),  // Dağ yolu, özel tur manzarası
  'transfers': PEXELS(3647693),       // Araç, havalimanı
  'workshops': PEXELS(3817646),       // Seramik boyama atölyesi
  'boat-tours': PEXELS(31616530),     // Tekneler, kıyı manzarası
};

const FALLBACK = PEXELS(5246814);

export function getActivityCategoryImage(slug: string): string {
  return ACTIVITY_CATEGORY_IMAGES[slug] ?? FALLBACK;
}
