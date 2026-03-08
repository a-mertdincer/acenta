'use client';

type AirportVariant = 'NAV' | 'ASR';

export function AirportSelector({
  value,
  onChange,
  labels,
}: {
  value: AirportVariant | null;
  onChange: (v: AirportVariant) => void;
  labels: { nav: string; asr: string; navMeta?: string; asrMeta?: string };
}) {
  return (
    <div className="airport-selector">
      <button
        type="button"
        className={`airport-card ${value === 'NAV' ? 'selected' : ''}`}
        onClick={() => onChange('NAV')}
      >
        <strong>{labels.nav}</strong>
        {labels.navMeta && <span className="airport-meta">{labels.navMeta}</span>}
      </button>
      <button
        type="button"
        className={`airport-card ${value === 'ASR' ? 'selected' : ''}`}
        onClick={() => onChange('ASR')}
      >
        <strong>{labels.asr}</strong>
        {labels.asrMeta && <span className="airport-meta">{labels.asrMeta}</span>}
      </button>
    </div>
  );
}
