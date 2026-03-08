'use client';

import { useState, useEffect } from 'react';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { getFlightsForAdmin, createFlight, updateFlight, deleteFlight, type CreateFlightInput } from '../../../actions/flights';

export default function AdminFlightsPage() {
    const [flights, setFlights] = useState<Awaited<ReturnType<typeof getFlightsForAdmin>>>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<CreateFlightInput>({
        code: '',
        airline: '',
        airport: 'NAV',
        direction: 'arrival',
        estimatedTime: '',
        sortOrder: 0,
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<CreateFlightInput & { isActive?: boolean }>({
        code: '', airline: '', airport: 'NAV', direction: 'arrival', estimatedTime: '', sortOrder: 0, isActive: true,
    });

    const load = () => getFlightsForAdmin().then((list) => { setFlights(list); setLoading(false); });

    useEffect(() => {
        load();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.code.trim() || !form.airline.trim() || !form.estimatedTime.trim()) {
            alert('Kod, havayolu ve tahmini saat zorunludur.');
            return;
        }
        setSaving(true);
        const result = await createFlight(form);
        setSaving(false);
        if (result.ok) {
            load();
            setShowForm(false);
            setForm({ code: '', airline: '', airport: 'NAV', direction: 'arrival', estimatedTime: '', sortOrder: flights.length });
        } else alert(result.error);
    };

    const startEdit = (f: typeof flights[0]) => {
        setEditingId(f.id);
        setEditForm({ code: f.code, airline: f.airline, airport: f.airport, direction: f.direction, estimatedTime: f.estimatedTime, sortOrder: f.sortOrder, isActive: f.isActive });
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingId) return;
        setSaving(true);
        const result = await updateFlight(editingId, editForm);
        setSaving(false);
        if (result.ok) {
            load();
            setEditingId(null);
        } else alert(result.error);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bu uçuşu silmek istediğinize emin misiniz?')) return;
        const result = await deleteFlight(id);
        if (result.ok) load();
        else alert(result.error);
    };

    if (loading) return <div className="loading-block">Uçuşlar yükleniyor...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2xl)' }}>
                <h1>Uçuş Listesi (Transfer)</h1>
                <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'Formu kapat' : '+ Uçuş ekle'}</Button>
            </div>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-lg)' }}>
                Transfer rezervasyonunda müşteriye gösterilecek varış/kalkış uçuşları. Havalimanı (NAV/ASR) ve yön (arrival/departure) ile filtrelenir.
            </p>

            {showForm && (
                <form onSubmit={handleCreate} className="card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-2xl)' }}>
                    <h2 style={{ marginBottom: 'var(--space-lg)' }}>Yeni uçuş</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                        <Input label="Kod *" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="TK 2000" />
                        <Input label="Havayolu *" value={form.airline} onChange={(e) => setForm((f) => ({ ...f, airline: e.target.value }))} placeholder="Turkish Airlines" />
                        <Input label="Tahmini saat *" value={form.estimatedTime} onChange={(e) => setForm((f) => ({ ...f, estimatedTime: e.target.value }))} placeholder="08:45" />
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Havalimanı</label>
                            <select value={form.airport} onChange={(e) => setForm((f) => ({ ...f, airport: e.target.value }))} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                                <option value="NAV">NAV (Nevşehir)</option>
                                <option value="ASR">ASR (Kayseri)</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Yön</label>
                            <select value={form.direction} onChange={(e) => setForm((f) => ({ ...f, direction: e.target.value }))} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                                <option value="arrival">Varış (arrival)</option>
                                <option value="departure">Kalkış (departure)</option>
                            </select>
                        </div>
                        <Input label="Sıra" type="number" value={String(form.sortOrder ?? 0)} onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value, 10) || 0 }))} />
                    </div>
                    <Button type="submit" disabled={saving}>{saving ? 'Ekleniyor...' : 'Uçuş ekle'}</Button>
                </form>
            )}

            <div className="card" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                            <th style={{ padding: 'var(--space-md)' }}>Kod</th>
                            <th style={{ padding: 'var(--space-md)' }}>Havayolu</th>
                            <th style={{ padding: 'var(--space-md)' }}>Havalimanı</th>
                            <th style={{ padding: 'var(--space-md)' }}>Yön</th>
                            <th style={{ padding: 'var(--space-md)' }}>Saat</th>
                            <th style={{ padding: 'var(--space-md)' }}>Aktif</th>
                            <th style={{ padding: 'var(--space-md)' }}>İşlem</th>
                        </tr>
                    </thead>
                    <tbody>
                        {flights.length === 0 ? (
                            <tr><td colSpan={7} style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-text-muted)' }}>Uçuş yok. Yukarıdan ekleyin.</td></tr>
                        ) : (
                            flights.map((f) => (
                                <tr key={f.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    {editingId === f.id ? (
                                        <>
                                            <td colSpan={6} style={{ padding: 'var(--space-md)' }}>
                                                <form onSubmit={handleUpdate} style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)', alignItems: 'center' }}>
                                                    <Input label="Kod" value={editForm.code} onChange={(e) => setEditForm((x) => ({ ...x, code: e.target.value }))} style={{ width: '90px' }} />
                                                    <Input label="Havayolu" value={editForm.airline} onChange={(e) => setEditForm((x) => ({ ...x, airline: e.target.value }))} style={{ width: '140px' }} />
                                                    <select value={editForm.airport} onChange={(e) => setEditForm((x) => ({ ...x, airport: e.target.value }))} style={{ padding: '6px', borderRadius: '4px' }}>
                                                        <option value="NAV">NAV</option>
                                                        <option value="ASR">ASR</option>
                                                    </select>
                                                    <select value={editForm.direction} onChange={(e) => setEditForm((x) => ({ ...x, direction: e.target.value }))} style={{ padding: '6px', borderRadius: '4px' }}>
                                                        <option value="arrival">Varış</option>
                                                        <option value="departure">Kalkış</option>
                                                    </select>
                                                    <Input label="Saat" value={editForm.estimatedTime} onChange={(e) => setEditForm((x) => ({ ...x, estimatedTime: e.target.value }))} style={{ width: '70px' }} />
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <input type="checkbox" checked={editForm.isActive !== false} onChange={(e) => setEditForm((x) => ({ ...x, isActive: e.target.checked }))} />
                                                        Aktif
                                                    </label>
                                                    <Button type="submit" style={{ padding: '4px 8px' }} disabled={saving}>Kaydet</Button>
                                                    <Button type="button" variant="secondary" style={{ padding: '4px 8px' }} onClick={() => setEditingId(null)}>İptal</Button>
                                                </form>
                                            </td>
                                            <td />
                                        </>
                                    ) : (
                                        <>
                                            <td style={{ padding: 'var(--space-md)' }}>{f.code}</td>
                                            <td style={{ padding: 'var(--space-md)' }}>{f.airline}</td>
                                            <td style={{ padding: 'var(--space-md)' }}>{f.airport}</td>
                                            <td style={{ padding: 'var(--space-md)' }}>{f.direction}</td>
                                            <td style={{ padding: 'var(--space-md)' }}>{f.estimatedTime}</td>
                                            <td style={{ padding: 'var(--space-md)' }}>{f.isActive ? 'Evet' : 'Hayır'}</td>
                                            <td style={{ padding: 'var(--space-md)' }}>
                                                <Button variant="secondary" style={{ padding: '4px 8px', fontSize: '0.8rem', marginRight: 'var(--space-xs)' }} onClick={() => startEdit(f)}>Düzenle</Button>
                                                <Button variant="secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => handleDelete(f.id)}>Sil</Button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
