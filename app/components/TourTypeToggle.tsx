'use client';

type TourTypeVariant = 'eco' | 'plus';

export function TourTypeToggle({
  value,
  onChange,
  labels,
}: {
  value: TourTypeVariant | null;
  onChange: (v: TourTypeVariant) => void;
  labels: { eco: string; plus: string };
}) {
  return (
    <div className="tour-type-toggle">
      <button
        type="button"
        className={`tour-type-btn ${value === 'eco' ? 'active' : ''}`}
        onClick={() => onChange('eco')}
      >
        {labels.eco}
      </button>
      <button
        type="button"
        className={`tour-type-btn ${value === 'plus' ? 'active' : ''}`}
        onClick={() => onChange('plus')}
      >
        {labels.plus}
      </button>
    </div>
  );
}
