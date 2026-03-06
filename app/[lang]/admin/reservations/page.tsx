'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '../../../components/Button';
import { getReservations, updateReservationStatus, sendReservationConfirmationEmail, updateReservationDeposit } from '../../../actions/reservations';
import { getReservationStatusLabel, getReservationStatusStyle, RESERVATION_STATUS_OPTIONS } from '@/lib/reservationStatus';
import { formatNotesForDisplay } from '@/lib/guestNotes';

/** Seçilen opsiyon: sepette { id, title, price } olarak saklanıyor */
function parseOptionsJson(optionsStr: string | null): { title: string; price: number }[] {
    if (!optionsStr?.trim()) return [];
    try {
        const arr = JSON.parse(optionsStr);
        if (!Array.isArray(arr)) return [];
        return arr.map((o: { title?: string; price?: number }) => ({
            title: o?.title ?? '',
            price: typeof o?.price === 'number' ? o.price : 0,
        }));
    } catch {
        return [];
    }
}

interface ResRow {
    id: string;
    customer: string;
    guestEmail: string;
    guestPhone: string;
    tour: string;
    date: string;
    pax: number;
    total: string;
    totalPrice: number;
    status: string;
    depositPaid: number;
    createdAt: string;
    notes: string | null;
    displayNotes: string;
    optionsRaw: string | null;
    transferAirport: string | null;
}

