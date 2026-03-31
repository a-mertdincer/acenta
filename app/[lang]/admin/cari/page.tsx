'use client';

import { useState, useEffect } from 'react';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { getCariRecords, getCariSummary, createCariRecord, updateCariRecord, deleteCariRecord, type CariRecordRow, type CreateCariInput } from '../../../actions/cari';

const CURRENCIES = ['EUR', 'TRY', 'USD'] as const;
const PAYMENT_METHODS = [{ value: 'cash', label: 'Nakit' }, { value: 'transfer', label: 'Havale' }, { value: 'card', label: 'Kredi Kartı' }];
const PAYMENT_DEST = [{ value: 'internal', label: 'Bize' }, { value: 'agency_direct', label: 'Acentaya doğrudan' }];
const PAID_TO_AGENCY = [{ value: 'paid', label: 'Ödendi' }, { value: 'pending', label: 'Beklemede' }, { value: 'unpaid', label: 'Ödenmedi' }];

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const MISSING_FIELD_LABELS: Record<string, string> = {
  paid_to_agency: 'Acenta ödeme durumu',
  salesperson: 'Satıcı',
};

function getStatusBadge(row: CariRecordRow): { label: string; color: string; bg: string; tooltip?: string } {
  if (row.completionStatus === 'CANCELLED') {
    return { label: '❌ İptal', color: '#991b1b', bg: '#fee2e2' };
  }
  if (row.completionStatus === 'COMPLETE') {
    return { label: '✅ Tamam', color: '#065f46', bg: '#d1fae5' };
  }
  const missing = row.missingFields ?? [];
  const tooltip = missing.length > 0
    ? `Eksik: ${missing.map((field) => MISSING_FIELD_LABELS[field] ?? field).join(', ')}`
    : 'Eksik alanlar var';
  return {
    label: `⚠️ Eksik (${missing.length} alan)`,
    color: '#92400e',
    bg: '#fef3c7',
    tooltip,
  };
}

function requiredFieldStyle(isMissing: boolean): React.CSSProperties | undefined {
  if (!isMissing) return undefined;
  return {
    borderColor: '#f59e0b',
    boxShadow: '0 0 0 2px rgba(245, 158, 11, 0.18)',
    backgroundColor: '#fffaf0',
  };
}

