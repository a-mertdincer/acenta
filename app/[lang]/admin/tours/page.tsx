'use client';

import { useState, useEffect } from 'react';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { getTours, getTourById, setTourDatePrice, createTourOption, updateTourOption, deleteTourOption, setTourTransferTiers, seedDemoTours, type TourOptionRow, type TransferTier } from '../../../actions/tours';

export default function AdminToursPage() {
    const [tours, setTours] = useState<{ id: string; titleEn: string; type: string; basePrice: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [dailyDate, setDailyDate] = useState('');
    const [dailyTourId, setDailyTourId] = useState('');
    const [dailyPrice, setDailyPrice] = useState(150);
    const [dailyCapacity, setDailyCapacity] = useState(20);
    const [dailyClosed, setDailyClosed] = useState(false);
    const [saving, setSaving] = useState(false);

    const [options, setOptions] = useState<TourOptionRow[]>([]);
    const [optTitleTr, setOptTitleTr] = useState('');
    const [optTitleEn, setOptTitleEn] = useState('');
    const [optTitleZh, setOptTitleZh] = useState('');
    const [optPriceAdd, setOptPriceAdd] = useState('');
    const [optSaving, setOptSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitleEn, setEditTitleEn] = useState('');
    const [editPriceAdd, setEditPriceAdd] = useState('');

    const [transferTiers, setTransferTiers] = useState<TransferTier[]>([]);
    const [transferSaving, setTransferSaving] = useState(false);
    const [seedLoading, setSeedLoading] = useState(false);
    const selectedTourType = tours.find((t) => t.id === dailyTourId)?.type ?? '';

    useEffect(() => {
        getTours().then((list) => {
            setTours(list.map((t) => ({ id: t.id, titleEn: t.titleEn, type: t.type, basePrice: t.basePrice })));
            if (list.length > 0 && !dailyTourId) setDailyTourId(list[0].id);
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        if (!dailyTourId) return;
        getTourById(dailyTourId).then((t) => {
            setOptions(t?.options ?? []);
            setTransferTiers(t?.transferTiers ?? []);
        });
    }, [dailyTourId]);

    const handleDailySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!dailyTourId || !dailyDate) return;
        setSaving(true);
        const result = await setTourDatePrice(dailyTourId, dailyDate, {
            price: dailyPrice,
            capacityOverride: dailyCapacity,
            isClosed: dailyClosed,
        });
        setSaving(false);
        if (result.ok) alert('Günlük fiyat güncellendi.');
        else alert(result.error);
    };

    const handleAddOption = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!dailyTourId || !optTitleEn.trim()) return;
        setOptSaving(true);
        const result = await createTourOption(dailyTourId, {
            titleTr: optTitleTr.trim() || optTitleEn.trim(),
            titleEn: optTitleEn.trim(),
            titleZh: optTitleZh.trim() || optTitleEn.trim(),
            priceAdd: parseFloat(optPriceAdd) || 0,
        });
        setOptSaving(false);
        if (result.ok) {
            setOptTitleTr('');
            setOptTitleEn('');
            setOptTitleZh('');
            setOptPriceAdd('');
            getTourById(dailyTourId).then((t) => setOptions(t?.options ?? []));
        } else alert(result.error);
    };

    const handleDeleteOption = async (id: string) => {
        if (!confirm('Bu opsiyonu silmek istediğinize emin misiniz?')) return;
        const result = await deleteTourOption(id);
        if (result.ok) getTourById(dailyTourId).then((t) => setOptions(t?.options ?? []));
        else alert(result.error);
    };

    const startEdit = (o: TourOptionRow) => {
        setEditingId(o.id);
        setEditTitleEn(o.titleEn);
        setEditPriceAdd(String(o.priceAdd));
    };
    const handleUpdateOption = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingId) return;
        const result = await updateTourOption(editingId, { titleEn: editTitleEn.trim(), priceAdd: parseFloat(editPriceAdd) || 0 });
        if (result.ok) {
            setEditingId(null);
            getTourById(dailyTourId).then((t) => setOptions(t?.options ?? []));
        } else alert(result.error);
    };

    const addTransferTier = () => setTransferTiers((prev) => [...prev, { minPax: 1, maxPax: 4, price: 50 }]);
    const updateTransferTier = (i: number, field: keyof TransferTier, value: number) => {
        setTransferTiers((prev) => prev.map((t, j) => (j === i ? { ...t, [field]: value } : t)));
    };
    const removeTransferTier = (i: number) => setTransferTiers((prev) => prev.filter((_, j) => j !== i));
    const handleSaveTransferTiers = async () => {
        if (!dailyTourId) return;
        setTransferSaving(true);
        const result = await setTourTransferTiers(dailyTourId, transferTiers);
        setTransferSaving(false);
        if (result.ok) alert('Transfer tiers saved.');
        else alert(result.error);
    };

    const handleSeedDemo = async () => {
        setSeedLoading(true);
        const result = await seedDemoTours();
        setSeedLoading(false);
        if (result.ok) {
            const list = await getTours();
            setTours(list.map((t) => ({ id: t.id, titleEn: t.titleEn, type: t.type, basePrice: t.basePrice })));
            if (list.length > 0) setDailyTourId(list[0].id);
        } else alert(result.error ?? 'Yüklenemedi');
    };

    if (loading) return <div className="loading-block">Turlar yükleniyor...</div>;

    return (
        <div>
            {tours.length === 0 && (
                <div className="card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)', backgroundColor: '#fef3c7', borderColor: '#f59e0b' }}>
                    <p style={{ margin: '0 0 var(--space-md)', fontWeight: 'bold' }}>Henüz tur yok.</p>
                    <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
                        Demo veri (Balon, Yeşil Tur, Transfer) eklemek için aşağıdaki butona tıklayın. İsterseniz terminalde <code style={{ background: 'rgba(0,0,0,0.06)', padding: '2px 6px', borderRadius: '4px' }}>npm run seed</code> da çalıştırabilirsiniz.
                    </p>
                    <Button onClick={handleSeedDemo} disabled={seedLoading} style={{ marginTop: 'var(--space-md)' }}>
                        {seedLoading ? 'Ekleniyor...' : 'Demo turları yükle'}
                    </Button>
                </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2xl)' }}>
                <h1>Turlar ve Fiyatlandırma Yönetimi</h1>
                <Button>Yeni Ürün Ekle</Button>
            </div>

            <form onSubmit={handleDailySubmit} className="card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-2xl)' }}>
                <h2 style={{ marginBottom: 'var(--space-lg)' }}>Günlük Fiyat / Kapasite / Gün Kapat</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', alignItems: 'end' }}>
                    <div style={{ flex: '1 1 120px' }}>
                        <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 'bold' }}>Tur</label>
                        <select
                            value={dailyTourId}
                            onChange={(e) => setDailyTourId(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                        >
                            {tours.map((t) => (
                                <option key={t.id} value={t.id}>{t.titleEn} ({t.type})</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ flex: '1 1 120px' }}>
                        <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 'bold' }}>Tarih</label>
                        <input
                            type="date"
                            value={dailyDate}
                            onChange={(e) => setDailyDate(e.target.value)}
                            required
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                        />
                    </div>
                    <div style={{ flex: '1 1 100px' }}>
                        <Input label="Fiyat (€)" type="number" name="price" value={String(dailyPrice)} onChange={(e) => setDailyPrice(Number(e.target.value))} />
                    </div>
                    <div style={{ flex: '1 1 100px' }}>
                        <Input label="Kapasite" type="number" name="capacity" value={String(dailyCapacity)} onChange={(e) => setDailyCapacity(Number(e.target.value))} />
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <input type="checkbox" checked={dailyClosed} onChange={(e) => setDailyClosed(e.target.checked)} />
                        <span>Bu günü kapat</span>
                    </label>
                    <Button type="submit" disabled={saving}>{saving ? 'Kaydediliyor...' : 'Güncelle'}</Button>
                </div>
            </form>

            <div className="card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-2xl)' }}>
                <h2 style={{ marginBottom: 'var(--space-lg)' }}>Tur Opsiyonları (ekstralar)</h2>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)', fontSize: '0.95rem' }}>
                    Yukarıdan bir tur seçin; ardından fiyat eklemeli opsiyonlar ekleyin veya düzenleyin (örn. &quot;Özel sepet&quot;, &quot;Fotoğraf paketi&quot;).
                </p>
                <form onSubmit={handleAddOption} style={{ marginBottom: 'var(--space-lg)' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)', alignItems: 'end' }}>
                        <div style={{ flex: '1 1 140px' }}>
                            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 'bold' }}>Tur</label>
                            <select
                                value={dailyTourId}
                                onChange={(e) => setDailyTourId(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                            >
                                {tours.map((t) => (
                                    <option key={t.id} value={t.id}>{t.titleEn} ({t.type})</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ flex: '1 1 120px' }}>
                            <Input label="Başlık (EN) *" value={optTitleEn} onChange={(e) => setOptTitleEn(e.target.value)} placeholder="e.g. Private basket" />
                        </div>
                        <div style={{ flex: '1 1 100px' }}>
                            <Input label="Ek fiyat (€)" type="number" step="0.01" value={optPriceAdd} onChange={(e) => setOptPriceAdd(e.target.value)} placeholder="0" />
                        </div>
                        <Button type="submit" disabled={optSaving}>{optSaving ? 'Ekleniyor...' : 'Opsiyon ekle'}</Button>
                    </div>
                </form>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                <th style={{ padding: 'var(--space-md)' }}>Başlık (EN)</th>
                                <th style={{ padding: 'var(--space-md)' }}>Ek fiyat</th>
                                <th style={{ padding: 'var(--space-md)' }}>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {options.map((o) => (
                                <tr key={o.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    {editingId === o.id ? (
                                        <>
                                            <td style={{ padding: 'var(--space-md)' }}>
                                                <form onSubmit={handleUpdateOption} style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
                                                    <Input label="Başlık" value={editTitleEn} onChange={(e) => setEditTitleEn(e.target.value)} style={{ flex: 1 }} />
                                                    <Input label="Fiyat" type="number" step="0.01" value={editPriceAdd} onChange={(e) => setEditPriceAdd(e.target.value)} style={{ width: '80px' }} />
                                                    <Button type="submit" style={{ padding: '4px 8px' }}>Kaydet</Button>
                                                    <Button type="button" variant="secondary" style={{ padding: '4px 8px' }} onClick={() => setEditingId(null)}>İptal</Button>
                                                </form>
                                            </td>
                                            <td colSpan={2} />
                                        </>
                                    ) : (
                                        <>
                                            <td style={{ padding: 'var(--space-md)' }}>{o.titleEn}</td>
                                            <td style={{ padding: 'var(--space-md)' }}>+€{o.priceAdd}</td>
                                            <td style={{ padding: 'var(--space-md)' }}>
                                                <Button variant="secondary" style={{ padding: '4px 8px', fontSize: '0.8rem', marginRight: 'var(--space-xs)' }} onClick={() => startEdit(o)}>Düzenle</Button>
                                                <Button variant="secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => handleDeleteOption(o.id)}>Sil</Button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {options.length === 0 && (
                        <p style={{ padding: 'var(--space-md)', color: 'var(--color-text-muted)' }}>Bu tur için opsiyon yok. Yukarıdan ekleyin.</p>
                    )}
                </div>
            </div>

            {selectedTourType === 'TRANSFER' && (
                <div className="card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-2xl)' }}>
                    <h2 style={{ marginBottom: 'var(--space-lg)' }}>Kişi sayısına göre transfer fiyatı</h2>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)', fontSize: '0.95rem' }}>
                        Yolcu sayısına göre fiyat kademeleri girin (örn. 1–4 kişi: €50, 5–8 kişi: €80). Müşteri kişi sayısı seçince sitede bu fiyat gösterilir.
                    </p>
                    <table style={{ width: '100%', maxWidth: 400, borderCollapse: 'collapse', marginBottom: 'var(--space-md)' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                <th style={{ padding: 'var(--space-sm)' }}>Min kişi</th>
                                <th style={{ padding: 'var(--space-sm)' }}>Max kişi</th>
                                <th style={{ padding: 'var(--space-sm)' }}>Fiyat (€)</th>
                                <th style={{ padding: 'var(--space-sm)' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {transferTiers.map((tier, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td style={{ padding: 'var(--space-sm)' }}>
                                        <input type="number" min={1} value={tier.minPax} onChange={(e) => updateTransferTier(i, 'minPax', parseInt(e.target.value, 10) || 1)} style={{ width: '60px', padding: '4px' }} />
                                    </td>
                                    <td style={{ padding: 'var(--space-sm)' }}>
                                        <input type="number" min={1} value={tier.maxPax} onChange={(e) => updateTransferTier(i, 'maxPax', parseInt(e.target.value, 10) || 1)} style={{ width: '60px', padding: '4px' }} />
                                    </td>
                                    <td style={{ padding: 'var(--space-sm)' }}>
                                        <input type="number" min={0} step={0.01} value={tier.price} onChange={(e) => updateTransferTier(i, 'price', parseFloat(e.target.value) || 0)} style={{ width: '70px', padding: '4px' }} />
                                    </td>
                                    <td style={{ padding: 'var(--space-sm)' }}>
                                        <button type="button" onClick={() => removeTransferTier(i)} style={{ padding: '2px 6px', fontSize: '0.8rem' }}>Kaldır</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                        <Button type="button" variant="secondary" onClick={addTransferTier}>Kademe ekle</Button>
                        <Button type="button" onClick={handleSaveTransferTiers} disabled={transferSaving}>{transferSaving ? 'Kaydediliyor...' : 'Transfer kademelerini kaydet'}</Button>
                    </div>
                </div>
            )}

            <h2>Ürün Kataloğu</h2>
            <div className="card" style={{ overflowX: 'auto', marginTop: 'var(--space-md)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                            <th style={{ padding: 'var(--space-md)' }}>ID</th>
                            <th style={{ padding: 'var(--space-md)' }}>Ürün Adı</th>
                            <th style={{ padding: 'var(--space-md)' }}>Tip</th>
                            <th style={{ padding: 'var(--space-md)' }}>Başlangıç Fiyatı</th>
                            <th style={{ padding: 'var(--space-md)' }}>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tours.length === 0 ? (
                            <tr><td colSpan={5} style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-text-muted)' }}>Tur yok. Veri eklemek için seed çalıştırın.</td></tr>
                        ) : (
                            tours.map((t) => (
                                <tr key={t.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td style={{ padding: 'var(--space-md)' }}>{t.id.slice(0, 8)}</td>
                                    <td style={{ padding: 'var(--space-md)', fontWeight: 'bold' }}>{t.titleEn}</td>
                                    <td style={{ padding: 'var(--space-md)' }}>
                                        <span style={{ backgroundColor: 'var(--color-bg-light)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>{t.type}</span>
                                    </td>
                                    <td style={{ padding: 'var(--space-md)' }}>€{t.basePrice}</td>
                                    <td style={{ padding: 'var(--space-md)' }}>
                                        <Button variant="secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }}>Düzenle</Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
