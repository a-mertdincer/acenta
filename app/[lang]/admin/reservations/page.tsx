'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { Button } from '../../../components/Button';
import AdminReservationsCalendarView from './AdminReservationsCalendarView';
import {
  getReservations,
  cancelReservationByAdmin,
  updateReservationStatus,
  sendReservationConfirmationEmail,
  updateReservationDeposit,
  approveGuestCancellationRequest,
  rejectGuestCancellationRequest,
  approveGuestUpdateRequest,
  rejectGuestUpdateRequest,
  type CancellationReason,
} from '../../../actions/reservations';
import {
  getReservationStatusLabel,
  getReservationStatusBadgeClass,
  RESERVATION_STATUS_OPTIONS,
  RESERVATION_STATUS,
} from '@/lib/reservationStatus';
import { formatNotesForDisplay } from '@/lib/guestNotes';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

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

function getCancelReasonLabel(reason: string | null): string {
  switch (reason) {
    case 'free_cancel':
      return 'Ücretsiz iptal';
    case 'customer_request':
      return 'Müşteri talebi';
    case 'wrong_reservation':
      return 'Hatalı rezervasyon';
    case 'other':
      return 'Diğer';
    default:
      return 'Belirtilmedi';
  }
}

function normalizePaxBreakdown(row: { pax: number; adultCount?: number | null; childCount?: number | null; infantCount?: number | null }) {
  const children = Math.max(0, row.childCount ?? 0);
  const infants = Math.max(0, row.infantCount ?? 0);
  const adults = Math.max(1, row.adultCount ?? Math.max(1, row.pax - children - infants));
  return { adults, children, infants };
}

function formatPaxShort(row: { pax: number; adultCount?: number | null; childCount?: number | null; infantCount?: number | null }): string {
  const { adults, children, infants } = normalizePaxBreakdown(row);
  const parts: string[] = [];
  if (adults > 0) parts.push(`${adults}A`);
  if (children > 0) parts.push(`${children}Ç`);
  if (infants > 0) parts.push(`${infants}B`);
  return parts.length > 0 ? parts.join(' + ') : String(row.pax);
}

interface ResRow {
  id: string;
  customer: string;
  guestEmail: string;
  guestPhone: string;
  tour: string;
  variantTitle: string | null;
  date: string;
  pax: number;
  adultCount: number | null;
  childCount: number | null;
  infantCount: number | null;
  total: string;
  totalPrice: number;
  status: string;
  depositPaid: number;
  createdAt: string;
  updatedAt: string;
  userId: string | null;
  account: { id: string; name: string; email: string; createdAt: Date } | null;
  notes: string | null;
  displayNotes: string;
  optionsRaw: string | null;
  transferAirport: string | null;
  couponCode: string | null;
  originalPrice: number | null;
  discountAmount: number | null;
  cancellationRequestedAt: string | null;
  cancellationRequestReason: string | null;
  cancelReason: string | null;
  cancelNote: string | null;
  cancelledBy: string | null;
  updateRequestedAt: string | null;
  pendingDate: string | null;
  pendingPax: number | null;
  pendingNotes: string | null;
}

type SortKey = 'tourDate' | 'createdAt' | 'customer' | 'tour' | 'totalPrice' | 'status';

