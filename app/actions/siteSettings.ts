'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { SUPPORTED_LOCALES } from '@/lib/i18n';
import {
  MESSAGING_SETTING_KEYS,
  SOCIAL_SETTING_KEYS,
  CONTACT_INFO_KEYS,
  CONTACT_INFO_DEFAULTS,
  type MessagingLinks,
  type MessagingSettingKey,
  type SocialLinks,
  type SocialSettingKey,
  type ContactInfo,
  type ContactInfoKey,
} from '@/lib/messagingSettings';
import { getSession } from './auth';

const MAX_LEN = 2000;

function trimField(value: unknown, max = MAX_LEN): { ok: true; value: string } | { ok: false } {
  if (typeof value !== 'string') return { ok: true, value: '' };
  const trimmed = value.trim();
  if (trimmed.length > max) return { ok: false };
  return { ok: true, value: trimmed };
}

function revalidateSiteSettings() {
  for (const lang of SUPPORTED_LOCALES) {
    // layout so Footer (in layout) re-renders everywhere
    revalidatePath(`/${lang}`, 'layout');
    revalidatePath(`/${lang}/contact`, 'page');
    revalidatePath(`/${lang}/admin/contact-settings`, 'page');
  }
}

// ─── Messaging ───────────────────────────────────────────────────────────────

export async function getMessagingLinks(): Promise<MessagingLinks> {
  try {
    const rows = await prisma.siteSetting.findMany({
      where: { key: { in: [...MESSAGING_SETTING_KEYS] } },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value] as const)) as Partial<
      Record<MessagingSettingKey, string>
    >;
    return {
      whatsapp_link: (map.whatsapp_link ?? '').trim(),
      wechat_id: (map.wechat_id ?? '').trim(),
      line_link: (map.line_link ?? '').trim(),
      telegram_link: (map.telegram_link ?? '').trim(),
    };
  } catch {
    return { whatsapp_link: '', wechat_id: '', line_link: '', telegram_link: '' };
  }
}

export async function updateMessagingSettings(input: Partial<Record<MessagingSettingKey, unknown>>): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };

  const values: Partial<MessagingLinks> = {};
  for (const key of MESSAGING_SETTING_KEYS) {
    const r = trimField(input[key]);
    if (!r.ok) return { ok: false, error: `${key}: değer çok uzun` };
    values[key] = r.value;
  }
  try {
    for (const key of MESSAGING_SETTING_KEYS) {
      await prisma.siteSetting.upsert({
        where: { key },
        create: { key, value: values[key] ?? '' },
        update: { value: values[key] ?? '' },
      });
    }
    revalidateSiteSettings();
    return { ok: true };
  } catch {
    return { ok: false, error: 'Kayıt başarısız' };
  }
}

// ─── Social ──────────────────────────────────────────────────────────────────

export async function getSocialLinks(): Promise<SocialLinks> {
  try {
    const rows = await prisma.siteSetting.findMany({
      where: { key: { in: [...SOCIAL_SETTING_KEYS] } },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value] as const)) as Partial<
      Record<SocialSettingKey, string>
    >;
    return {
      instagram_link: (map.instagram_link ?? '').trim(),
      facebook_link: (map.facebook_link ?? '').trim(),
      tripadvisor_link: (map.tripadvisor_link ?? '').trim(),
      rednote_link: (map.rednote_link ?? '').trim(),
    };
  } catch {
    return { instagram_link: '', facebook_link: '', tripadvisor_link: '', rednote_link: '' };
  }
}

export async function updateSocialSettings(input: Partial<Record<SocialSettingKey, unknown>>): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };

  const values: Partial<SocialLinks> = {};
  for (const key of SOCIAL_SETTING_KEYS) {
    const r = trimField(input[key]);
    if (!r.ok) return { ok: false, error: `${key}: değer çok uzun` };
    values[key] = r.value;
  }
  try {
    for (const key of SOCIAL_SETTING_KEYS) {
      await prisma.siteSetting.upsert({
        where: { key },
        create: { key, value: values[key] ?? '' },
        update: { value: values[key] ?? '' },
      });
    }
    revalidateSiteSettings();
    return { ok: true };
  } catch {
    return { ok: false, error: 'Kayıt başarısız' };
  }
}

// ─── Contact info ────────────────────────────────────────────────────────────

export async function getContactInfo(): Promise<ContactInfo> {
  try {
    const rows = await prisma.siteSetting.findMany({
      where: { key: { in: [...CONTACT_INFO_KEYS] } },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value] as const)) as Partial<
      Record<ContactInfoKey, string>
    >;
    const out = { ...CONTACT_INFO_DEFAULTS };
    for (const key of CONTACT_INFO_KEYS) {
      const v = (map[key] ?? '').trim();
      if (v) out[key] = v;
    }
    return out;
  } catch {
    return { ...CONTACT_INFO_DEFAULTS };
  }
}

export async function updateContactInfo(input: Partial<Record<ContactInfoKey, unknown>>): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') return { ok: false, error: 'Unauthorized' };

  const values: Partial<ContactInfo> = {};
  for (const key of CONTACT_INFO_KEYS) {
    const r = trimField(input[key]);
    if (!r.ok) return { ok: false, error: `${key}: değer çok uzun` };
    values[key] = r.value;
  }
  try {
    for (const key of CONTACT_INFO_KEYS) {
      await prisma.siteSetting.upsert({
        where: { key },
        create: { key, value: values[key] ?? '' },
        update: { value: values[key] ?? '' },
      });
    }
    revalidateSiteSettings();
    return { ok: true };
  } catch {
    return { ok: false, error: 'Kayıt başarısız' };
  }
}