export default function AdminCariPage() {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [records, setRecords] = useState<CariRecordRow[]>([]);
  const [summary, setSummary] = useState({ totalRevenue: 0, totalCost: 0, netProfit: 0, pendingPayment: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<CreateCariInput>>({
    guestName: '',
    hotelName: '',
    roomNumber: '',
    activityType: 'Balon',
    quantity: 1,
    activityDate: new Date().toISOString().split('T')[0],
    salePrice: 0,
    saleCurrency: 'EUR',
    costAmount: null,
    costCurrency: 'EUR',
    costDescription: '',
    agentName: '',
    paymentMethod: 'cash',
    paymentDestination: 'internal',
    salesperson: '',
    paidToAgency: null,
    reservationConfirmed: false,
    confirmationReceived: false,
    paymentReceived: false,
    notes: '',
  });

  const load = () => {
    setLoading(true);
    Promise.all([getCariRecords({ month }), getCariSummary(month)]).then(([list, sum]) => {
      setRecords(list);
      setSummary(sum);
      setLoading(false);
    });
  };

  useEffect(() => {
    let cancelled = false;
    setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      Promise.all([getCariRecords({ month }), getCariSummary(month)]).then(([list, sum]) => {
        if (cancelled) return;
        setRecords(list);
        setSummary(sum);
        setLoading(false);
      });
    }, 0);
    return () => {
      cancelled = true;
    };
  }, [month]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.guestName?.trim() || !form.activityDate) {
      alert('Misafir adı ve tarih zorunludur.');
      return;
    }
    setSaving(true);
    const result = await createCariRecord({
      guestName: form.guestName!,
      hotelName: form.hotelName || null,
      roomNumber: form.roomNumber || null,
      activityType: form.activityType || 'Balon',
      quantity: form.quantity ?? 1,
      activityDate: form.activityDate,
      salePrice: Number(form.salePrice) || 0,
      saleCurrency: form.saleCurrency || 'EUR',
      costAmount: form.costAmount != null ? Number(form.costAmount) : null,
      costCurrency: form.costCurrency || null,
      costDescription: form.costDescription || null,
      agentName: form.agentName || null,
      paymentMethod: form.paymentMethod || 'cash',
      paymentDestination: form.paymentDestination || 'internal',
      salesperson: form.salesperson || null,
      paidToAgency: form.paidToAgency ?? null,
      reservationConfirmed: form.reservationConfirmed ?? false,
      confirmationReceived: form.confirmationReceived ?? false,
      paymentReceived: form.paymentReceived ?? false,
      notes: form.notes || null,
    });
    setSaving(false);
    if (result.ok) {
      load();
      setShowForm(false);
      setForm({ guestName: '', activityType: 'Balon', quantity: 1, activityDate: new Date().toISOString().split('T')[0], salePrice: 0, saleCurrency: 'EUR' });
    } else alert(result.error);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
    const result = await deleteCariRecord(id);
    if (result.ok) load();
    else alert(result.error);
  };

  const currentEditing = editingId ? records.find((r) => r.id === editingId) : null;
  const missingSet = new Set(currentEditing?.missingFields ?? []);

  const startEdit = (row: CariRecordRow) => {
    setEditingId(row.id);
    setForm({
      guestName: row.guestName,
      hotelName: row.hotelName ?? '',
      roomNumber: row.roomNumber ?? '',
      activityType: row.activityType,
      quantity: row.quantity,
      activityDate: new Date(row.activityDate).toISOString().split('T')[0],
      salePrice: row.salePrice,
      saleCurrency: row.saleCurrency,
      costAmount: row.costAmount,
      costCurrency: row.costCurrency ?? 'EUR',
      costDescription: row.costDescription ?? '',
      agentName: row.agentName ?? '',
      paymentMethod: row.paymentMethod,
      paymentDestination: row.paymentDestination,
      salesperson: row.salesperson ?? '',
      paidToAgency: row.paidToAgency ?? null,
      reservationConfirmed: row.reservationConfirmed,
      confirmationReceived: row.confirmationReceived,
      paymentReceived: row.paymentReceived,
      notes: row.notes ?? '',
    });
    setShowForm(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    const result = await updateCariRecord(editingId, {
      guestName: form.guestName,
      hotelName: form.hotelName || null,
      roomNumber: form.roomNumber || null,
      activityType: form.activityType,
      quantity: form.quantity,
      activityDate: form.activityDate,
      salePrice: form.salePrice != null ? Number(form.salePrice) : undefined,
      saleCurrency: form.saleCurrency,
      costAmount: form.costAmount != null ? Number(form.costAmount) : null,
      costCurrency: form.costCurrency || null,
      costDescription: form.costDescription || null,
      agentName: form.agentName || null,
      paymentMethod: form.paymentMethod,
      paymentDestination: form.paymentDestination,
      salesperson: form.salesperson || null,
      paidToAgency: form.paidToAgency ?? null,
      reservationConfirmed: form.reservationConfirmed,
      confirmationReceived: form.confirmationReceived,
      paymentReceived: form.paymentReceived,
      notes: form.notes || null,
    });
    setSaving(false);
    if (result.ok) {
      setEditingId(null);
      load();
    } else {
      alert(result.error);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)', marginBottom: 'var(--space-2xl)' }}>
        <h1>💰 Cari Hesap</h1>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
          <label>
            Ay:
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              style={{ marginLeft: 8, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border)' }}
            />
          </label>
          <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Formu kapat' : '+ Yeni Kayıt Ekle'}</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-2xl)' }}>
        <div className="card" style={{ padding: 'var(--space-lg)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Toplam Gelir</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>€{summary.totalRevenue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="card" style={{ padding: 'var(--space-lg)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Maliyet</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>€{summary.totalCost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="card" style={{ padding: 'var(--space-lg)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Net Kâr</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>€{summary.netProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="card" style={{ padding: 'var(--space-lg)' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Bekleyen Ödeme</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>€{summary.pendingPayment.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      {(showForm || editingId) && (
        <form onSubmit={editingId ? handleUpdate : handleSubmit} className="card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-2xl)' }}>
          <h2 style={{ marginBottom: 'var(--space-lg)' }}>{editingId ? 'Cari Kayıt Düzenle' : 'Yeni Cari Kayıt'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
            <Input label="Misafir Adı *" value={form.guestName ?? ''} onChange={(e) => setForm((f) => ({ ...f, guestName: e.target.value }))} required />
            <Input label="Otel" value={form.hotelName ?? ''} onChange={(e) => setForm((f) => ({ ...f, hotelName: e.target.value }))} />
            <Input label="Oda No" value={form.roomNumber ?? ''} onChange={(e) => setForm((f) => ({ ...f, roomNumber: e.target.value }))} />
            <Input label="Aktivite" value={form.activityType ?? ''} onChange={(e) => setForm((f) => ({ ...f, activityType: e.target.value }))} placeholder="Balon, Özel Tur, Transfer" />
            <Input label="Adet" type="number" min={1} value={String(form.quantity ?? 1)} onChange={(e) => setForm((f) => ({ ...f, quantity: parseInt(e.target.value, 10) || 1 }))} />
            <Input label="Tarih *" type="date" value={form.activityDate ?? ''} onChange={(e) => setForm((f) => ({ ...f, activityDate: e.target.value }))} required />
            <Input label="Satış Fiyatı" type="number" step="0.01" value={String(form.salePrice ?? 0)} onChange={(e) => setForm((f) => ({ ...f, salePrice: parseFloat(e.target.value) }))} />
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Para birimi</label>
              <select value={form.saleCurrency ?? 'EUR'} onChange={(e) => setForm((f) => ({ ...f, saleCurrency: e.target.value }))} style={{ width: '100%', padding: '0.5rem', borderRadius: 4, border: '1px solid var(--color-border)' }}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <Input label="Acenta" value={form.agentName ?? ''} onChange={(e) => setForm((f) => ({ ...f, agentName: e.target.value }))} placeholder="Egemen, Elite Travel" />
            <Input label="Maliyet" type="number" step="0.01" value={form.costAmount != null ? String(form.costAmount) : ''} onChange={(e) => setForm((f) => ({ ...f, costAmount: e.target.value === '' ? null : parseFloat(e.target.value) }))} />
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Ödeme yöntemi</label>
              <select value={form.paymentMethod ?? 'cash'} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))} style={{ width: '100%', padding: '0.5rem', borderRadius: 4, border: '1px solid var(--color-border)' }}>
                {PAYMENT_METHODS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Ödeme nereye</label>
              <select value={form.paymentDestination ?? 'internal'} onChange={(e) => setForm((f) => ({ ...f, paymentDestination: e.target.value }))} style={{ width: '100%', padding: '0.5rem', borderRadius: 4, border: '1px solid var(--color-border)' }}>
                {PAYMENT_DEST.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Firma ödendi</label>
              <select value={form.paidToAgency ?? ''} onChange={(e) => setForm((f) => ({ ...f, paidToAgency: e.target.value || null }))} style={{ width: '100%', padding: '0.5rem', borderRadius: 4, border: '1px solid var(--color-border)', ...requiredFieldStyle(missingSet.has('paid_to_agency')) }}>
                <option value="">—</option>
                {PAID_TO_AGENCY.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Input label="Satıcı" value={form.salesperson ?? ''} onChange={(e) => setForm((f) => ({ ...f, salesperson: e.target.value }))} style={requiredFieldStyle(missingSet.has('salesperson'))} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Notlar</label>
              <textarea value={form.notes ?? ''} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} style={{ width: '100%', padding: '0.5rem', borderRadius: 4, border: '1px solid var(--color-border)' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <Button type="submit" disabled={saving}>{saving ? 'Kaydediliyor...' : '💾 Kaydet'}</Button>
            {editingId && (
              <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>İptal</Button>
            )}
          </div>
        </form>
      )}

      <div className="card" style={{ overflowX: 'auto' }}>
        {loading ? (
          <p style={{ padding: 'var(--space-xl)' }}>Yükleniyor...</p>
        ) : records.length === 0 ? (
          <p style={{ padding: 'var(--space-xl)', color: 'var(--color-text-muted)' }}>Bu ay için kayıt yok. Yeni kayıt ekleyin.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ padding: 'var(--space-md)' }}>Oda</th>
                <th style={{ padding: 'var(--space-md)' }}>Ad</th>
                <th style={{ padding: 'var(--space-md)' }}>Aktivite</th>
                <th style={{ padding: 'var(--space-md)' }}>Acenta</th>
                <th style={{ padding: 'var(--space-md)' }}>Satış</th>
                <th style={{ padding: 'var(--space-md)' }}>Maliyet</th>
                <th style={{ padding: 'var(--space-md)' }}>Ödeme</th>
                <th style={{ padding: 'var(--space-md)' }}>Durum</th>
                <th style={{ padding: 'var(--space-md)' }}>Kâr</th>
                <th style={{ padding: 'var(--space-md)' }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }} onClick={() => startEdit(r)}>
                  <td style={{ padding: 'var(--space-md)' }}>{r.roomNumber ?? '—'}</td>
                  <td style={{ padding: 'var(--space-md)' }}>{r.guestName}</td>
                  <td style={{ padding: 'var(--space-md)' }}>{r.activityType} · {r.quantity} kişi · {formatDate(r.activityDate)}</td>
                  <td style={{ padding: 'var(--space-md)' }}>{r.agentName ?? '—'}</td>
                  <td style={{ padding: 'var(--space-md)' }}>{r.saleCurrency} {r.salePrice.toFixed(2)}</td>
                  <td style={{ padding: 'var(--space-md)' }}>{r.costAmount != null ? `${r.costCurrency ?? 'EUR'} ${r.costAmount.toFixed(2)}` : '—'}</td>
                  <td style={{ padding: 'var(--space-md)' }}>{r.paymentMethod}</td>
                  <td style={{ padding: 'var(--space-md)' }}>
                    {(() => {
                      const status = getStatusBadge(r);
                      return (
                        <span title={status.tooltip} style={{ background: status.bg, color: status.color, padding: '4px 8px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700 }}>
                          {status.label}
                        </span>
                      );
                    })()}
                  </td>
                  <td style={{ padding: 'var(--space-md)' }}>{r.profit != null ? `€${r.profit.toFixed(2)}` : '—'}</td>
                  <td style={{ padding: 'var(--space-md)' }}>
                    <Button variant="secondary" style={{ padding: '4px 8px', fontSize: '0.8rem', marginRight: 'var(--space-xs)' }} onClick={(e) => { e.stopPropagation(); startEdit(r); }}>Düzenle</Button>
                    <Button variant="secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}>Sil</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
