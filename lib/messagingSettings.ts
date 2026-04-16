export const MESSAGING_SETTING_KEYS = [
  'whatsapp_link',
  'wechat_id',
  'line_link',
  'telegram_link',
] as const;
export type MessagingSettingKey = (typeof MESSAGING_SETTING_KEYS)[number];
export type MessagingLinks = Record<MessagingSettingKey, string>;

export const SOCIAL_SETTING_KEYS = [
  'instagram_link',
  'facebook_link',
  'tripadvisor_link',
  'rednote_link',
] as const;
export type SocialSettingKey = (typeof SOCIAL_SETTING_KEYS)[number];
export type SocialLinks = Record<SocialSettingKey, string>;

export const CONTACT_INFO_KEYS = [
  'contact_address',
  'contact_phone',
  'contact_email',
  'contact_tursab',
  'contact_maps_embed_url',
] as const;
export type ContactInfoKey = (typeof CONTACT_INFO_KEYS)[number];
export type ContactInfo = Record<ContactInfoKey, string>;

export const CONTACT_INFO_DEFAULTS: ContactInfo = {
  contact_address: 'İsali-Gaferli-Avcılar Mahallesi, Kağnıyolu Sokak No:8/Z-01, Göreme/Nevşehir',
  contact_phone: '+90 536 211 59 93',
  contact_email: 'info@kismetgoremetravel.com',
  contact_tursab: '18701',
  contact_maps_embed_url: 'https://www.google.com/maps?q=K%C4%B1smet+G%C3%B6reme+Travel+G%C3%B6reme&output=embed',
};
