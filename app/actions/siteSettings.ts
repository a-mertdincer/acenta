'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { SUPPORTED_LOCALES } from '@/lib/i18n';
import {
  MESSAGING_SETTING_KEYS,
  type MessagingLinks,
  type MessagingSettingKey,
} from '@/lib/messagingSettings';
import { getSession } from './auth';

const MAX_LEN = 2000;

function normalizeMessagingInput(raw: {
  whatsapp_link: unknown;
  wechat_id: unknown;
  line_link: unknown;
}): { ok: true; value: MessagingLinks } | { ok: false; error: string } {
  const whatsapp_link = typeof raw.whatsapp_link === 'string' ? raw.whatsapp_link.trim() : '';
  const wechat_id = typeof raw.wechat_id === 'string' ? raw.wechat_id.trim() : '';
  const line_link = typeof raw.line_link === 'string' ? raw.line_link.trim() : '';
  if (whatsapp_link.length > MAX_LEN || wechat_id.length > MAX_LEN || line_link.length > MAX_LEN) {
    return { ok: false, error: 'Değer çok uzun' };
  }
  return { ok: true, value: { whatsapp_link, wechat_id, line_link } };
}

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
    };
  } catch {
    return { whatsapp_link: '', wechat_id: '', line_link: '' };
  }
}

export async function updateMessagingSettings(input: {
  whatsapp_link: unknown;
  wechat_id: unknown;
  line_link: unknown;
}): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return { ok: false, error: 'Unauthorized' };
  }
  const parsed = normalizeMessagingInput(input);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  try {
    for (const key of MESSAGING_SETTING_KEYS) {
      await prisma.siteSetting.upsert({
        where: { key },
        create: { key, value: parsed.value[key] },
        update: { value: parsed.value[key] },
      });
    }
    for (const lang of SUPPORTED_LOCALES) {
      revalidatePath(`/${lang}/contact`, 'page');
      revalidatePath(`/${lang}/admin/contact-settings`, 'page');
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Kayıt başarısız' };
  }
}