export default function AdminReservationsPage() {
    const searchParams = useSearchParams();
    const highlightId = searchParams.get('highlight');
    const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

    const [reservations, setReservations] = useState<ResRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        if (highlightId) setExpandedId(highlightId);
    }, [highlightId]);

    useEffect(() => {
        if (highlightId && reservations.length > 0) {
            const row = rowRefs.current[highlightId];
            if (row) row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [highlightId, reservations]);

    useEffect(() => {
        getReservations().then((list) => {
            setReservations(list.map((r: {
                id: string;
                guestName: string;
                guestEmail: string;
                guestPhone: string;
                tourId: string;
                tour?: { titleEn: string } | null;
                date: Date;
                pax: number;
                totalPrice: number;
                status: string;
                depositPaid?: number;
                createdAt: Date;
                notes: string | null;
                options: string;
                transferAirport?: string | null;
            }) => ({
                id: r.id,
                customer: r.guestName,
                guestEmail: r.guestEmail,
                guestPhone: r.guestPhone,
                tour: r.tour?.titleEn ?? r.tourId,
                date: r.date.toISOString().split('T')[0],
                pax: r.pax,
                total: `€${r.totalPrice}`,
                totalPrice: r.totalPrice,
                status: r.status,
                depositPaid: r.depositPaid ?? 0,
                createdAt: r.createdAt.toISOString(),
                notes: r.notes ?? null,
                displayNotes: formatNotesForDisplay(r.notes),
                optionsRaw: r.options ?? null,
                transferAirport: (r as { transferAirport?: string | null }).transferAirport ?? null,
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
                            <th style={{ padding: 'var(--space-md)' }}></th>
                            <th style={{ padding: 'var(--space-md)' }}>ID</th>
                            <th style={{ padding: 'var(--space-md)' }}>Müşteri</th>
                            <th style={{ padding: 'var(--space-md)' }}>Tur / Hizmet</th>
                            <th style={{ padding: 'var(--space-md)' }}>Tur tarihi</th>
                            <th style={{ padding: 'var(--space-md)' }}>Rez. tarihi</th>
                            <th style={{ padding: 'var(--space-md)' }}>Notlar</th>
                            <th style={{ padding: 'var(--space-md)' }}>Kişi</th>
                            <th style={{ padding: 'var(--space-md)' }}>Toplam</th>
                            <th style={{ padding: 'var(--space-md)' }}>Depozit</th>
                            <th style={{ padding: 'var(--space-md)' }}>Durum</th>
                            <th style={{ padding: 'var(--space-md)' }}>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reservations.length === 0 ? (
                            <tr><td colSpan={12} style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--color-text-muted)' }}>Henüz rezervasyon yok.</td></tr>
                        ) : (
                            reservations.map(res => {
                                const optionsList = parseOptionsJson(res.optionsRaw);
                                const createdAtShort = res.createdAt ? new Date(res.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
                                return (
                                    <React.Fragment key={res.id}>
                                        <tr
                                            ref={(el) => { rowRefs.current[res.id] = el; }}
                                            style={{
                                                borderBottom: '1px solid var(--color-border)',
                                                verticalAlign: 'middle',
                                                backgroundColor: expandedId === res.id ? '#dbeafe' : undefined,
                                            }}
                                        >
                                            <td style={{ padding: 'var(--space-sm)' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setExpandedId(expandedId === res.id ? null : res.id)}
                                                    style={{ padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer', border: '1px solid var(--color-border)', borderRadius: '4px', background: expandedId === res.id ? 'var(--color-bg-light)' : 'transparent' }}
                                                    title="Detay"
                                                >
                                                    {expandedId === res.id ? '▼' : '▶'}
                                                </button>
                                            </td>
                                            <td style={{ padding: 'var(--space-md)', fontWeight: 'bold' }}>{res.id.slice(0, 8)}</td>
                                            <td style={{ padding: 'var(--space-md)' }}>{res.customer}</td>
                                            <td style={{ padding: 'var(--space-md)' }}>{res.tour}</td>
                                            <td style={{ padding: 'var(--space-md)' }}>{res.date}</td>
                                            <td style={{ padding: 'var(--space-md)', whiteSpace: 'nowrap' }}>{createdAtShort}</td>
                                            <td style={{ padding: 'var(--space-md)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }} title={res.displayNotes || (res.notes ?? '')}>{res.displayNotes || '—'}</td>
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
                                                    ...getReservationStatusStyle(res.status),
                                                }}>
                                                    {getReservationStatusLabel(res.status)}
                                                </span>
                                            </td>
                                            <td style={{ padding: 'var(--space-md)' }}>
                                                <select
                                                    value={res.status}
                                                    onChange={(e) => handleStatusChange(res.id, e.target.value)}
                                                    style={{ padding: '4px', borderRadius: '4px', border: '1px solid var(--color-border)', marginRight: 'var(--space-sm)' }}
                                                >
                                                    {RESERVATION_STATUS_OPTIONS.map((opt) => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))}
                                                </select>
                                                <Button
                                                    variant="secondary"
                                                    style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                                    onClick={() => handleSendConfirmation(res.id)}
                                                    disabled={sendingEmailId === res.id}
                                                >
                                                    {sendingEmailId === res.id ? 'Gönderiliyor…' : 'Onay mail'}
                                                </Button>
                                            </td>
                                        </tr>
                                        {expandedId === res.id && (
                                            <tr key={`${res.id}-detail`} style={{ backgroundColor: 'var(--color-bg-light)', borderBottom: '1px solid var(--color-border)' }}>
                                                <td colSpan={12} style={{ padding: 'var(--space-lg)' }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-md)', fontSize: '0.9rem' }}>
                                                        <div><strong>Tur tarihi (gidiş):</strong> {res.date}</div>
                                                        <div><strong>Rezervasyon / satın alma tarihi:</strong> {res.createdAt ? new Date(res.createdAt).toLocaleString('tr-TR') : '—'}</div>
                                                        <div><strong>Notlar:</strong> {res.displayNotes || '—'}</div>
                                                        <div><strong>E-posta:</strong> <a href={`mailto:${res.guestEmail}`}>{res.guestEmail}</a></div>
                                                        <div><strong>Telefon:</strong> <a href={`tel:${res.guestPhone}`}>{res.guestPhone}</a></div>
                                                        {res.transferAirport && (
                                                            <div><strong>Transfer havalimanı:</strong> {res.transferAirport === 'ASR' ? 'Kayseri (ASR)' : res.transferAirport === 'NAV' ? 'Nevşehir (NAV)' : res.transferAirport}</div>
                                                        )}
                                                        <div style={{ gridColumn: optionsList.length ? '1 / -1' : undefined }}>
                                                            <strong>Seçilen opsiyonlar:</strong>{' '}
                                                            {optionsList.length ? optionsList.map((o, i) => <span key={i}>{o.title}{o.price ? ` (+€${o.price})` : ''}{i < optionsList.length - 1 ? ', ' : ''}</span>) : '—'}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
