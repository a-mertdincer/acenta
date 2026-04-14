export const MESSAGING_SETTING_KEYS = ['whatsapp_link', 'wechat_id', 'line_link'] as const;
export type MessagingSettingKey = (typeof MESSAGING_SETTING_KEYS)[number];
export type MessagingLinks = Record<MessagingSettingKey, string>;
