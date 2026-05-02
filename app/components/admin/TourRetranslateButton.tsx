'use client';

import { useState } from 'react';
import { Button } from '../Button';
import { retranslateTour } from '@/app/actions/tours';

export function TourRetranslateButton({ tourId }: { tourId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    if (
      !confirm(
        'İngilizce metinden 10 dile yeniden çeviri yapılacak; bu dillere ait mevcut otomatik çeviriler üzerine yazılır. Devam edilsin mi?'
      )
    ) {
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const result = await retranslateTour(tourId);
      setMessage(result.ok ? 'Çeviriler güncellendi.' : result.error ?? 'İşlem başarısız');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-retranslate-block">
      <Button type="button" variant="secondary" onClick={handleClick} disabled={loading} isLoading={loading}>
        10 dile yeniden çevir
      </Button>
      {message ? <p className="admin-retranslate-msg">{message}</p> : null}
    </div>
  );
}
