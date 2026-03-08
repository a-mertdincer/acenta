'use client';

import { useState, useEffect } from 'react';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { getTours, getTourById, setTourDatePrice, createTourOption, updateTourOption, deleteTourOption, setTourTransferAirportTiers, seedDemoTours, createTour, updateTour, type TourOptionRow, type TransferTier, type TourType } from '../../../actions/tours';
import { getDestinations, getCategoriesForDestination } from '@/lib/destinations';
import { getTourVariantsForAdmin, createVariant, updateVariant, deleteVariant, type CreateVariantInput } from '../../../actions/variants';
import type { TourVariantDisplay } from '@/lib/types/variant';

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

    const [transferTiersASR, setTransferTiersASR] = useState<TransferTier[]>([]);
    const [transferTiersNAV, setTransferTiersNAV] = useState<TransferTier[]>([]);
    const [transferSaving, setTransferSaving] = useState(false);
    const [seedLoading, setSeedLoading] = useState(false);

    const [showNewTourForm, setShowNewTourForm] = useState(false);
    const [createSaving, setCreateSaving] = useState(false);
    const [newType, setNewType] = useState<TourType>('TOUR');
    const [newTitleEn, setNewTitleEn] = useState('');
    const [newTitleTr, setNewTitleTr] = useState('');
    const [newTitleZh, setNewTitleZh] = useState('');
    const [newDescEn, setNewDescEn] = useState('');
    const [newDescTr, setNewDescTr] = useState('');
    const [newDescZh, setNewDescZh] = useState('');
    const [newBasePrice, setNewBasePrice] = useState('0');
    const [newCapacity, setNewCapacity] = useState('10');
    const [newDestination, setNewDestination] = useState('cappadocia');
    const [newCategory, setNewCategory] = useState('');

    const [editTourId, setEditTourId] = useState<string | null>(null);
    const [editSaving, setEditSaving] = useState(false);
    const [tourEditType, setTourEditType] = useState<TourType>('TOUR');
    const [tourEditTitleEn, setTourEditTitleEn] = useState('');
    const [tourEditTitleTr, setTourEditTitleTr] = useState('');
    const [tourEditTitleZh, setTourEditTitleZh] = useState('');
    const [tourEditDescEn, setTourEditDescEn] = useState('');
    const [tourEditDescTr, setTourEditDescTr] = useState('');
    const [tourEditDescZh, setTourEditDescZh] = useState('');
    const [tourEditBasePrice, setTourEditBasePrice] = useState('0');
    const [tourEditCapacity, setTourEditCapacity] = useState('10');
    const [tourEditDestination, setTourEditDestination] = useState('cappadocia');
    const [tourEditCategory, setTourEditCategory] = useState('');
    const [tourEditHasTourType, setTourEditHasTourType] = useState(false);
    const [tourEditHasAirportSelect, setTourEditHasAirportSelect] = useState(false);
    const [variants, setVariants] = useState<TourVariantDisplay[]>([]);
    const [variantSaving, setVariantSaving] = useState(false);
    const [showAddVariant, setShowAddVariant] = useState(false);
    const [newVariant, setNewVariant] = useState<Partial<CreateVariantInput>>({
        tourType: null, reservationType: 'regular', airport: null,
        titleEn: '', titleTr: '', titleZh: '', descEn: '', descTr: '', descZh: '',
        includes: [], excludes: [], duration: null, languages: null, vehicleType: null, maxGroupSize: null, routeStops: null,
        adultPrice: 0, childPrice: null, pricingType: 'per_person', sortOrder: 0, isActive: true, isRecommended: false,
    });

    const selectedTourType = tours.find((t) => t.id === dailyTourId)?.type ?? '';
    const destinations = getDestinations();
    const createCategories = getCategoriesForDestination(newDestination);
    const editCategories = getCategoriesForDestination(tourEditDestination);

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
            setTransferTiersASR(t?.transferAirportTiers?.ASR ?? t?.transferTiers ?? []);
            setTransferTiersNAV(t?.transferAirportTiers?.NAV ?? []);
        });
    }, [dailyTourId]);

    useEffect(() => {
        if (!editTourId) return;
        getTourById(editTourId).then((t) => {
            if (!t) return;
            const rec = t as { destination?: string; category?: string | null; hasTourType?: boolean; hasAirportSelect?: boolean };
            setTourEditType(t.type as TourType);
            setTourEditDestination(rec.destination ?? 'cappadocia');
            setTourEditCategory(rec.category ?? '');
            setTourEditTitleEn(t.titleEn);
            setTourEditTitleTr(t.titleTr);
            setTourEditTitleZh(t.titleZh);
            setTourEditDescEn(t.descEn);
            setTourEditDescTr(t.descTr);
            setTourEditDescZh(t.descZh);
            setTourEditBasePrice(String(t.basePrice));
            setTourEditCapacity(String(t.capacity));
            setTourEditHasTourType(Boolean(rec.hasTourType));
            setTourEditHasAirportSelect(Boolean(rec.hasAirportSelect));
        });
        getTourVariantsForAdmin(editTourId).then(setVariants);
    }, [editTourId]);

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

    const addTransferTier = (airport: 'ASR' | 'NAV') => {
        if (airport === 'ASR') setTransferTiersASR((prev) => [...prev, { minPax: 1, maxPax: 4, price: 50 }]);
        else setTransferTiersNAV((prev) => [...prev, { minPax: 1, maxPax: 4, price: 50 }]);
    };
    const updateTransferTier = (airport: 'ASR' | 'NAV', i: number, field: keyof TransferTier, value: number) => {
        if (airport === 'ASR') setTransferTiersASR((prev) => prev.map((t, j) => (j === i ? { ...t, [field]: value } : t)));
        else setTransferTiersNAV((prev) => prev.map((t, j) => (j === i ? { ...t, [field]: value } : t)));
    };
    const removeTransferTier = (airport: 'ASR' | 'NAV', i: number) => {
        if (airport === 'ASR') setTransferTiersASR((prev) => prev.filter((_, j) => j !== i));
        else setTransferTiersNAV((prev) => prev.filter((_, j) => j !== i));
    };
    const handleSaveTransferTiers = async () => {
        if (!dailyTourId) return;
        setTransferSaving(true);
        const result = await setTourTransferAirportTiers(dailyTourId, { ASR: transferTiersASR, NAV: transferTiersNAV });
        setTransferSaving(false);
        if (result.ok) alert('ASR ve NAV transfer fiyatları kaydedildi.');
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

    const handleCreateTour = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitleEn.trim()) {
            alert('Ürün adı (EN) zorunludur.');
            return;
        }
        setCreateSaving(true);
        const result = await createTour({
            type: newType,
            titleEn: newTitleEn.trim(),
            titleTr: newTitleTr.trim() || newTitleEn.trim(),
            titleZh: newTitleZh.trim() || newTitleEn.trim(),
            descEn: newDescEn.trim() || '-',
            descTr: newDescTr.trim() || '-',
            descZh: newDescZh.trim() || '-',
            basePrice: parseFloat(newBasePrice) || 0,
            capacity: parseInt(newCapacity, 10) || 0,
            destination: newDestination,
            category: newCategory || null,
        });
        setCreateSaving(false);
        if (result.ok) {
            const list = await getTours();
            setTours(list.map((t) => ({ id: t.id, titleEn: t.titleEn, type: t.type, basePrice: t.basePrice })));
            if (list.length > 0) setDailyTourId(list[list.length - 1].id);
            setShowNewTourForm(false);
            setNewTitleEn('');
            setNewTitleTr('');
            setNewTitleZh('');
            setNewDescEn('');
            setNewDescTr('');
            setNewDescZh('');
            setNewBasePrice('0');
            setNewCapacity('10');
        } else alert(result.error ?? 'Tur eklenemedi');
    };

    const handleUpdateTour = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editTourId || !tourEditTitleEn.trim()) {
            alert('Ürün adı (EN) zorunludur.');
            return;
        }
        setEditSaving(true);
        const result = await updateTour(editTourId, {
            type: tourEditType,
            titleEn: tourEditTitleEn.trim(),
            titleTr: tourEditTitleTr.trim() || tourEditTitleEn.trim(),
            titleZh: tourEditTitleZh.trim() || tourEditTitleEn.trim(),
            descEn: tourEditDescEn.trim() || '-',
            destination: tourEditDestination,
            category: tourEditCategory || null,
            descTr: tourEditDescTr.trim() || '-',
            descZh: tourEditDescZh.trim() || '-',
            basePrice: parseFloat(tourEditBasePrice) || 0,
            capacity: parseInt(tourEditCapacity, 10) || 0,
            hasTourType: tourEditHasTourType,
            hasAirportSelect: tourEditHasAirportSelect,
        });
        setEditSaving(false);
        if (result.ok) {
            const list = await getTours();
            setTours(list.map((t) => ({ id: t.id, titleEn: t.titleEn, type: t.type, basePrice: t.basePrice })));
            setEditTourId(null);
        } else alert(result.error ?? 'Tur güncellenemedi');
    };

    const handleCreateVariant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editTourId || !newVariant.titleEn?.trim()) {
            alert('Varyant başlığı (EN) zorunludur.');
            return;
        }
        setVariantSaving(true);
        const includes = typeof newVariant.includes === 'string' ? (newVariant.includes as string).split('\n').map((s) => s.trim()).filter(Boolean) : (newVariant.includes ?? []);
        const excludes = typeof newVariant.excludes === 'string' ? (newVariant.excludes as string).split('\n').map((s) => s.trim()).filter(Boolean) : (newVariant.excludes ?? []);
        const routeStops = typeof newVariant.routeStops === 'string' ? (newVariant.routeStops as string).split(',').map((s) => s.trim()).filter(Boolean) : (newVariant.routeStops ?? []);
        const result = await createVariant({
            tourId: editTourId,
            tourType: newVariant.tourType ?? null,
            reservationType: newVariant.reservationType ?? 'regular',
            airport: newVariant.airport ?? null,
            titleEn: newVariant.titleEn!.trim(),
            titleTr: (newVariant.titleTr ?? '').trim() || newVariant.titleEn!.trim(),
            titleZh: (newVariant.titleZh ?? '').trim() || newVariant.titleEn!.trim(),
            descEn: (newVariant.descEn ?? '').trim(),
            descTr: (newVariant.descTr ?? '').trim(),
            descZh: (newVariant.descZh ?? '').trim(),
            includes,
            excludes,
            duration: (newVariant.duration as string)?.trim() || null,
            languages: newVariant.languages ?? null,
            vehicleType: (newVariant.vehicleType as string)?.trim() || null,
            maxGroupSize: newVariant.maxGroupSize ?? null,
            routeStops: routeStops.length ? routeStops : null,
            adultPrice: Number(newVariant.adultPrice) || 0,
            childPrice: newVariant.childPrice != null && newVariant.childPrice !== '' ? Number(newVariant.childPrice) : null,
            pricingType: (newVariant.pricingType as 'per_person' | 'per_vehicle') || 'per_person',
            sortOrder: variants.length,
            isActive: newVariant.isActive !== false,
            isRecommended: Boolean(newVariant.isRecommended),
        });
        setVariantSaving(false);
        if (result.ok) {
            getTourVariantsForAdmin(editTourId!).then(setVariants);
            setShowAddVariant(false);
            setNewVariant({ tourType: null, reservationType: 'regular', airport: null, titleEn: '', titleTr: '', titleZh: '', descEn: '', descTr: '', descZh: '', includes: [], excludes: [], duration: null, languages: null, vehicleType: null, maxGroupSize: null, routeStops: null, adultPrice: 0, childPrice: null, pricingType: 'per_person', sortOrder: variants.length, isActive: true, isRecommended: false });
        } else alert(result.error);
    };

    const handleDeleteVariant = async (variantId: string) => {
        if (!confirm('Bu varyantı silmek istediğinize emin misiniz?')) return;
        const result = await deleteVariant(variantId);
        if (result.ok && editTourId) getTourVariantsForAdmin(editTourId).then(setVariants);
        else if (!result.ok) alert(result.error);
    };

    const openEditTour = (tourId: string) => {
        setEditTourId(tourId);
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
                <Button onClick={() => setShowNewTourForm((v) => !v)}>
                    {showNewTourForm ? 'Formu kapat' : 'Yeni Ürün Ekle'}
                </Button>
            </div>

            {showNewTourForm && (
                <form onSubmit={handleCreateTour} className="card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-2xl)' }}>
                    <h2 style={{ marginBottom: 'var(--space-lg)' }}>Yeni tur / ürün ekle</h2>
                    <div style={{ display: 'grid', gap: 'var(--space-md)', maxWidth: 560 }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 'bold' }}>Tip</label>
                            <select
                                value={newType}
                                onChange={(e) => setNewType(e.target.value as TourType)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                            >
                                <option value="BALLOON">BALLOON</option>
                                <option value="TOUR">TOUR</option>
                                <option value="TRANSFER">TRANSFER</option>
                                <option value="CONCIERGE">CONCIERGE</option>
                                <option value="PACKAGE">PACKAGE</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 'bold' }}>Destinasyon</label>
                            <select value={newDestination} onChange={(e) => { setNewDestination(e.target.value); setNewCategory(''); }} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                                {destinations.map((d) => (
                                    <option key={d.id} value={d.slug}>{d.nameTr}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 'bold' }}>Kategori</label>
                            <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                                <option value="">— Seçin —</option>
                                {createCategories.map((c) => (
                                    <option key={c.id} value={c.slug}>{c.labelTr}</option>
                                ))}
                            </select>
                        </div>
                        <Input label="Başlık (EN) *" value={newTitleEn} onChange={(e) => setNewTitleEn(e.target.value)} placeholder="e.g. Green Tour" required />
                        <Input label="Başlık (TR)" value={newTitleTr} onChange={(e) => setNewTitleTr(e.target.value)} placeholder="e.g. Yeşil Tur" />
                        <Input label="Başlık (ZH)" value={newTitleZh} onChange={(e) => setNewTitleZh(e.target.value)} placeholder="e.g. 绿线之旅" />
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 'bold' }}>Açıklama (EN)</label>
                            <textarea value={newDescEn} onChange={(e) => setNewDescEn(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }} placeholder="Kısa açıklama" />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 'bold' }}>Açıklama (TR)</label>
                            <textarea value={newDescTr} onChange={(e) => setNewDescTr(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 'bold' }}>Açıklama (ZH)</label>
                            <textarea value={newDescZh} onChange={(e) => setNewDescZh(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }} />
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                            <Input label="Başlangıç fiyatı (€)" type="number" step="0.01" value={newBasePrice} onChange={(e) => setNewBasePrice(e.target.value)} />
                            <Input label="Kapasite" type="number" min={1} value={newCapacity} onChange={(e) => setNewCapacity(e.target.value)} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
                        <Button type="submit" disabled={createSaving}>{createSaving ? 'Ekleniyor...' : 'Ürünü ekle'}</Button>
                        <Button type="button" variant="secondary" onClick={() => setShowNewTourForm(false)}>İptal</Button>
                    </div>
                </form>
            )}

            {editTourId && (
                <form onSubmit={handleUpdateTour} className="card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-2xl)' }}>
                    <h2 style={{ marginBottom: 'var(--space-lg)' }}>Ürünü düzenle</h2>
                    <div style={{ display: 'grid', gap: 'var(--space-md)', maxWidth: 560 }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 'bold' }}>Tip</label>
                            <select
                                value={tourEditType}
                                onChange={(e) => setTourEditType(e.target.value as TourType)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                            >
                                <option value="BALLOON">BALLOON</option>
                                <option value="TOUR">TOUR</option>
                                <option value="TRANSFER">TRANSFER</option>
                                <option value="CONCIERGE">CONCIERGE</option>
                                <option value="PACKAGE">PACKAGE</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 'bold' }}>Destinasyon</label>
                            <select value={tourEditDestination} onChange={(e) => { setTourEditDestination(e.target.value); setTourEditCategory(''); }} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                                {destinations.map((d) => (
                                    <option key={d.id} value={d.slug}>{d.nameTr}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 'bold' }}>Kategori</label>
                            <select value={tourEditCategory} onChange={(e) => setTourEditCategory(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                                <option value="">— Seçin —</option>
                                {editCategories.map((c) => (
                                    <option key={c.id} value={c.slug}>{c.labelTr}</option>
                                ))}
                            </select>
                        </div>
                        <Input label="Başlık (EN) *" value={tourEditTitleEn} onChange={(e) => setTourEditTitleEn(e.target.value)} placeholder="e.g. Green Tour" required />
                        <Input label="Başlık (TR)" value={tourEditTitleTr} onChange={(e) => setTourEditTitleTr(e.target.value)} placeholder="e.g. Yeşil Tur" />
                        <Input label="Başlık (ZH)" value={tourEditTitleZh} onChange={(e) => setTourEditTitleZh(e.target.value)} placeholder="e.g. 绿线之旅" />
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 'bold' }}>Açıklama (EN)</label>
                            <textarea value={tourEditDescEn} onChange={(e) => setTourEditDescEn(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }} placeholder="Kısa açıklama" />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 'bold' }}>Açıklama (TR)</label>
                            <textarea value={tourEditDescTr} onChange={(e) => setTourEditDescTr(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 'bold' }}>Açıklama (ZH)</label>
                            <textarea value={tourEditDescZh} onChange={(e) => setTourEditDescZh(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }} />
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                            <Input label="Başlangıç fiyatı (€)" type="number" step="0.01" value={tourEditBasePrice} onChange={(e) => setTourEditBasePrice(e.target.value)} />
                            <Input label="Kapasite" type="number" min={1} value={tourEditCapacity} onChange={(e) => setTourEditCapacity(e.target.value)} />
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <input type="checkbox" checked={tourEditHasTourType} onChange={(e) => setTourEditHasTourType(e.target.checked)} />
                            <span>Eco/Plus (Tur Tipi) seçeneği var</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <input type="checkbox" checked={tourEditHasAirportSelect} onChange={(e) => setTourEditHasAirportSelect(e.target.checked)} />
                            <span>Havalimanı (NAV/ASR) seçeneği var</span>
                        </label>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
                        <Button type="submit" disabled={editSaving}>{editSaving ? 'Kaydediliyor...' : 'Kaydet'}</Button>
                        <Button type="button" variant="secondary" onClick={() => setEditTourId(null)}>İptal</Button>
                    </div>
                </form>
            )}

            {editTourId && (
                <div className="card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-2xl)' }}>
                    <h2 style={{ marginBottom: 'var(--space-lg)' }}>Varyantlar</h2>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)', fontSize: '0.95rem' }}>
                        Bu ürün için Eco/Plus, Regular/Private veya Havalimanı varyantları. Müşteri ürün sayfasında tek kart içinde seçim yapar.
                    </p>
                    <Button type="button" variant="secondary" style={{ marginBottom: 'var(--space-lg)' }} onClick={() => setShowAddVariant((v) => !v)}>
                        {showAddVariant ? 'Formu kapat' : '+ Yeni varyant ekle'}
                    </Button>
                    {showAddVariant && (
                        <form onSubmit={handleCreateVariant} style={{ marginBottom: 'var(--space-xl)', padding: 'var(--space-lg)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                            <h3 style={{ marginBottom: 'var(--space-md)' }}>Yeni varyant</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Tur tipi</label>
                                    <select value={newVariant.tourType ?? ''} onChange={(e) => setNewVariant((v) => ({ ...v, tourType: e.target.value || null }))} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                                        <option value="">— Yok (aktiviteler/transfer) —</option>
                                        <option value="eco">Eco</option>
                                        <option value="plus">Plus</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Rezervasyon tipi</label>
                                    <select value={newVariant.reservationType ?? 'regular'} onChange={(e) => setNewVariant((v) => ({ ...v, reservationType: e.target.value }))} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                                        <option value="regular">Regular (Paylaşımlı)</option>
                                        <option value="private">Private (Özel)</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Havalimanı</label>
                                    <select value={newVariant.airport ?? ''} onChange={(e) => setNewVariant((v) => ({ ...v, airport: e.target.value || null }))} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                                        <option value="">— Yok —</option>
                                        <option value="NAV">NAV (Nevşehir)</option>
                                        <option value="ASR">ASR (Kayseri)</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Fiyat tipi</label>
                                    <select value={newVariant.pricingType ?? 'per_person'} onChange={(e) => setNewVariant((v) => ({ ...v, pricingType: e.target.value as 'per_person' | 'per_vehicle' }))} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                                        <option value="per_person">Kişi başı</option>
                                        <option value="per_vehicle">Araç başı</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                                <Input label="Başlık (EN) *" value={newVariant.titleEn ?? ''} onChange={(e) => setNewVariant((v) => ({ ...v, titleEn: e.target.value }))} placeholder="e.g. Regular Eco Green Tour" />
                                <Input label="Başlık (TR)" value={newVariant.titleTr ?? ''} onChange={(e) => setNewVariant((v) => ({ ...v, titleTr: e.target.value }))} />
                                <Input label="Başlık (ZH)" value={newVariant.titleZh ?? ''} onChange={(e) => setNewVariant((v) => ({ ...v, titleZh: e.target.value }))} />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                                    <Input label="Yetişkin fiyatı (€)" type="number" step="0.01" value={String(newVariant.adultPrice ?? 0)} onChange={(e) => setNewVariant((v) => ({ ...v, adultPrice: parseFloat(e.target.value) || 0 }))} />
                                    <Input label="Çocuk fiyatı (€, boş = yetişkin ile aynı)" type="number" step="0.01" value={newVariant.childPrice != null ? String(newVariant.childPrice) : ''} onChange={(e) => setNewVariant((v) => ({ ...v, childPrice: e.target.value === '' ? null : parseFloat(e.target.value) }))} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Açıklama (EN)</label>
                                    <textarea value={newVariant.descEn ?? ''} onChange={(e) => setNewVariant((v) => ({ ...v, descEn: e.target.value }))} rows={3} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Dahil (her satıra bir madde)</label>
                                    <textarea value={Array.isArray(newVariant.includes) ? newVariant.includes.join('\n') : (newVariant.includes as string) ?? ''} onChange={(e) => setNewVariant((v) => ({ ...v, includes: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) }))} rows={2} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }} placeholder="Klimalı araç&#10;Rehber" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Hariç (her satıra bir madde)</label>
                                    <textarea value={Array.isArray(newVariant.excludes) ? newVariant.excludes.join('\n') : (newVariant.excludes as string) ?? ''} onChange={(e) => setNewVariant((v) => ({ ...v, excludes: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) }))} rows={2} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }} />
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                                    <Input label="Süre" value={newVariant.duration ?? ''} onChange={(e) => setNewVariant((v) => ({ ...v, duration: e.target.value }))} placeholder="4 saat" style={{ flex: 1 }} />
                                    <Input label="Max grup" type="number" min={1} value={String(newVariant.maxGroupSize ?? '')} onChange={(e) => setNewVariant((v) => ({ ...v, maxGroupSize: e.target.value === '' ? null : parseInt(e.target.value, 10) }))} placeholder="12" style={{ width: '80px' }} />
                                </div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <input type="checkbox" checked={newVariant.isRecommended ?? false} onChange={(e) => setNewVariant((v) => ({ ...v, isRecommended: e.target.checked }))} />
                                    <span>Önerilen</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <input type="checkbox" checked={newVariant.isActive !== false} onChange={(e) => setNewVariant((v) => ({ ...v, isActive: e.target.checked }))} />
                                    <span>Aktif</span>
                                </label>
                            </div>
                            <Button type="submit" disabled={variantSaving}>{variantSaving ? 'Ekleniyor...' : 'Varyant ekle'}</Button>
                        </form>
                    )}
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                    <th style={{ padding: 'var(--space-md)' }}>Başlık (EN)</th>
                                    <th style={{ padding: 'var(--space-md)' }}>Tip</th>
                                    <th style={{ padding: 'var(--space-md)' }}>Fiyat</th>
                                    <th style={{ padding: 'var(--space-md)' }}>İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {variants.length === 0 ? (
                                    <tr><td colSpan={4} style={{ padding: 'var(--space-md)', color: 'var(--color-text-muted)' }}>Varyant yok. Yukarıdan ekleyin.</td></tr>
                                ) : (
                                    variants.map((v) => (
                                        <tr key={v.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                            <td style={{ padding: 'var(--space-md)' }}>{v.titleEn}</td>
                                            <td style={{ padding: 'var(--space-md)' }}>
                                                {[v.tourType, v.reservationType, v.airport].filter(Boolean).join(' / ') || '—'}
                                            </td>
                                            <td style={{ padding: 'var(--space-md)' }}>€{v.adultPrice} {v.pricingType === 'per_vehicle' ? '(araç)' : '(kişi)'}</td>
                                            <td style={{ padding: 'var(--space-md)' }}>
                                                <Button type="button" variant="secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => handleDeleteVariant(v.id)}>Sil</Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

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
                    <h2 style={{ marginBottom: 'var(--space-lg)' }}>Havalimanına göre transfer fiyatı (ASR / NAV)</h2>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-lg)', fontSize: '0.95rem' }}>
                        ASR (Kayseri) ve NAV (Nevşehir) için ayrı ayrı kişi sayısı kademeleri girin. Müşteri ürün sayfasında havalimanı seçince ilgili fiyat gösterilir.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2xl)' }}>
                        <div>
                            <h3 style={{ marginBottom: 'var(--space-md)' }}>ASR (Kayseri Havalimanı)</h3>
                            <table style={{ width: '100%', maxWidth: 360, borderCollapse: 'collapse', marginBottom: 'var(--space-md)' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                        <th style={{ padding: 'var(--space-sm)' }}>Min kişi</th>
                                        <th style={{ padding: 'var(--space-sm)' }}>Max kişi</th>
                                        <th style={{ padding: 'var(--space-sm)' }}>Fiyat (€)</th>
                                        <th style={{ padding: 'var(--space-sm)' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transferTiersASR.map((tier, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                            <td style={{ padding: 'var(--space-sm)' }}>
                                                <input type="number" min={1} value={tier.minPax} onChange={(e) => updateTransferTier('ASR', i, 'minPax', parseInt(e.target.value, 10) || 1)} style={{ width: '60px', padding: '4px' }} />
                                            </td>
                                            <td style={{ padding: 'var(--space-sm)' }}>
                                                <input type="number" min={1} value={tier.maxPax} onChange={(e) => updateTransferTier('ASR', i, 'maxPax', parseInt(e.target.value, 10) || 1)} style={{ width: '60px', padding: '4px' }} />
                                            </td>
                                            <td style={{ padding: 'var(--space-sm)' }}>
                                                <input type="number" min={0} step={0.01} value={tier.price} onChange={(e) => updateTransferTier('ASR', i, 'price', parseFloat(e.target.value) || 0)} style={{ width: '70px', padding: '4px' }} />
                                            </td>
                                            <td style={{ padding: 'var(--space-sm)' }}>
                                                <button type="button" onClick={() => removeTransferTier('ASR', i)} style={{ padding: '2px 6px', fontSize: '0.8rem' }}>Kaldır</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <Button type="button" variant="secondary" style={{ marginBottom: 'var(--space-lg)' }} onClick={() => addTransferTier('ASR')}>ASR kademe ekle</Button>
                        </div>
                        <div>
                            <h3 style={{ marginBottom: 'var(--space-md)' }}>NAV (Nevşehir Havalimanı)</h3>
                            <table style={{ width: '100%', maxWidth: 360, borderCollapse: 'collapse', marginBottom: 'var(--space-md)' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                        <th style={{ padding: 'var(--space-sm)' }}>Min kişi</th>
                                        <th style={{ padding: 'var(--space-sm)' }}>Max kişi</th>
                                        <th style={{ padding: 'var(--space-sm)' }}>Fiyat (€)</th>
                                        <th style={{ padding: 'var(--space-sm)' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transferTiersNAV.map((tier, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                            <td style={{ padding: 'var(--space-sm)' }}>
                                                <input type="number" min={1} value={tier.minPax} onChange={(e) => updateTransferTier('NAV', i, 'minPax', parseInt(e.target.value, 10) || 1)} style={{ width: '60px', padding: '4px' }} />
                                            </td>
                                            <td style={{ padding: 'var(--space-sm)' }}>
                                                <input type="number" min={1} value={tier.maxPax} onChange={(e) => updateTransferTier('NAV', i, 'maxPax', parseInt(e.target.value, 10) || 1)} style={{ width: '60px', padding: '4px' }} />
                                            </td>
                                            <td style={{ padding: 'var(--space-sm)' }}>
                                                <input type="number" min={0} step={0.01} value={tier.price} onChange={(e) => updateTransferTier('NAV', i, 'price', parseFloat(e.target.value) || 0)} style={{ width: '70px', padding: '4px' }} />
                                            </td>
                                            <td style={{ padding: 'var(--space-sm)' }}>
                                                <button type="button" onClick={() => removeTransferTier('NAV', i)} style={{ padding: '2px 6px', fontSize: '0.8rem' }}>Kaldır</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <Button type="button" variant="secondary" style={{ marginBottom: 'var(--space-lg)' }} onClick={() => addTransferTier('NAV')}>NAV kademe ekle</Button>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                        <Button type="button" onClick={handleSaveTransferTiers} disabled={transferSaving}>{transferSaving ? 'Kaydediliyor...' : 'ASR ve NAV fiyatlarını kaydet'}</Button>
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
                                        <Button variant="secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => openEditTour(t.id)}>Düzenle</Button>
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