function SortIndicator({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  return (
    <span className={active ? 'sort-icon active' : 'sort-icon'}>
      {active ? (dir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  );
}

export default function AdminReservationsPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const highlightId = searchParams.get('highlight');
  const expandId = searchParams.get('expand');
  const focusId = expandId ?? highlightId;
  const urlTourDate = searchParams.get('tourDate');
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const lang = (pathname?.split('/')[1] ?? 'tr') as string;

  const [viewMode, setViewMode] = useState<'calendar' | 'table'>(() => (
    searchParams.get('view') === 'table' || searchParams.get('status') || searchParams.get('expand')
      ? 'table'
      : 'calendar'
  ));
  const [reservations, setReservations] = useState<ResRow[]>([]);
  const urlStatus = searchParams.get('status');
  const [loading, setLoading] = useState(true);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('tourDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>(() => urlStatus ?? '');
  const [filterTour, setFilterTour] = useState<string>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusPopoverId, setStatusPopoverId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [depositEditId, setDepositEditId] = useState<string | null>(null);
  const [depositValue, setDepositValue] = useState('');
  const [cancelDialog, setCancelDialog] = useState<{ id: string; mode: 'direct' | 'approve_request' } | null>(null);
  const [cancelReason, setCancelReason] = useState<CancellationReason>('free_cancel');
  const [cancelOtherNote, setCancelOtherNote] = useState('');
  const [cancelSendEmail, setCancelSendEmail] = useState(true);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<string>(() => urlTourDate ?? '');
  const statusPopoverRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusId) {
      setExpandedId(focusId);
      setFlashId(focusId);
      const timer = setTimeout(() => setFlashId(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [focusId]);

  useEffect(() => {
    if (searchParams.get('view') === 'table' || searchParams.get('expand')) setViewMode('table');
    const s = searchParams.get('status');
    if (s) setFilterStatus(s);
    setFilterDate(searchParams.get('tourDate') ?? '');
  }, [searchParams]);

  useEffect(() => {
    if (focusId && reservations.length > 0) {
      const row = rowRefs.current[focusId];
      if (row) row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [focusId, reservations]);

  useEffect(() => {
    getReservations().then((list) => {
      setReservations(
        list.map(
          (r: {
            id: string;
            guestName: string;
            guestEmail: string;
            guestPhone: string;
            tourId: string;
            tour?: { titleEn: string } | null;
            variant?: { titleEn: string; titleTr: string } | null;
            date: Date;
            pax: number;
            totalPrice: number;
            status: string;
            depositPaid?: number;
            createdAt: Date;
            updatedAt: Date;
            userId: string | null;
            account?: { id: string; name: string; email: string; createdAt: Date } | null;
            notes: string | null;
            options: string;
            transferAirport?: string | null;
            adultCount?: number | null;
            childCount?: number | null;
            infantCount?: number | null;
            cancellationRequestedAt?: Date | null;
            cancellationRequestReason?: string | null;
            cancelReason?: string | null;
            cancelNote?: string | null;
            cancelledBy?: string | null;
            updateRequestedAt?: Date | null;
            pendingDate?: Date | null;
            pendingPax?: number | null;
            pendingNotes?: string | null;
          }) => ({
            id: r.id,
            customer: r.guestName,
            guestEmail: r.guestEmail,
            guestPhone: r.guestPhone,
            tour: r.tour?.titleEn ?? r.tourId,
            variantTitle: r.variant?.titleEn ?? null,
            date: r.date.toISOString().split('T')[0],
            pax: r.pax,
            adultCount: (r as { adultCount?: number | null }).adultCount ?? null,
            childCount: (r as { childCount?: number | null }).childCount ?? null,
            infantCount: (r as { infantCount?: number | null }).infantCount ?? null,
            total: `€${r.totalPrice}`,
            totalPrice: r.totalPrice,
            status: r.status,
            depositPaid: r.depositPaid ?? 0,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(),
            userId: r.userId ?? null,
            account: (r.account as { id: string; name: string; email: string; createdAt: Date } | null) ?? null,
            notes: r.notes ?? null,
            displayNotes: formatNotesForDisplay(r.notes),
            optionsRaw: r.options ?? null,
            transferAirport: (r as { transferAirport?: string | null }).transferAirport ?? null,
            couponCode: (r as { couponCode?: string | null }).couponCode ?? null,
            originalPrice: (r as { originalPrice?: number | null }).originalPrice ?? null,
            discountAmount: (r as { discountAmount?: number | null }).discountAmount ?? null,
            cancellationRequestedAt: r.cancellationRequestedAt ? r.cancellationRequestedAt.toISOString() : null,
            cancellationRequestReason: r.cancellationRequestReason ?? null,
            cancelReason: (r as { cancelReason?: string | null }).cancelReason ?? null,
            cancelNote: (r as { cancelNote?: string | null }).cancelNote ?? null,
            cancelledBy: (r as { cancelledBy?: string | null }).cancelledBy ?? null,
            updateRequestedAt: r.updateRequestedAt ? r.updateRequestedAt.toISOString() : null,
            pendingDate: r.pendingDate ? r.pendingDate.toISOString() : null,
            pendingPax: r.pendingPax ?? null,
            pendingNotes: r.pendingNotes ?? null,
          })
        )
      );
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const toggleSort = useCallback((key: SortKey) => {
    setSortKey(key);
    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
  }, []);

  const filteredAndSorted = useMemo(() => {
    let list = reservations;
    const q = searchDebounced.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.customer.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.tour.toLowerCase().includes(q) ||
          (r.displayNotes && r.displayNotes.toLowerCase().includes(q))
      );
    }
    if (filterStatus) list = list.filter((r) => r.status === filterStatus);
    if (filterTour) list = list.filter((r) => r.tour === filterTour);
    if (filterDate) list = list.filter((r) => r.date === filterDate);

    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'tourDate':
          cmp = a.date.localeCompare(b.date);
          break;
        case 'createdAt':
          cmp = a.createdAt.localeCompare(b.createdAt);
          break;
        case 'customer':
          cmp = a.customer.localeCompare(b.customer);
          break;
        case 'tour':
          cmp = a.tour.localeCompare(b.tour);
          break;
        case 'totalPrice':
          cmp = a.totalPrice - b.totalPrice;
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        default:
          cmp = 0;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [reservations, searchDebounced, filterStatus, filterTour, filterDate, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / perPage));
  const paginated = useMemo(
    () => filteredAndSorted.slice((page - 1) * perPage, page * perPage),
    [filteredAndSorted, page, perPage]
  );

  const uniqueTours = useMemo(
    () => Array.from(new Set(reservations.map((r) => r.tour))).sort(),
    [reservations]
  );

  const stats = useMemo(() => {
    const list = filteredAndSorted;
    const pending = list.filter((r) => r.status === RESERVATION_STATUS.PENDING).length;
    const confirmed = list.filter((r) => r.status === RESERVATION_STATUS.CONFIRMED).length;
    const cancelled = list.filter((r) => r.status === RESERVATION_STATUS.CANCELLED).length;
    const revenue = list
      .filter((r) => r.status !== RESERVATION_STATUS.CANCELLED)
      .reduce((s, r) => s + r.totalPrice, 0);
    return { total: list.length, pending, confirmed, cancelled, revenue };
  }, [filteredAndSorted]);

  const allChecked = paginated.length > 0 && paginated.every((r) => selected.has(r.id));
  const toggleAll = () => {
    if (allChecked) setSelected((s) => new Set([...s].filter((id) => !paginated.some((r) => r.id === id))));
    else setSelected((s) => new Set([...s, ...paginated.map((r) => r.id)]));
  };
  const toggleOne = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    const onClose = (e: MouseEvent) => {
      if (statusPopoverRef.current && !statusPopoverRef.current.contains(e.target as Node)) setStatusPopoverId(null);
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) setContextMenu(null);
    };
    document.addEventListener('mousedown', onClose);
    return () => document.removeEventListener('mousedown', onClose);
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setStatusPopoverId(null);
    if (newStatus === RESERVATION_STATUS.CANCELLED) {
      setCancelReason('free_cancel');
      setCancelOtherNote('');
      setCancelSendEmail(true);
      setCancelDialog({ id, mode: 'direct' });
      return;
    }
    const result = await updateReservationStatus(id, newStatus);
    if (result.ok) setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
  };

  const handleSendConfirmation = async (id: string) => {
    setContextMenu(null);
    setSendingEmailId(id);
    const result = await sendReservationConfirmationEmail(id);
    setSendingEmailId(null);
    if (result.ok) alert('Onay e-postası gönderildi.');
    else alert(result.error ?? 'Gönderilemedi');
  };

  const handleSetDeposit = async (id: string) => {
    const amount = parseFloat(depositValue);
    if (Number.isNaN(amount) || amount < 0) return;
    const result = await updateReservationDeposit(id, amount);
    if (result.ok) {
      setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, depositPaid: amount } : r)));
      setDepositEditId(null);
      setDepositValue('');
    } else alert(result.error);
  };

  const refreshSingleReservation = async (id: string) => {
    const list = await getReservations();
    const next = list.find((r) => r.id === id);
    if (!next) return;
    setReservations((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status: next.status,
              date: next.date.toISOString().split('T')[0],
              pax: next.pax,
              adultCount: (next as { adultCount?: number | null }).adultCount ?? null,
              childCount: (next as { childCount?: number | null }).childCount ?? null,
              infantCount: (next as { infantCount?: number | null }).infantCount ?? null,
              total: `€${next.totalPrice}`,
              totalPrice: next.totalPrice,
              updatedAt: next.updatedAt.toISOString(),
              userId: next.userId ?? null,
              account: (next as { account?: { id: string; name: string; email: string; createdAt: Date } | null }).account ?? null,
              notes: next.notes ?? null,
              displayNotes: formatNotesForDisplay(next.notes),
              cancellationRequestedAt: next.cancellationRequestedAt ? next.cancellationRequestedAt.toISOString() : null,
              cancellationRequestReason: next.cancellationRequestReason ?? null,
              cancelReason: (next as { cancelReason?: string | null }).cancelReason ?? null,
              cancelNote: (next as { cancelNote?: string | null }).cancelNote ?? null,
              cancelledBy: (next as { cancelledBy?: string | null }).cancelledBy ?? null,
              updateRequestedAt: next.updateRequestedAt ? next.updateRequestedAt.toISOString() : null,
              pendingDate: next.pendingDate ? next.pendingDate.toISOString() : null,
              pendingPax: next.pendingPax ?? null,
              pendingNotes: next.pendingNotes ?? null,
              couponCode: (next as { couponCode?: string | null }).couponCode ?? null,
              originalPrice: (next as { originalPrice?: number | null }).originalPrice ?? null,
              discountAmount: (next as { discountAmount?: number | null }).discountAmount ?? null,
            }
          : p
      )
    );
  };

  const handleOpenCancelDialog = (id: string, mode: 'direct' | 'approve_request') => {
    setCancelReason(mode === 'approve_request' ? 'customer_request' : 'free_cancel');
    setCancelOtherNote('');
    setCancelSendEmail(true);
    setCancelDialog({ id, mode });
  };

  const handleSubmitCancelDialog = async () => {
    if (!cancelDialog) return;
    if (cancelReason === 'other' && !cancelOtherNote.trim()) {
      alert('Diğer nedeni için açıklama girin.');
      return;
    }
    setCancelSubmitting(true);
    const payload = {
      reason: cancelReason,
      note: cancelOtherNote.trim() || null,
      sendEmail: cancelSendEmail,
    };
    const result =
      cancelDialog.mode === 'approve_request'
        ? await approveGuestCancellationRequest(cancelDialog.id, cancelSendEmail, { reason: cancelReason, note: payload.note })
        : await cancelReservationByAdmin(cancelDialog.id, payload);
    setCancelSubmitting(false);
    if (!result.ok) return alert(result.error ?? 'İptal işlemi başarısız');
    await refreshSingleReservation(cancelDialog.id);
    setCancelDialog(null);
  };

  const handleApproveCancellationRequest = async (id: string) => {
    handleOpenCancelDialog(id, 'approve_request');
  };

  const handleRejectCancellationRequest = async (id: string) => {
    const note = window.prompt('Misafire iletilecek not (isteğe bağlı):');
    const result = await rejectGuestCancellationRequest(id, note ?? undefined, true);
    if (!result.ok) return alert(result.error ?? 'Reddetme başarısız');
    await refreshSingleReservation(id);
  };

  const handleApproveUpdateRequest = async (id: string) => {
    const result = await approveGuestUpdateRequest(id, true);
    if (!result.ok) return alert(result.error ?? 'Onaylama başarısız');
    await refreshSingleReservation(id);
  };

  const handleRejectUpdateRequest = async (id: string) => {
    const note = window.prompt('Misafire iletilecek not (isteğe bağlı):');
    const result = await rejectGuestUpdateRequest(id, note ?? undefined, true);
    if (!result.ok) return alert(result.error ?? 'Reddetme başarısız');
    await refreshSingleReservation(id);
  };

  const exportCsv = () => {
    const headers = ['ID', 'Müşteri', 'Tur', 'Tur Tarihi', 'Kişi', 'Toplam', 'Depozit', 'Durum', 'Rez. Tarihi'];
    const rows = (selected.size ? filteredAndSorted.filter((r) => selected.has(r.id)) : filteredAndSorted).map(
      (r) =>
        [
          r.id.slice(0, 8),
          r.customer,
          r.tour,
          formatDate(r.date),
          r.pax,
          r.total,
          `€${r.depositPaid.toFixed(2)}`,
          getReservationStatusLabel(r.status),
          formatDate(r.createdAt),
        ].join(',')
    );
    const csv = [headers.join(','), ...rows].map((row) => `"${row.replace(/"/g, '""')}"`).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rezervasyonlar_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (viewMode === 'table' && loading) return <div className="admin-loading-block">Rezervasyonlar yükleniyor...</div>;

  return (
    <div>
      <div className="admin-page-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
        <h1 style={{ margin: 0 }}>Rezervasyon Takvimi</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              background: viewMode === 'calendar' ? 'var(--color-primary)' : 'transparent',
              color: viewMode === 'calendar' ? 'white' : 'inherit',
              fontWeight: viewMode === 'calendar' ? 600 : 400,
            }}
          >
            Takvim
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              background: viewMode === 'table' ? 'var(--color-primary)' : 'transparent',
              color: viewMode === 'table' ? 'white' : 'inherit',
              fontWeight: viewMode === 'table' ? 600 : 400,
            }}
          >
            Tablo
          </button>
          {viewMode === 'table' && (
            <Button variant="secondary" onClick={exportCsv}>
              CSV Dışa Aktar
            </Button>
          )}
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <AdminReservationsCalendarView lang={lang} />
      ) : (
        <>
      {/* Summary cards */}
      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-value">{stats.total}</div>
          <div className="admin-stat-label">Toplam</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value">{stats.pending}</div>
          <div className="admin-stat-label">Bekleyen</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value">{stats.confirmed}</div>
          <div className="admin-stat-label">Onaylı</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value">€{stats.revenue.toLocaleString('tr-TR')}</div>
          <div className="admin-stat-label">Gelir</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value">{stats.cancelled}</div>
          <div className="admin-stat-label">İptal</div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="admin-filter-bar">
        <input
          type="search"
          className="admin-search-input"
          placeholder="Müşteri, ID veya tur ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setSearch('')}
        />
        <select
          className="admin-filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Tüm durumlar</option>
          {RESERVATION_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select className="admin-filter-select" value={filterTour} onChange={(e) => setFilterTour(e.target.value)}>
          <option value="">Tüm turlar</option>
          {uniqueTours.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="admin-search-input"
          style={{ minWidth: 170 }}
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          title="Tur tarihine göre filtrele"
        />
        {filterDate && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFilterDate('')}>
            Tarih filtresini temizle
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          {filteredAndSorted.length} kayıt
        </span>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="admin-bulk-bar">
          <span>
            <strong>{selected.size}</strong> rezervasyon seçildi
          </span>
          <Button variant="secondary" onClick={exportCsv}>
            Seçilenleri dışa aktar
          </Button>
          <button type="button" onClick={() => setSelected(new Set())} className="btn btn-secondary btn-sm">
            Seçimi temizle
          </button>
        </div>
      )}

      {/* Desktop table */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th className="admin-th-check">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Tümünü seç" />
              </th>
              <th style={{ width: 36 }}></th>
              <th>ID</th>
              <th className="admin-th-sortable" onClick={() => toggleSort('status')}>
                Durum <SortIndicator active={sortKey === 'status'} dir={sortDir} />
              </th>
              <th className="admin-th-sortable" onClick={() => toggleSort('customer')}>
                Müşteri <SortIndicator active={sortKey === 'customer'} dir={sortDir} />
              </th>
              <th className="admin-th-sortable" onClick={() => toggleSort('tour')}>
                Tur / Hizmet <SortIndicator active={sortKey === 'tour'} dir={sortDir} />
              </th>
              <th>Varyant</th>
              <th className="admin-th-sortable" onClick={() => toggleSort('tourDate')}>
                Tur tarihi <SortIndicator active={sortKey === 'tourDate'} dir={sortDir} />
              </th>
              <th className="admin-cell-num">Kişi</th>
              <th className="admin-th-sortable" onClick={() => toggleSort('totalPrice')}>
                Toplam <SortIndicator active={sortKey === 'totalPrice'} dir={sortDir} />
              </th>
              <th>Depozit</th>
              <th>Notlar</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={13} className="admin-empty-cell">
                  {filteredAndSorted.length === 0 ? 'Filtreye uyan rezervasyon yok.' : 'Henüz rezervasyon yok.'}
                </td>
              </tr>
            ) : (
              paginated.map((res) => {
                const optionsList = parseOptionsJson(res.optionsRaw);
                const isExpanded = expandedId === res.id;
                return (
                  <React.Fragment key={res.id}>
                    <tr
                      ref={(el) => {
                        rowRefs.current[res.id] = el;
                      }}
                      className={`${isExpanded ? 'admin-row-expanded' : ''} ${flashId === res.id ? 'admin-row-expanded' : ''}`.trim()}
                    >
                      <td className="admin-td-check">
                        <input
                          type="checkbox"
                          checked={selected.has(res.id)}
                          onChange={() => toggleOne(res.id)}
                          aria-label={`${res.customer} seç`}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="admin-action-btn"
                          title="Detay"
                          onClick={() => setExpandedId(isExpanded ? null : res.id)}
                        >
                          {isExpanded ? '▾' : '▸'}
                        </button>
                      </td>
                      <td className="admin-cell-id">{res.id.slice(0, 8)}</td>
                      <td style={{ position: 'relative' }}>
                        <button
                          type="button"
                          className={`status-badge ${getReservationStatusBadgeClass(res.status)}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setStatusPopoverId(statusPopoverId === res.id ? null : res.id);
                          }}
                        >
                          {getReservationStatusLabel(res.status)}
                        </button>
                        {statusPopoverId === res.id && (
                          <div ref={statusPopoverRef} className="admin-status-popover">
                            {RESERVATION_STATUS_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => handleStatusChange(res.id, opt.value)}
                              >
                                {res.status === opt.value ? '✓ ' : ''}
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="admin-cell-truncate" title={res.customer}>
                        {res.customer}
                      </td>
                      <td className="admin-cell-truncate" title={res.tour}>
                        {res.tour}
                      </td>
                      <td className="admin-cell-truncate" title={res.variantTitle ?? ''}>
                        {res.variantTitle ?? '—'}
                      </td>
                      <td>{formatDate(res.date)}</td>
                      <td className="admin-cell-num">{formatPaxShort(res)}</td>
                      <td className="admin-cell-currency">{res.total}</td>
                      <td className="admin-cell-deposit">
                        {depositEditId === res.id ? (
                          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={depositValue}
                              onChange={(e) => setDepositValue(e.target.value)}
                              placeholder="0"
                              style={{ width: 70, padding: 4, fontSize: '0.8125rem' }}
                            />
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => handleSetDeposit(res.id)}
                            >
                              Kaydet
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setDepositEditId(null);
                                setDepositValue('');
                              }}
                            >
                              İptal
                            </button>
                          </span>
                        ) : (
                          <span
                            className={`deposit-amount ${res.depositPaid === 0 ? 'deposit-zero' : ''}`}
                            onClick={() => {
                              setDepositEditId(res.id);
                              setDepositValue(String(res.depositPaid));
                            }}
                            title="Tıkla: depozit düzenle"
                          >
                            €{res.depositPaid.toFixed(2)}
                            <svg
                              className="deposit-edit-icon"
                              width={11}
                              height={11}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </span>
                        )}
                      </td>
                      <td className="admin-cell-notes" title={res.displayNotes || (res.notes ?? '')}>
                        {res.displayNotes || '—'}
                      </td>
                      <td className="admin-actions-cell">
                        <button
                          type="button"
                          className="admin-action-btn"
                          title="Detay"
                          onClick={() => setExpandedId(isExpanded ? null : res.id)}
                        >
                          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx={12} cy={12} r={3} />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="admin-action-btn"
                          title="Depozit düzenle"
                          onClick={() => {
                            setDepositEditId(res.id);
                            setDepositValue(String(res.depositPaid));
                          }}
                        >
                          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="admin-action-btn"
                          title="Rezervasyonu iptal et"
                          onClick={() => handleOpenCancelDialog(res.id, 'direct')}
                        >
                          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="admin-action-btn"
                          title="Diğer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setContextMenu({ id: res.id, x: e.clientX, y: e.clientY });
                          }}
                        >
                          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <circle cx={12} cy={12} r={1} />
                            <circle cx={5} cy={12} r={1} />
                            <circle cx={19} cy={12} r={1} />
                          </svg>
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${res.id}-detail`} style={{ background: 'var(--color-bg-light)' }}>
                        <td colSpan={13} style={{ padding: 'var(--space-lg)' }}>
                          <div className="admin-expand-content">
                            <div className="admin-expand-section">
                              <h4>Müşteri bilgileri</h4>
                              <p>Ad: {res.customer}</p>
                              <p>E-posta: <a href={`mailto:${res.guestEmail}`}>{res.guestEmail}</a></p>
                              <p>Telefon: <a href={`tel:${res.guestPhone}`}>{res.guestPhone}</a></p>
                            </div>
                            <div className="admin-expand-section">
                              <h4>Hesap bilgisi</h4>
                              {res.account ? (
                                <>
                                  <p>👤 Üye: {res.account.name} ({res.account.email})</p>
                                  <p>Kullanıcı ID: {res.account.id.slice(0, 8)}</p>
                                  <p>Kayıt: {formatDate(new Date(res.account.createdAt).toISOString())}</p>
                                </>
                              ) : (
                                <p>👤 Misafir (üye değil)</p>
                              )}
                            </div>
                            <div className="admin-expand-section">
                              <h4>Konaklama / Notlar</h4>
                              <p>{res.displayNotes || '—'}</p>
                              <p><strong>Rez. tarihi:</strong> {formatDate(res.createdAt)}</p>
                            </div>
                            <div className="admin-expand-section">
                              <h4>Kişi detayı</h4>
                              {(() => {
                                const breakdown = normalizePaxBreakdown(res);
                                const pricedPeople = Math.max(1, breakdown.adults + breakdown.children);
                                const unitPrice = res.totalPrice / pricedPeople;
                                return (
                                  <>
                                    <p>👤 {breakdown.adults} Yetişkin x €{unitPrice.toFixed(2)} = €{(breakdown.adults * unitPrice).toFixed(2)}</p>
                                    <p>👶 {breakdown.children} Çocuk (4-7) x €{unitPrice.toFixed(2)} = €{(breakdown.children * unitPrice).toFixed(2)}</p>
                                    <p>🍼 {breakdown.infants} Bebek (0-3) = Ücretsiz</p>
                                  </>
                                );
                              })()}
                            </div>
                            <div className="admin-expand-section">
                              <h4>Ödeme</h4>
                              <p>Toplam: {res.total}</p>
                              {res.couponCode && res.originalPrice != null && res.discountAmount != null && (
                                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                                  🎟 {res.couponCode} · Orijinal: €{res.originalPrice.toFixed(2)} · İndirim: -€{res.discountAmount.toFixed(2)}
                                </p>
                              )}
                              <p>Depozit: €{res.depositPaid.toFixed(2)}</p>
                              <p>Kalan: €{(res.totalPrice - res.depositPaid).toFixed(2)}</p>
                            </div>
                            {res.variantTitle && (
                              <div className="admin-expand-section">
                                <h4>Varyant</h4>
                                <p>{res.variantTitle}</p>
                              </div>
                            )}
                            {res.transferAirport && (
                              <div className="admin-expand-section">
                                <h4>Transfer</h4>
                                <p>{res.transferAirport === 'ASR' ? 'Kayseri (ASR)' : res.transferAirport === 'NAV' ? 'Nevşehir (NAV)' : res.transferAirport}</p>
                              </div>
                            )}
                            <div className="admin-expand-section" style={{ gridColumn: optionsList.length ? '1 / -1' : undefined }}>
                              <h4>Seçilen opsiyonlar</h4>
                              <p>
                                {optionsList.length
                                  ? optionsList.map((o, i) => (
                                      <span key={i}>
                                        {o.title}
                                        {o.price ? ` (+€${o.price})` : ''}
                                        {i < optionsList.length - 1 ? ', ' : ''}
                                      </span>
                                    ))
                                  : '—'}
                              </p>
                            </div>
                            {(res.cancellationRequestedAt || res.updateRequestedAt) && (
                              <div className="admin-expand-section" style={{ gridColumn: '1 / -1', border: '1px solid var(--color-border)', borderRadius: 10, padding: 'var(--space-md)', background: '#fff7ed' }}>
                                <h4>Aktif Talep</h4>
                                {res.cancellationRequestedAt ? (
                                  <>
                                    <p style={{ fontWeight: 700, color: '#b91c1c' }}>⚠️ İPTAL TALEBİ</p>
                                    <p>Talep tarihi: {formatDate(res.cancellationRequestedAt)}</p>
                                    <p>İptal nedeni: {res.cancellationRequestReason || '—'}</p>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                                      <Button onClick={() => handleApproveCancellationRequest(res.id)}>✅ İptali Onayla</Button>
                                      <Button variant="secondary" onClick={() => handleRejectCancellationRequest(res.id)}>❌ Talebi Reddet</Button>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <p style={{ fontWeight: 700, color: '#92400e' }}>⚠️ DEĞİŞİKLİK TALEBİ</p>
                                    <p>Talep tarihi: {res.updateRequestedAt ? formatDate(res.updateRequestedAt) : '—'}</p>
                                    <p>
                                      İstenen değişiklik:
                                      {res.pendingDate ? ` Tarih: ${formatDate(res.date)} → ${formatDate(res.pendingDate)}` : ''}
                                      {res.pendingPax != null ? `, Kişi: ${res.pax} → ${res.pendingPax}` : ''}
                                      {res.pendingNotes ? `, Not: ${res.pendingNotes}` : ''}
                                    </p>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                                      <Button onClick={() => handleApproveUpdateRequest(res.id)}>✅ Değişikliği Onayla</Button>
                                      <Button variant="secondary" onClick={() => handleRejectUpdateRequest(res.id)}>❌ Talebi Reddet</Button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                            {res.status === RESERVATION_STATUS.CANCELLED && (
                              <div className="admin-expand-section" style={{ gridColumn: '1 / -1', border: '1px solid var(--color-border)', borderRadius: 10, padding: 'var(--space-md)', background: '#f9fafb' }}>
                                <h4>İptal bilgisi</h4>
                                <p>
                                  {getCancelReasonLabel(res.cancelReason)} · {res.cancelledBy === 'admin' ? 'Admin tarafından' : res.cancelledBy === 'customer' ? 'Müşteri talebi ile' : 'Belirsiz kaynak'} · {formatDate(res.updatedAt)}
                                </p>
                                {res.cancelNote && <p>Not: {res.cancelNote}</p>}
                              </div>
                            )}
                          </div>
                          <div style={{ marginTop: 12 }}>
                            <Button
                              variant="secondary"
                              style={{ marginRight: 8 }}
                              onClick={() => handleSendConfirmation(res.id)}
                              disabled={sendingEmailId === res.id}
                            >
                              {sendingEmailId === res.id ? 'Gönderiliyor…' : 'Onay mail gönder'}
                            </Button>
                            {res.status !== RESERVATION_STATUS.CANCELLED && (
                              <Button variant="secondary" onClick={() => handleOpenCancelDialog(res.id, 'direct')}>
                                Rezervasyonu iptal et
                              </Button>
                            )}
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

      {/* Context menu (fixed position) */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="admin-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button type="button" onClick={() => handleSendConfirmation(contextMenu.id)}>
            Onay mail gönder
          </button>
          <button
            type="button"
            onClick={() => {
              handleOpenCancelDialog(contextMenu.id, 'direct');
              setContextMenu(null);
            }}
          >
            Rezervasyonu iptal et
          </button>
          <button
            type="button"
            onClick={() => {
              const r = reservations.find((x) => x.id === contextMenu.id);
              if (r) {
                setDepositEditId(r.id);
                setDepositValue(String(r.depositPaid));
                setExpandedId(r.id);
              }
              setContextMenu(null);
            }}
          >
            Depozit düzenle
          </button>
        </div>
      )}

      {cancelDialog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div className="card" style={{ width: 'min(560px, 96vw)', padding: 'var(--space-xl)' }}>
            <h3 style={{ marginTop: 0, marginBottom: 'var(--space-md)' }}>Rezervasyonu İptal Et</h3>
            <p style={{ marginTop: 0, color: 'var(--color-text-muted)' }}>İptal nedeni:</p>
            <div style={{ display: 'grid', gap: 8, marginBottom: 'var(--space-md)' }}>
              {[
                { value: 'free_cancel', label: 'Ücretsiz iptal' },
                { value: 'customer_request', label: 'Müşteri talebi' },
                { value: 'wrong_reservation', label: 'Hatalı rezervasyon' },
                { value: 'other', label: 'Diğer' },
              ].map((opt) => (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="radio"
                    checked={cancelReason === opt.value}
                    onChange={() => setCancelReason(opt.value as CancellationReason)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
            {cancelReason === 'other' && (
              <div style={{ marginBottom: 'var(--space-md)' }}>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Diğer notu</label>
                <textarea
                  value={cancelOtherNote}
                  onChange={(e) => setCancelOtherNote(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 8, border: '1px solid var(--color-border)' }}
                  placeholder="İptal notu"
                />
              </div>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-lg)' }}>
              <input type="checkbox" checked={cancelSendEmail} onChange={(e) => setCancelSendEmail(e.target.checked)} />
              <span>Müşteriye iptal maili gönder</span>
            </label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setCancelDialog(null)}>Vazgeç</Button>
              <Button onClick={handleSubmitCancelDialog} disabled={cancelSubmitting}>
                {cancelSubmitting ? 'İşleniyor...' : 'İptal Et'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {filteredAndSorted.length > 0 && (
        <div className="admin-pagination">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>Sayfa başına:</span>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
              className="admin-filter-select"
              style={{ width: 70 }}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <span>
            {filteredAndSorted.length} kayıttan {(page - 1) * perPage + 1}-{Math.min(page * perPage, filteredAndSorted.length)} gösteriliyor
          </span>
          <div className="admin-pagination-controls">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ‹
            </button>
            <span>
              {page} / {totalPages}
            </span>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              ›
            </button>
          </div>
        </div>
      )}

      {/* Mobile card view */}
      <div className="admin-cards-mobile">
        {paginated.length === 0 ? (
          <p className="admin-empty-cell">{filteredAndSorted.length === 0 ? 'Filtreye uyan rezervasyon yok.' : 'Henüz rezervasyon yok.'}</p>
        ) : (
          paginated.map((res) => {
            const isExpanded = expandedId === res.id;
            return (
              <div key={res.id} className="admin-reservation-card">
                <div className="admin-reservation-card-header">
                  <button
                    type="button"
                    className={`status-badge ${getReservationStatusBadgeClass(res.status)}`}
                    onClick={() => setStatusPopoverId(statusPopoverId === res.id ? null : res.id)}
                  >
                    {getReservationStatusLabel(res.status)}
                  </button>
                  <span style={{ fontFamily: 'ui-monospace', fontSize: '0.75rem' }}>#{res.id.slice(0, 8)}</span>
                </div>
                <p style={{ fontWeight: 600 }}>{res.customer}</p>
                <p>{res.tour}</p>
                <div className="admin-reservation-card-meta">
                  {formatDate(res.date)} · {formatPaxShort(res)} · {res.total}
                </div>
                {res.displayNotes && <p className="admin-reservation-card-meta">{res.displayNotes}</p>}
                <p className="admin-reservation-card-meta">Depozit: €{res.depositPaid.toFixed(2)}</p>
                <div className="admin-reservation-card-actions">
                  <button type="button" className="admin-action-btn" onClick={() => setExpandedId(isExpanded ? null : res.id)}>
                    Detay
                  </button>
                  <button
                    type="button"
                    className="admin-action-btn"
                    onClick={() => {
                      setDepositEditId(res.id);
                      setDepositValue(String(res.depositPaid));
                    }}
                  >
                    Depozit
                  </button>
                  {res.status !== RESERVATION_STATUS.CANCELLED && (
                    <button type="button" className="admin-action-btn" onClick={() => handleOpenCancelDialog(res.id, 'direct')}>
                      İptal Et
                    </button>
                  )}
                  <Button variant="secondary" onClick={() => handleSendConfirmation(res.id)} disabled={sendingEmailId === res.id}>
                    Onay mail
                  </Button>
                </div>
                {isExpanded && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
                    <p><a href={`mailto:${res.guestEmail}`}>{res.guestEmail}</a></p>
                    <p><a href={`tel:${res.guestPhone}`}>{res.guestPhone}</a></p>
                    <p>Rez. tarihi: {formatDate(res.createdAt)}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
        </>
      )}
    </div>
  );
}
