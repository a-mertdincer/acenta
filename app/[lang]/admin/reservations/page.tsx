'use client';

import { useState, useEffect } from 'react';
import { Button } from '../../../components/Button';
import { getReservations, updateReservationStatus, sendReservationConfirmationEmail, updateReservationDeposit } from '../../../actions/reservations';

interface ResRow {
    id: string;
    customer: string;
    tour: string;
    date: string;
    pax: number;
    total: string;
    totalPrice: number;
    status: string;
    depositPaid: number;
}

export default function AdminReservationsPage() {
    const [reservations, setReservations] = useState<ResRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

    useEffect(() => {
        getReservations().then((list) => {
            setReservations(list.map((r: { id: string; guestName: string; tourId: string; tour?: { titleEn: string } | null; date: Date; pax: number; totalPrice: number; status: string; depositPaid?: number }) => ({
                id: r.id,
                customer: r.guestName,
                tour: r.tour?.titleEn ?? r.tourId,
                date: r.date.toISOString().split('T')[0],
                pax: r.pax,
                total: `€${r.totalPrice}`,
                totalPrice: r.totalPrice,
                status: r.status,
                depositPaid: r.depositPaid ?? 0,
            })));
            setLoading(false);
        });
    }, []);

    const handleStatusChange = async (id: string, newStatus: string) => {
        const result = await updateReservationStatus(id, newStatus);
        if (result.ok) setReservations(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    };

    const handleSendConfirmation = async (id: string) => {
        setSendingEmailId(id);
        const result = await sendReservationConfirmationEmail(id);
        setSendingEmailId(null);
        if (result.ok) alert('Onay e-postası gönderildi.');
        else alert(result.error ?? 'Gönderilemedi');
    };

    const [depositEditId, setDepositEditId] = useState<string | null>(null);
    const [depositValue, setDepositValue] = useState('');
    const statusLabel: Record<string, string> = { PENDING: 'Beklemede', CONFIRMED: 'Onaylandı', CANCELLED: 'İptal', COMPLETED: 'Tamamlandı' };

    const handleSetDeposit = async (id: string) => {
        const amount = parseFloat(depositValue);
        if (Number.isNaN(amount) || amount < 0) return;
        const result = await updateReservationDeposit(id, amount);
        if (result.ok) {
            setReservations(prev => prev.map(r => r.id === id ? { ...r, depositPaid: amount } : r));
            setDepositEditId(null);
            setDepositValue('');
        } else alert(result.error);
    };

    if (loading) return <div className="loading-block">Rezervasyonlar yükleniyor...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2xl)' }}>
                <h1>Rezervasyon Yönetimi</h1>
                <Button>CSV Dışa Aktar</Button>
            </div>

            <div className="card" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                            <th style={{ padding: 'var(--space-md)' }}>ID</th>
                            <th style={{ padding: 'var(--space-md)' }}>Müşteri</th>
                            <th style={{ padding: 'var(--space-md)' }}>Tur / Hizmet</th>
                            <th style={{ padding: 'var(--space-md)' }}>Tarih</th>
                            <th style={{ padding: 'var(--space-md)' }}>Kişi</th>
                            <th style={{ padding: 'var(--space-md)' }}>Toplam</th>
                            <th style={{ padding: 'var(--space-md)' }}>Ödenen depozit</th>
                            <th style={{ padding: 'var(--space-md)' }}>Durum</th>
                            <th style={{ padding: 'var(--space-md)' }}>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reservations.length === 0 ? (
                            <tr><td colSpan={9} style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-text-muted)' }}>Henüz rezervasyon yok.</td></tr>
                        ) : (
                            reservations.map(res => (
                                <tr key={res.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td style={{ padding: 'var(--space-md)', fontWeight: 'bold' }}>{res.id.slice(0, 8)}</td>
                                    <td style={{ padding: 'var(--space-md)' }}>{res.customer}</td>
                                    <td style={{ padding: 'var(--space-md)' }}>{res.tour}</td>
                                    <td style={{ padding: 'var(--space-md)' }}>{res.date}</td>
                                    <td style={{ padding: 'var(--space-md)' }}>{res.pax}</td>
                                    <td style={{ padding: 'var(--space-md)' }}>{res.total}</td>
                                    <td style={{ padding: 'var(--space-md)' }}>
                                        {depositEditId === res.id ? (
                                            <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={depositValue}
                                                    onChange={(e) => setDepositValue(e.target.value)}
                                                    placeholder="0"
                                                    style={{ width: '70px', padding: '4px' }}
                                                />
                                                <Button type="button" style={{ padding: '2px 6px', fontSize: '0.75rem' }} onClick={() => handleSetDeposit(res.id)}>Kaydet</Button>
                                                <button type="button" style={{ padding: '2px 6px', fontSize: '0.75rem' }} onClick={() => { setDepositEditId(null); setDepositValue(''); }}>İptal</button>
                                            </span>
                                        ) : (
                                            <span>
                                                €{res.depositPaid.toFixed(2)}
                                                <Button variant="secondary" type="button" style={{ marginLeft: '6px', padding: '2px 6px', fontSize: '0.75rem' }} onClick={() => { setDepositEditId(res.id); setDepositValue(String(res.depositPaid)); }}>Düzenle</Button>
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ padding: 'var(--space-md)' }}>
                                        <span style={{
                                            padding: '4px 8px',
                                            borderRadius: '12px',
                                            fontSize: '0.8rem',
                                            fontWeight: 'bold',
                                            backgroundColor: res.status === 'CONFIRMED' ? '#d1fae5' : res.status === 'PENDING' ? '#fef3c7' : '#e5e7eb',
                                            color: res.status === 'CONFIRMED' ? '#065f46' : res.status === 'PENDING' ? '#92400e' : '#374151'
                                        }}>
                                            {statusLabel[res.status] ?? res.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: 'var(--space-md)' }}>
                                        <select
                                            value={res.status}
                                            onChange={(e) => handleStatusChange(res.id, e.target.value)}
                                            style={{ padding: '4px', borderRadius: '4px', border: '1px solid var(--color-border)', marginRight: 'var(--space-sm)' }}
                                        >
                                            <option value="PENDING">Beklemede</option>
                                            <option value="CONFIRMED">Onayla</option>
                                            <option value="CANCELLED">İptal</option>
                                            <option value="COMPLETED">Tamamlandı</option>
                                        </select>
                                        <Button
                                            variant="secondary"
                                            style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                            onClick={() => handleSendConfirmation(res.id)}
                                            disabled={sendingEmailId === res.id}
                                        >
                                            {sendingEmailId === res.id ? 'Gönderiliyor…' : 'Onay e-postası gönder'}
                                        </Button>
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
