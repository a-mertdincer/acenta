'use client';

import { useState, useEffect } from 'react';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { getTours, getTourById, setTourDatePrice, createTourOption, updateTourOption, deleteTourOption, setTourTransferAirportTiers, seedDemoTours, createTour, updateTour, deleteTour, addTourImage, deleteTourImage, setPrimaryTourImage, moveTourImage, type TourOptionRow, type TransferTier, type TourType } from '../../../actions/tours';
import { getAttractions, type AttractionRow } from '../../../actions/attractions';
import { getDestinations, getCategoriesForDestination } from '@/lib/destinations';
import { getTourVariantsForAdmin, createVariant, updateVariant, deleteVariant, type CreateVariantInput } from '../../../actions/variants';
import type { TourVariantDisplay } from '@/lib/types/variant';
import { toPaxPriceRows, type PaxPriceTier } from '@/lib/pricingTiers';
import { TOUR_TAGS, TAG_CATEGORY_ORDER, TAG_CATEGORY_LABELS } from '@/lib/tourTags';
import { Check } from 'lucide-react';
import { TourRetranslateButton } from '../../../components/admin/TourRetranslateButton';

function StartTimesEditor({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
    const add = () => onChange([...value, '09:00']);
    const update = (idx: number, v: string) => onChange(value.map((t, i) => (i === idx ? v : t)));
    const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));
    return (
        <div className="admin-start-times">
            {value.length === 0 ? (
                <small style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>
                    Saat eklenmediyse misafir saat seçmez (tüm gün geçerli).
                </small>
            ) : null}
            <div className="admin-start-times-list">
                {value.map((time, idx) => (
                    <div key={idx} className="admin-start-time-row">
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => update(idx, e.target.value)}
                            style={{ padding: '4px 8px', border: '1px solid var(--color-border)', borderRadius: 4 }}
                        />
                        <Button type="button" variant="secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => remove(idx)}>
                            Sil
                        </Button>
                    </div>
                ))}
            </div>
            <Button type="button" variant="secondary" style={{ padding: '4px 10px', fontSize: '0.8rem', marginTop: 6 }} onClick={add}>
                + Saat Ekle
            </Button>
        </div>
    );
}

function SalesTagsPicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
    const toggle = (slug: string) => {
        onChange(value.includes(slug) ? value.filter((s) => s !== slug) : [...value, slug]);
    };
    return (
        <div className="admin-sales-tags">
            {TAG_CATEGORY_ORDER.map((cat) => {
                const inCategory = TOUR_TAGS.filter((t) => t.category === cat);
                if (inCategory.length === 0) return null;
                return (
                    <div key={cat} className="admin-sales-tags-group">
                        <h4>{TAG_CATEGORY_LABELS[cat].tr}</h4>
                        <div className="admin-sales-tags-row">
                            {inCategory.map((tag) => {
                                const Icon = tag.icon;
                                const selected = value.includes(tag.slug);
                                return (
                                    <button
                                        key={tag.slug}
                                        type="button"
                                        className={`admin-sales-tag-pill${selected ? ' selected' : ''}`}
                                        onClick={() => toggle(tag.slug)}
                                        aria-pressed={selected}
                                    >
                                        <Icon size={14} aria-hidden />
                                        <span>{tag.labelTr}</span>
                                        {selected ? <Check size={12} aria-hidden /> : null}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

type AgeGroupDraft = {
    minAge: number;
    maxAge: number;
    pricingType: 'free' | 'child' | 'adult' | 'not_allowed';
    descriptionEn: string;
    descriptionTr: string;
    descriptionZh: string;
};

type FaqItemDraft = {
    question: string;
    answer: string;
};

type ReservationTypeMode = 'private_regular' | 'option2' | 'option3' | 'option4' | 'none';

export default function AdminToursPage() {
    const [tours, setTours] = useState<{ id: string; titleEn: string; type: string; basePrice: number; hasReservationType?: boolean; reservationTypeMode?: ReservationTypeMode }[]>([]);
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
    const [optPricingMode, setOptPricingMode] = useState<'per_person' | 'flat' | 'per_unit'>('per_person');
    const [optSaving, setOptSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitleEn, setEditTitleEn] = useState('');
    const [editPriceAdd, setEditPriceAdd] = useState('');
    const [editPricingMode, setEditPricingMode] = useState<'per_person' | 'flat' | 'per_unit'>('per_person');

    const [transferTiersASR, setTransferTiersASR] = useState<TransferTier[]>([]);
    const [transferTiersNAV, setTransferTiersNAV] = useState<TransferTier[]>([]);
    const [transferSaving, setTransferSaving] = useState(false);
    const [seedLoading, setSeedLoading] = useState(false);

    const [showNewTourForm, setShowNewTourForm] = useState(false);
    const [createSaving, setCreateSaving] = useState(false);
    const [newType, setNewType] = useState<TourType>('TOUR');
    const [newSlug, setNewSlug] = useState('');
    const [newSalesTags, setNewSalesTags] = useState<string[]>([]);
    const [newStartTimes, setNewStartTimes] = useState<string[]>([]);
    const [newTitleEn, setNewTitleEn] = useState('');
    const [newTitleTr, setNewTitleTr] = useState('');
    const [newTitleZh, setNewTitleZh] = useState('');
    const [newDescEn, setNewDescEn] = useState('');
    const [newDescTr, setNewDescTr] = useState('');
    const [newDescZh, setNewDescZh] = useState('');
    const [newHighlightsEn, setNewHighlightsEn] = useState('');
    const [newHighlightsTr, setNewHighlightsTr] = useState('');
    const [newHighlightsZh, setNewHighlightsZh] = useState('');
    const [newItineraryEn, setNewItineraryEn] = useState('');
    const [newItineraryTr, setNewItineraryTr] = useState('');
    const [newItineraryZh, setNewItineraryZh] = useState('');
    const [newKnowBeforeEn, setNewKnowBeforeEn] = useState('');
    const [newKnowBeforeTr, setNewKnowBeforeTr] = useState('');
    const [newKnowBeforeZh, setNewKnowBeforeZh] = useState('');
    const [newNotSuitableEn, setNewNotSuitableEn] = useState('');
    const [newNotSuitableTr, setNewNotSuitableTr] = useState('');
    const [newNotSuitableZh, setNewNotSuitableZh] = useState('');
    const [newNotAllowedEn, setNewNotAllowedEn] = useState('');
    const [newNotAllowedTr, setNewNotAllowedTr] = useState('');
    const [newNotAllowedZh, setNewNotAllowedZh] = useState('');
    const [newWhatsIncludedEn, setNewWhatsIncludedEn] = useState('');
    const [newWhatsIncludedTr, setNewWhatsIncludedTr] = useState('');
    const [newWhatsIncludedZh, setNewWhatsIncludedZh] = useState('');
    const [newNotIncludedEn, setNewNotIncludedEn] = useState('');
    const [newNotIncludedTr, setNewNotIncludedTr] = useState('');
    const [newNotIncludedZh, setNewNotIncludedZh] = useState('');
    const [newFaqsEn, setNewFaqsEn] = useState<FaqItemDraft[]>([]);
    const [newFaqsTr, setNewFaqsTr] = useState<FaqItemDraft[]>([]);
    const [newFaqsZh, setNewFaqsZh] = useState<FaqItemDraft[]>([]);
    const [newBasePrice, setNewBasePrice] = useState('0');
    const [newAskForPrice, setNewAskForPrice] = useState(false);
    const [newFeatured, setNewFeatured] = useState(false);
    const [newCancellationNoteEn, setNewCancellationNoteEn] = useState('');
    const [newCancellationNoteTr, setNewCancellationNoteTr] = useState('');
    const [newCancellationNoteZh, setNewCancellationNoteZh] = useState('');
    const [newCapacity, setNewCapacity] = useState('10');
    const [newDestination, setNewDestination] = useState('cappadocia');
    const [newCategory, setNewCategory] = useState('');
    const [newAttractionIds, setNewAttractionIds] = useState<string[]>([]);
    const [newHasTourType, setNewHasTourType] = useState(false);
    const [newHasAirportSelect, setNewHasAirportSelect] = useState(false);
    const [newHasReservationType, setNewHasReservationType] = useState(true);
    const [newReservationTypeMode, setNewReservationTypeMode] = useState<ReservationTypeMode>('private_regular');
    const [newMinAgeLimit, setNewMinAgeLimit] = useState('');
    const [newAgeRestrictionEn, setNewAgeRestrictionEn] = useState('');
    const [newAgeRestrictionTr, setNewAgeRestrictionTr] = useState('');
    const [newAgeRestrictionZh, setNewAgeRestrictionZh] = useState('');
    const [newAgeGroups, setNewAgeGroups] = useState<AgeGroupDraft[]>([
        { minAge: 0, maxAge: 3, pricingType: 'free', descriptionEn: 'Free of charge', descriptionTr: 'Ücretsiz', descriptionZh: '免费' },
        { minAge: 4, maxAge: 7, pricingType: 'child', descriptionEn: 'Child price applies', descriptionTr: 'Çocuk fiyatı uygulanır', descriptionZh: '儿童价格适用' },
        { minAge: 8, maxAge: 99, pricingType: 'adult', descriptionEn: 'Adult price applies', descriptionTr: 'Yetişkin fiyatı uygulanır', descriptionZh: '成人价格适用' },
    ]);

    const [editTourId, setEditTourId] = useState<string | null>(null);
    const [editSaving, setEditSaving] = useState(false);
    const [tourEditType, setTourEditType] = useState<TourType>('TOUR');
    const [tourEditSlug, setTourEditSlug] = useState('');
    const [tourEditSalesTags, setTourEditSalesTags] = useState<string[]>([]);
    const [tourEditStartTimes, setTourEditStartTimes] = useState<string[]>([]);
    const [tourEditTitleEn, setTourEditTitleEn] = useState('');
    const [tourEditTitleTr, setTourEditTitleTr] = useState('');
    const [tourEditTitleZh, setTourEditTitleZh] = useState('');
    const [tourEditDescEn, setTourEditDescEn] = useState('');
    const [tourEditDescTr, setTourEditDescTr] = useState('');
    const [tourEditDescZh, setTourEditDescZh] = useState('');
    const [tourEditHighlightsEn, setTourEditHighlightsEn] = useState('');
    const [tourEditHighlightsTr, setTourEditHighlightsTr] = useState('');
    const [tourEditHighlightsZh, setTourEditHighlightsZh] = useState('');
    const [tourEditItineraryEn, setTourEditItineraryEn] = useState('');
    const [tourEditItineraryTr, setTourEditItineraryTr] = useState('');
    const [tourEditItineraryZh, setTourEditItineraryZh] = useState('');
    const [tourEditKnowBeforeEn, setTourEditKnowBeforeEn] = useState('');
    const [tourEditKnowBeforeTr, setTourEditKnowBeforeTr] = useState('');
    const [tourEditKnowBeforeZh, setTourEditKnowBeforeZh] = useState('');
    const [tourEditNotSuitableEn, setTourEditNotSuitableEn] = useState('');
    const [tourEditNotSuitableTr, setTourEditNotSuitableTr] = useState('');
    const [tourEditNotSuitableZh, setTourEditNotSuitableZh] = useState('');
    const [tourEditNotAllowedEn, setTourEditNotAllowedEn] = useState('');
    const [tourEditNotAllowedTr, setTourEditNotAllowedTr] = useState('');
    const [tourEditNotAllowedZh, setTourEditNotAllowedZh] = useState('');
    const [tourEditWhatsIncludedEn, setTourEditWhatsIncludedEn] = useState('');
    const [tourEditWhatsIncludedTr, setTourEditWhatsIncludedTr] = useState('');
    const [tourEditWhatsIncludedZh, setTourEditWhatsIncludedZh] = useState('');
    const [tourEditNotIncludedEn, setTourEditNotIncludedEn] = useState('');
    const [tourEditNotIncludedTr, setTourEditNotIncludedTr] = useState('');
    const [tourEditNotIncludedZh, setTourEditNotIncludedZh] = useState('');
    const [tourEditFaqsEn, setTourEditFaqsEn] = useState<FaqItemDraft[]>([]);
    const [tourEditFaqsTr, setTourEditFaqsTr] = useState<FaqItemDraft[]>([]);
    const [tourEditFaqsZh, setTourEditFaqsZh] = useState<FaqItemDraft[]>([]);
    const [tourEditBasePrice, setTourEditBasePrice] = useState('0');
    const [tourEditAskForPrice, setTourEditAskForPrice] = useState(false);
    const [tourEditFeatured, setTourEditFeatured] = useState(false);
    const [tourEditCancellationNoteEn, setTourEditCancellationNoteEn] = useState('');
    const [tourEditCancellationNoteTr, setTourEditCancellationNoteTr] = useState('');
    const [tourEditCancellationNoteZh, setTourEditCancellationNoteZh] = useState('');
    const [tourEditCapacity, setTourEditCapacity] = useState('10');
    const [tourEditDestination, setTourEditDestination] = useState('cappadocia');
    const [tourEditCategory, setTourEditCategory] = useState('');
    const [tourEditAttractionIds, setTourEditAttractionIds] = useState<string[]>([]);
    const [tourEditHasTourType, setTourEditHasTourType] = useState(false);
    const [tourEditHasAirportSelect, setTourEditHasAirportSelect] = useState(false);
    const [tourEditHasReservationType, setTourEditHasReservationType] = useState(true);
    const [tourEditReservationTypeMode, setTourEditReservationTypeMode] = useState<ReservationTypeMode>('private_regular');
    const [tourEditMinAgeLimit, setTourEditMinAgeLimit] = useState('');
    const [tourEditAgeRestrictionEn, setTourEditAgeRestrictionEn] = useState('');
    const [tourEditAgeRestrictionTr, setTourEditAgeRestrictionTr] = useState('');
    const [tourEditAgeRestrictionZh, setTourEditAgeRestrictionZh] = useState('');
    const [tourEditAgeGroups, setTourEditAgeGroups] = useState<AgeGroupDraft[]>([]);
    const [tourImages, setTourImages] = useState<{ id: string; url: string; isPrimary: boolean }[]>([]);
    const [imageUploading, setImageUploading] = useState(false);
    const [imageUrlInput, setImageUrlInput] = useState('');
    const [variants, setVariants] = useState<TourVariantDisplay[]>([]);
    const [attractions, setAttractions] = useState<AttractionRow[]>([]);
    const [variantSaving, setVariantSaving] = useState(false);
    const [showAddVariant, setShowAddVariant] = useState(false);
    const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
    const [editVariant, setEditVariant] = useState<Partial<CreateVariantInput>>({
        tourType: null, reservationType: 'regular', airport: null,
        titleEn: '', titleTr: '', titleZh: '', descEn: '', descTr: '', descZh: '',
        includes: [], excludes: [], duration: null, languages: null, vehicleType: null, maxGroupSize: null, routeStops: null,
        adultPrice: 0, childPrice: null, pricingType: 'per_person', privatePriceTiers: null, sortOrder: 0, isActive: true, isRecommended: false,
    });
    const [newVariant, setNewVariant] = useState<Partial<CreateVariantInput>>({
        tourType: null, reservationType: 'regular', airport: null,
        titleEn: '', titleTr: '', titleZh: '', descEn: '', descTr: '', descZh: '',
        includes: [], excludes: [], duration: null, languages: null, vehicleType: null, maxGroupSize: null, routeStops: null,
        adultPrice: 0, childPrice: null, pricingType: 'per_person', privatePriceTiers: null, sortOrder: 0, isActive: true, isRecommended: false,
    });

    const selectedTour = tours.find((t) => t.id === dailyTourId) ?? null;
    const selectedTourType = selectedTour?.type ?? '';
    const destinations = getDestinations();
    const createCategories = getCategoriesForDestination(newDestination);
    const editCategories = getCategoriesForDestination(tourEditDestination);

    const getReservationTypeOptions = (mode: ReservationTypeMode): { value: string; label: string }[] => {
        if (mode === 'option2') {
            return [
                { value: 'option1', label: 'Option 1' },
                { value: 'option2', label: 'Option 2' },
            ];
        }
        if (mode === 'option3') {
            return [
                { value: 'option1', label: 'Option 1' },
                { value: 'option2', label: 'Option 2' },
                { value: 'option3', label: 'Option 3' },
            ];
        }
        if (mode === 'option4') {
            return [
                { value: 'option1', label: 'Option 1' },
                { value: 'option2', label: 'Option 2' },
                { value: 'option3', label: 'Option 3' },
                { value: 'option4', label: 'Option 4' },
            ];
        }
        return [
            { value: 'regular', label: 'Regular (Paylaşımlı)' },
            { value: 'private', label: 'Private (Özel)' },
        ];
    };
    const normalizeReservationType = (mode: ReservationTypeMode, value: string | null | undefined): string | null => {
        if (mode === 'none') return null;
        const options = getReservationTypeOptions(mode);
        const picked = (value ?? '').trim();
        if (options.some((opt) => opt.value === picked)) return picked;
        return options[0]?.value ?? null;
    };
    const canUseTierPricing = (
        pricingType: 'per_person' | 'per_vehicle' | undefined,
        mode: ReservationTypeMode,
        reservationType: string | null
    ) => {
        if (pricingType === 'per_vehicle') return true;
        return mode === 'private_regular' && reservationType === 'private';
    };
    const isReservationTypeCompatible = (mode: ReservationTypeMode, value: string | null | undefined): boolean => {
        if (mode === 'none') return value == null || value === '';
        const options = getReservationTypeOptions(mode);
        return options.some((opt) => opt.value === (value ?? ''));
    };
    const addFaqItem = (target: 'newEn' | 'newTr' | 'newZh' | 'editEn' | 'editTr' | 'editZh') => {
        const updater = (prev: FaqItemDraft[]) => [...prev, { question: '', answer: '' }];
        if (target === 'newEn') return setNewFaqsEn(updater);
        if (target === 'newTr') return setNewFaqsTr(updater);
        if (target === 'newZh') return setNewFaqsZh(updater);
        if (target === 'editEn') return setTourEditFaqsEn(updater);
        if (target === 'editTr') return setTourEditFaqsTr(updater);
        return setTourEditFaqsZh(updater);
    };
    const updateFaqItem = (
        target: 'newEn' | 'newTr' | 'newZh' | 'editEn' | 'editTr' | 'editZh',
        index: number,
        key: 'question' | 'answer',
        value: string
    ) => {
        const updater = (prev: FaqItemDraft[]) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item));
        if (target === 'newEn') return setNewFaqsEn(updater);
        if (target === 'newTr') return setNewFaqsTr(updater);
        if (target === 'newZh') return setNewFaqsZh(updater);
        if (target === 'editEn') return setTourEditFaqsEn(updater);
        if (target === 'editTr') return setTourEditFaqsTr(updater);
        return setTourEditFaqsZh(updater);
    };
    const removeFaqItem = (target: 'newEn' | 'newTr' | 'newZh' | 'editEn' | 'editTr' | 'editZh', index: number) => {
        const updater = (prev: FaqItemDraft[]) => prev.filter((_, i) => i !== index);
        if (target === 'newEn') return setNewFaqsEn(updater);
        if (target === 'newTr') return setNewFaqsTr(updater);
        if (target === 'newZh') return setNewFaqsZh(updater);
        if (target === 'editEn') return setTourEditFaqsEn(updater);
        if (target === 'editTr') return setTourEditFaqsTr(updater);
        return setTourEditFaqsZh(updater);
    };

    useEffect(() => {
        getTours().then((list) => {
            setTours(list.map((t) => ({
                id: t.id,
                titleEn: t.titleEn,
                type: t.type,
                basePrice: t.basePrice,
                hasReservationType: t.hasReservationType,
                reservationTypeMode: (t.reservationTypeMode as ReservationTypeMode | undefined) ?? 'private_regular',
            })));
            if (list.length > 0 && !dailyTourId) setDailyTourId(list[0].id);
            setLoading(false);
        });
        getAttractions().then(setAttractions);
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
            const rec = t as {
                destination?: string;
                category?: string | null;
                hasTourType?: boolean;
                hasAirportSelect?: boolean;
                hasReservationType?: boolean;
                reservationTypeMode?: ReservationTypeMode;
                minAgeLimit?: number | null;
                ageRestrictionEn?: string | null;
                ageRestrictionTr?: string | null;
                ageRestrictionZh?: string | null;
                highlightsEn?: string | null;
                highlightsTr?: string | null;
                highlightsZh?: string | null;
                itineraryEn?: string | null;
                itineraryTr?: string | null;
                itineraryZh?: string | null;
                knowBeforeEn?: string | null;
                knowBeforeTr?: string | null;
                knowBeforeZh?: string | null;
                notSuitableEn?: string | null;
                notSuitableTr?: string | null;
                notSuitableZh?: string | null;
                notAllowedEn?: string | null;
                notAllowedTr?: string | null;
                notAllowedZh?: string | null;
                whatsIncludedEn?: string | null;
                whatsIncludedTr?: string | null;
                whatsIncludedZh?: string | null;
                notIncludedEn?: string | null;
                notIncludedTr?: string | null;
                notIncludedZh?: string | null;
                faqsEn?: { question: string; answer: string }[] | null;
                faqsTr?: { question: string; answer: string }[] | null;
                faqsZh?: { question: string; answer: string }[] | null;
                attractionIds?: string[];
                ageGroups?: {
                    minAge: number;
                    maxAge: number;
                    pricingType: 'free' | 'child' | 'adult' | 'not_allowed';
                    descriptionEn: string;
                    descriptionTr: string;
                    descriptionZh?: string | null;
                }[];
                images?: { id: string; url: string; isPrimary: boolean }[];
            };
            setTourEditType('TOUR');
            setTourEditSlug((t as { slug?: string | null }).slug ?? '');
            const incomingTags = (t as { salesTags?: unknown }).salesTags;
            setTourEditSalesTags(Array.isArray(incomingTags) ? (incomingTags.filter((x): x is string => typeof x === 'string')) : []);
            const incomingStartTimes = (t as { startTimes?: unknown }).startTimes;
            setTourEditStartTimes(Array.isArray(incomingStartTimes) ? incomingStartTimes.filter((x): x is string => typeof x === 'string') : []);
            setTourEditDestination(rec.destination ?? 'cappadocia');
            setTourEditCategory(rec.category ?? '');
            setTourEditTitleEn(t.titleEn);
            setTourEditTitleTr(t.titleTr);
            setTourEditTitleZh(t.titleZh);
            setTourEditDescEn(t.descEn);
            setTourEditDescTr(t.descTr);
            setTourEditDescZh(t.descZh);
            setTourEditHighlightsEn(rec.highlightsEn ?? '');
            setTourEditHighlightsTr(rec.highlightsTr ?? '');
            setTourEditHighlightsZh(rec.highlightsZh ?? '');
            setTourEditItineraryEn(rec.itineraryEn ?? '');
            setTourEditItineraryTr(rec.itineraryTr ?? '');
            setTourEditItineraryZh(rec.itineraryZh ?? '');
            setTourEditKnowBeforeEn(rec.knowBeforeEn ?? '');
            setTourEditKnowBeforeTr(rec.knowBeforeTr ?? '');
            setTourEditKnowBeforeZh(rec.knowBeforeZh ?? '');
            setTourEditNotSuitableEn(rec.notSuitableEn ?? '');
            setTourEditNotSuitableTr(rec.notSuitableTr ?? '');
            setTourEditNotSuitableZh(rec.notSuitableZh ?? '');
            setTourEditNotAllowedEn(rec.notAllowedEn ?? '');
            setTourEditNotAllowedTr(rec.notAllowedTr ?? '');
            setTourEditNotAllowedZh(rec.notAllowedZh ?? '');
            setTourEditWhatsIncludedEn(rec.whatsIncludedEn ?? '');
            setTourEditWhatsIncludedTr(rec.whatsIncludedTr ?? '');
            setTourEditWhatsIncludedZh(rec.whatsIncludedZh ?? '');
            setTourEditNotIncludedEn(rec.notIncludedEn ?? '');
            setTourEditNotIncludedTr(rec.notIncludedTr ?? '');
            setTourEditNotIncludedZh(rec.notIncludedZh ?? '');
            setTourEditFaqsEn(Array.isArray(rec.faqsEn) ? rec.faqsEn : []);
            setTourEditFaqsTr(Array.isArray(rec.faqsTr) ? rec.faqsTr : []);
            setTourEditFaqsZh(Array.isArray(rec.faqsZh) ? rec.faqsZh : []);
            setTourEditAttractionIds(Array.isArray(rec.attractionIds) ? rec.attractionIds : []);
            setTourEditBasePrice(String(t.basePrice));
            setTourEditAskForPrice(Boolean((t as { isAskForPrice?: boolean }).isAskForPrice));
            setTourEditFeatured(Boolean((t as { isFeatured?: boolean }).isFeatured));
            setTourEditCancellationNoteEn((t as { cancellationNoteEn?: string | null }).cancellationNoteEn ?? '');
            setTourEditCancellationNoteTr((t as { cancellationNoteTr?: string | null }).cancellationNoteTr ?? '');
            setTourEditCancellationNoteZh((t as { cancellationNoteZh?: string | null }).cancellationNoteZh ?? '');
            setTourEditCapacity(String(t.capacity));
            setTourEditHasTourType(Boolean(rec.hasTourType));
            setTourEditHasAirportSelect(Boolean(rec.hasAirportSelect));
            const mode = rec.reservationTypeMode ?? (rec.hasReservationType === false ? 'none' : 'private_regular');
            setTourEditReservationTypeMode(mode);
            setTourEditHasReservationType(mode !== 'none');
            setTourEditMinAgeLimit(rec.minAgeLimit != null ? String(rec.minAgeLimit) : '');
            setTourEditAgeRestrictionEn(rec.ageRestrictionEn ?? '');
            setTourEditAgeRestrictionTr(rec.ageRestrictionTr ?? '');
            setTourEditAgeRestrictionZh(rec.ageRestrictionZh ?? '');
            const fetchedAgeGroups = (rec.ageGroups ?? []).map((g) => ({
                minAge: g.minAge,
                maxAge: g.maxAge,
                pricingType: g.pricingType,
                descriptionEn: g.descriptionEn,
                descriptionTr: g.descriptionTr,
                descriptionZh: g.descriptionZh ?? '',
            }));
            setTourEditAgeGroups(
                fetchedAgeGroups.length > 0
                    ? fetchedAgeGroups
                    : [
                        { minAge: 0, maxAge: 3, pricingType: 'free', descriptionEn: 'Free of charge', descriptionTr: 'Ücretsiz', descriptionZh: '免费' },
                        { minAge: 4, maxAge: 7, pricingType: 'child', descriptionEn: 'Child price applies', descriptionTr: 'Çocuk fiyatı uygulanır', descriptionZh: '儿童价格适用' },
                        { minAge: 8, maxAge: 99, pricingType: 'adult', descriptionEn: 'Adult price applies', descriptionTr: 'Yetişkin fiyatı uygulanır', descriptionZh: '成人价格适用' },
                    ]
            );
            setTourImages((rec.images ?? []).map((img) => ({ id: img.id, url: img.url, isPrimary: img.isPrimary })));
        });
        getTourVariantsForAdmin(editTourId).then(setVariants);
    }, [editTourId]);

    useEffect(() => {
        if (newType === 'TRANSFER') {
            setNewHasAirportSelect(true);
            setNewHasTourType(false);
            setNewHasReservationType(true);
            setNewReservationTypeMode('private_regular');
            return;
        }
        if (newType === 'TOUR') {
            setNewHasTourType(true);
            setNewHasAirportSelect(false);
            setNewHasReservationType(true);
            setNewReservationTypeMode('private_regular');
            return;
        }
        setNewHasTourType(false);
        setNewHasAirportSelect(false);
        setNewHasReservationType(false);
        setNewReservationTypeMode('none');
    }, [newType]);

    useEffect(() => {
        setNewHasReservationType(newReservationTypeMode !== 'none');
        setNewVariant((prev) => ({
            ...prev,
            reservationType: normalizeReservationType(newReservationTypeMode, prev.reservationType ?? null),
        }));
    }, [newReservationTypeMode]);

    useEffect(() => {
        setTourEditHasReservationType(tourEditReservationTypeMode !== 'none');
        setNewVariant((prev) => ({
            ...prev,
            reservationType: normalizeReservationType(tourEditReservationTypeMode, prev.reservationType ?? null),
        }));
        setEditVariant((prev) => ({
            ...prev,
            reservationType: normalizeReservationType(tourEditReservationTypeMode, prev.reservationType ?? null),
        }));
    }, [tourEditReservationTypeMode]);

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
            pricingMode: optPricingMode,
        });
        setOptSaving(false);
        if (result.ok) {
            setOptTitleTr('');
            setOptTitleEn('');
            setOptTitleZh('');
            setOptPriceAdd('');
            setOptPricingMode('per_person');
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
        setEditPricingMode(o.pricingMode ?? 'per_person');
    };
    const handleUpdateOption = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingId) return;
        const result = await updateTourOption(editingId, {
            titleEn: editTitleEn.trim(),
            priceAdd: parseFloat(editPriceAdd) || 0,
            pricingMode: editPricingMode,
        });
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

    const updateVariantTierRows = (
        target: 'new' | 'edit',
        updater: (prev: PaxPriceTier[]) => PaxPriceTier[]
    ) => {
        const normalizeRows = (rows: PaxPriceTier[]) =>
            [...rows]
                .map((row) => ({
                    pax: Math.max(1, Math.trunc(Number(row.pax) || 1)),
                    totalPrice: Number(row.totalPrice) || 0,
                }))
                .sort((a, b) => a.pax - b.pax);
        if (target === 'new') {
            setNewVariant((prev) => {
                const rows = toPaxPriceRows(prev.privatePriceTiers ?? null);
                return { ...prev, privatePriceTiers: normalizeRows(updater(rows)) };
            });
            return;
        }
        setEditVariant((prev) => {
            const rows = toPaxPriceRows(prev.privatePriceTiers ?? null);
            return { ...prev, privatePriceTiers: normalizeRows(updater(rows)) };
        });
    };

    const handleSeedDemo = async () => {
        setSeedLoading(true);
        const result = await seedDemoTours();
        setSeedLoading(false);
        if (result.ok) {
            const list = await getTours();
            setTours(list.map((t) => ({ id: t.id, titleEn: t.titleEn, type: t.type, basePrice: t.basePrice, hasReservationType: t.hasReservationType, reservationTypeMode: (t.reservationTypeMode as ReservationTypeMode | undefined) ?? 'private_regular' })));
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
            slug: newSlug.trim() || null,
            salesTags: newSalesTags,
            startTimes: newStartTimes,
            titleEn: newTitleEn.trim(),
            titleTr: newTitleTr.trim() || newTitleEn.trim(),
            titleZh: newTitleZh.trim() || newTitleEn.trim(),
            descEn: newDescEn.trim() || '-',
            descTr: newDescTr.trim() || '-',
            descZh: newDescZh.trim() || '-',
            highlightsEn: newHighlightsEn.trim() || null,
            highlightsTr: newHighlightsTr.trim() || null,
            highlightsZh: newHighlightsZh.trim() || null,
            itineraryEn: newItineraryEn.trim() || null,
            itineraryTr: newItineraryTr.trim() || null,
            itineraryZh: newItineraryZh.trim() || null,
            knowBeforeEn: newKnowBeforeEn.trim() || null,
            knowBeforeTr: newKnowBeforeTr.trim() || null,
            knowBeforeZh: newKnowBeforeZh.trim() || null,
            notSuitableEn: newNotSuitableEn.trim() || null,
            notSuitableTr: newNotSuitableTr.trim() || null,
            notSuitableZh: newNotSuitableZh.trim() || null,
            notAllowedEn: newNotAllowedEn.trim() || null,
            notAllowedTr: newNotAllowedTr.trim() || null,
            notAllowedZh: newNotAllowedZh.trim() || null,
            whatsIncludedEn: newWhatsIncludedEn.trim() || null,
            whatsIncludedTr: newWhatsIncludedTr.trim() || null,
            whatsIncludedZh: newWhatsIncludedZh.trim() || null,
            notIncludedEn: newNotIncludedEn.trim() || null,
            notIncludedTr: newNotIncludedTr.trim() || null,
            notIncludedZh: newNotIncludedZh.trim() || null,
            faqsEn: newFaqsEn.filter((f) => f.question.trim() && f.answer.trim()),
            faqsTr: newFaqsTr.filter((f) => f.question.trim() && f.answer.trim()),
            faqsZh: newFaqsZh.filter((f) => f.question.trim() && f.answer.trim()),
            basePrice: parseFloat(newBasePrice) || 0,
            isAskForPrice: newAskForPrice,
            isFeatured: newFeatured,
            cancellationNoteEn: newCancellationNoteEn.trim() || null,
            cancellationNoteTr: newCancellationNoteTr.trim() || null,
            cancellationNoteZh: newCancellationNoteZh.trim() || null,
            capacity: parseInt(newCapacity, 10) || 0,
            destination: newDestination,
            category: newCategory || null,
            attractionIds: newAttractionIds,
            hasTourType: newHasTourType,
            hasAirportSelect: newHasAirportSelect,
            hasReservationType: newReservationTypeMode !== 'none',
            reservationTypeMode: newReservationTypeMode,
            minAgeLimit: newMinAgeLimit === '' ? null : parseInt(newMinAgeLimit, 10),
            ageRestrictionEn: newAgeRestrictionEn || null,
            ageRestrictionTr: newAgeRestrictionTr || null,
            ageRestrictionZh: newAgeRestrictionZh || null,
            ageGroups: newAgeGroups.map((g, idx) => ({ ...g, sortOrder: idx })),
        });
        setCreateSaving(false);
        if (result.ok) {
            const list = await getTours();
            setTours(list.map((t) => ({ id: t.id, titleEn: t.titleEn, type: t.type, basePrice: t.basePrice, hasReservationType: t.hasReservationType, reservationTypeMode: (t.reservationTypeMode as ReservationTypeMode | undefined) ?? 'private_regular' })));
            if (list.length > 0) setDailyTourId(list[list.length - 1].id);
            setShowNewTourForm(false);
            setNewTitleEn('');
            setNewTitleTr('');
            setNewTitleZh('');
            setNewDescEn('');
            setNewDescTr('');
            setNewDescZh('');
            setNewHighlightsEn('');
            setNewHighlightsTr('');
            setNewHighlightsZh('');
            setNewItineraryEn('');
            setNewItineraryTr('');
            setNewItineraryZh('');
            setNewKnowBeforeEn('');
            setNewKnowBeforeTr('');
            setNewKnowBeforeZh('');
            setNewNotSuitableEn('');
            setNewNotSuitableTr('');
            setNewNotSuitableZh('');
            setNewNotAllowedEn('');
            setNewNotAllowedTr('');
            setNewNotAllowedZh('');
            setNewWhatsIncludedEn('');
            setNewWhatsIncludedTr('');
            setNewWhatsIncludedZh('');
            setNewNotIncludedEn('');
            setNewNotIncludedTr('');
            setNewNotIncludedZh('');
            setNewFaqsEn([]);
            setNewFaqsTr([]);
            setNewFaqsZh([]);
            setNewBasePrice('0');
            setNewAskForPrice(false);
            setNewFeatured(false);
            setNewCancellationNoteEn('');
            setNewCancellationNoteTr('');
            setNewCancellationNoteZh('');
            setNewCapacity('10');
            setNewAttractionIds([]);
            setNewHasTourType(false);
            setNewHasAirportSelect(false);
            setNewHasReservationType(true);
            setNewReservationTypeMode('private_regular');
            setNewMinAgeLimit('');
            setNewAgeRestrictionEn('');
            setNewAgeRestrictionTr('');
            setNewAgeRestrictionZh('');
            setNewAgeGroups([
                { minAge: 0, maxAge: 3, pricingType: 'free', descriptionEn: 'Free of charge', descriptionTr: 'Ücretsiz', descriptionZh: '免费' },
                { minAge: 4, maxAge: 7, pricingType: 'child', descriptionEn: 'Child price applies', descriptionTr: 'Çocuk fiyatı uygulanır', descriptionZh: '儿童价格适用' },
                { minAge: 8, maxAge: 99, pricingType: 'adult', descriptionEn: 'Adult price applies', descriptionTr: 'Yetişkin fiyatı uygulanır', descriptionZh: '成人价格适用' },
            ]);
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
            slug: tourEditSlug.trim() || null,
            salesTags: tourEditSalesTags,
            startTimes: tourEditStartTimes,
            titleEn: tourEditTitleEn.trim(),
            titleTr: tourEditTitleTr.trim() || tourEditTitleEn.trim(),
            titleZh: tourEditTitleZh.trim() || tourEditTitleEn.trim(),
            descEn: tourEditDescEn.trim() || '-',
            descTr: tourEditDescTr.trim() || '-',
            descZh: tourEditDescZh.trim() || '-',
            highlightsEn: tourEditHighlightsEn.trim() || null,
            highlightsTr: tourEditHighlightsTr.trim() || null,
            highlightsZh: tourEditHighlightsZh.trim() || null,
            itineraryEn: tourEditItineraryEn.trim() || null,
            itineraryTr: tourEditItineraryTr.trim() || null,
            itineraryZh: tourEditItineraryZh.trim() || null,
            knowBeforeEn: tourEditKnowBeforeEn.trim() || null,
            knowBeforeTr: tourEditKnowBeforeTr.trim() || null,
            knowBeforeZh: tourEditKnowBeforeZh.trim() || null,
            notSuitableEn: tourEditNotSuitableEn.trim() || null,
            notSuitableTr: tourEditNotSuitableTr.trim() || null,
            notSuitableZh: tourEditNotSuitableZh.trim() || null,
            notAllowedEn: tourEditNotAllowedEn.trim() || null,
            notAllowedTr: tourEditNotAllowedTr.trim() || null,
            notAllowedZh: tourEditNotAllowedZh.trim() || null,
            whatsIncludedEn: tourEditWhatsIncludedEn.trim() || null,
            whatsIncludedTr: tourEditWhatsIncludedTr.trim() || null,
            whatsIncludedZh: tourEditWhatsIncludedZh.trim() || null,
            notIncludedEn: tourEditNotIncludedEn.trim() || null,
            notIncludedTr: tourEditNotIncludedTr.trim() || null,
            notIncludedZh: tourEditNotIncludedZh.trim() || null,
            faqsEn: tourEditFaqsEn.filter((f) => f.question.trim() && f.answer.trim()),
            faqsTr: tourEditFaqsTr.filter((f) => f.question.trim() && f.answer.trim()),
            faqsZh: tourEditFaqsZh.filter((f) => f.question.trim() && f.answer.trim()),
            destination: tourEditDestination,
            category: tourEditCategory || null,
            attractionIds: tourEditAttractionIds,
            basePrice: parseFloat(tourEditBasePrice) || 0,
            isAskForPrice: tourEditAskForPrice,
            isFeatured: tourEditFeatured,
            cancellationNoteEn: tourEditCancellationNoteEn.trim() || null,
            cancellationNoteTr: tourEditCancellationNoteTr.trim() || null,
            cancellationNoteZh: tourEditCancellationNoteZh.trim() || null,
            capacity: parseInt(tourEditCapacity, 10) || 0,
            hasTourType: tourEditHasTourType,
            hasAirportSelect: tourEditHasAirportSelect,
            hasReservationType: tourEditReservationTypeMode !== 'none',
            reservationTypeMode: tourEditReservationTypeMode,
            minAgeLimit: tourEditMinAgeLimit === '' ? null : parseInt(tourEditMinAgeLimit, 10),
            ageRestrictionEn: tourEditAgeRestrictionEn || null,
            ageRestrictionTr: tourEditAgeRestrictionTr || null,
            ageRestrictionZh: tourEditAgeRestrictionZh || null,
            ageGroups: tourEditAgeGroups.map((g, idx) => ({ ...g, sortOrder: idx })),
        });
        setEditSaving(false);
        if (result.ok) {
            const list = await getTours();
            setTours(list.map((t) => ({ id: t.id, titleEn: t.titleEn, type: t.type, basePrice: t.basePrice, hasReservationType: t.hasReservationType, reservationTypeMode: (t.reservationTypeMode as ReservationTypeMode | undefined) ?? 'private_regular' })));
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
        const reservationType = normalizeReservationType(tourEditReservationTypeMode, newVariant.reservationType ?? null);
        if (tourEditReservationTypeMode !== 'none' && !reservationType) {
            alert('Rezervasyon tipi zorunludur.');
            setVariantSaving(false);
            return;
        }
        const privateTierRows = toPaxPriceRows(newVariant.privatePriceTiers ?? null);
        const duplicatePax = privateTierRows.find((row, idx) => privateTierRows.findIndex((r) => r.pax === row.pax) !== idx);
        const enableTierPricing = canUseTierPricing((newVariant.pricingType as 'per_person' | 'per_vehicle' | undefined), tourEditReservationTypeMode, reservationType);
        if (enableTierPricing && duplicatePax) {
            alert(`Ayni kisi sayisi birden fazla kez girilemez: ${duplicatePax.pax}`);
            setVariantSaving(false);
            return;
        }
        const result = await createVariant({
            tourId: editTourId,
            tourType: newVariant.tourType ?? null,
            reservationType,
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
            childPrice: newVariant.childPrice != null ? Number(newVariant.childPrice) : null,
            pricingType: (newVariant.pricingType as 'per_person' | 'per_vehicle') || 'per_person',
            privatePriceTiers: enableTierPricing ? privateTierRows : null,
            sortOrder: variants.length,
            isActive: newVariant.isActive !== false,
            isRecommended: Boolean(newVariant.isRecommended),
        });
        setVariantSaving(false);
        if (result.ok) {
            getTourVariantsForAdmin(editTourId!).then(setVariants);
            setShowAddVariant(false);
            setNewVariant({ tourType: null, reservationType: normalizeReservationType(tourEditReservationTypeMode, null), airport: null, titleEn: '', titleTr: '', titleZh: '', descEn: '', descTr: '', descZh: '', includes: [], excludes: [], duration: null, languages: null, vehicleType: null, maxGroupSize: null, routeStops: null, adultPrice: 0, childPrice: null, pricingType: 'per_person', privatePriceTiers: null, sortOrder: variants.length, isActive: true, isRecommended: false });
        } else alert(result.error);
    };

    const handleDeleteVariant = async (variantId: string) => {
        if (!confirm('Bu varyantı silmek istediğinize emin misiniz?')) return;
        const result = await deleteVariant(variantId);
        if (result.ok && editTourId) getTourVariantsForAdmin(editTourId).then(setVariants);
        else if (!result.ok) alert(result.error);
    };

    const handleStartEditVariant = (v: TourVariantDisplay) => {
        setEditingVariantId(v.id);
        setShowAddVariant(false);
        setEditVariant({
            tourType: v.tourType,
            reservationType: normalizeReservationType(tourEditReservationTypeMode, v.reservationType),
            airport: v.airport,
            titleEn: v.titleEn,
            titleTr: v.titleTr,
            titleZh: v.titleZh,
            descEn: v.descEn,
            descTr: v.descTr,
            descZh: v.descZh,
            includes: v.includes,
            excludes: v.excludes,
            duration: v.duration,
            languages: v.languages,
            vehicleType: v.vehicleType,
            maxGroupSize: v.maxGroupSize,
            routeStops: v.routeStops,
            adultPrice: v.adultPrice,
            childPrice: v.childPrice,
            pricingType: v.pricingType,
            privatePriceTiers: toPaxPriceRows(v.privatePriceTiers ?? null),
            sortOrder: v.sortOrder,
            isActive: v.isActive,
            isRecommended: v.isRecommended,
        });
    };

    const handleUpdateVariant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingVariantId || !editVariant.titleEn?.trim()) {
            alert('Varyant başlığı (EN) zorunludur.');
            return;
        }
        setVariantSaving(true);
        const includes = typeof editVariant.includes === 'string' ? (editVariant.includes as string).split('\n').map((s) => s.trim()).filter(Boolean) : (editVariant.includes ?? []);
        const excludes = typeof editVariant.excludes === 'string' ? (editVariant.excludes as string).split('\n').map((s) => s.trim()).filter(Boolean) : (editVariant.excludes ?? []);
        const routeStops = typeof editVariant.routeStops === 'string' ? (editVariant.routeStops as string).split(',').map((s) => s.trim()).filter(Boolean) : (editVariant.routeStops ?? []);
        const reservationType = normalizeReservationType(tourEditReservationTypeMode, editVariant.reservationType ?? null);
        if (tourEditReservationTypeMode !== 'none' && !reservationType) {
            alert('Rezervasyon tipi zorunludur.');
            setVariantSaving(false);
            return;
        }
        const privateTierRows = toPaxPriceRows(editVariant.privatePriceTiers ?? null);
        const duplicatePax = privateTierRows.find((row, idx) => privateTierRows.findIndex((r) => r.pax === row.pax) !== idx);
        const enableTierPricing = canUseTierPricing((editVariant.pricingType as 'per_person' | 'per_vehicle' | undefined), tourEditReservationTypeMode, reservationType);
        if (enableTierPricing && duplicatePax) {
            alert(`Ayni kisi sayisi birden fazla kez girilemez: ${duplicatePax.pax}`);
            setVariantSaving(false);
            return;
        }
        const result = await updateVariant(editingVariantId, {
            tourType: editVariant.tourType ?? null,
            reservationType,
            airport: editVariant.airport ?? null,
            titleEn: editVariant.titleEn?.trim(),
            titleTr: (editVariant.titleTr ?? '').trim() || editVariant.titleEn?.trim(),
            titleZh: (editVariant.titleZh ?? '').trim() || editVariant.titleEn?.trim(),
            descEn: (editVariant.descEn ?? '').trim(),
            descTr: (editVariant.descTr ?? '').trim(),
            descZh: (editVariant.descZh ?? '').trim(),
            includes,
            excludes,
            duration: (editVariant.duration as string)?.trim() || null,
            languages: editVariant.languages ?? null,
            vehicleType: (editVariant.vehicleType as string)?.trim() || null,
            maxGroupSize: editVariant.maxGroupSize ?? null,
            routeStops: routeStops.length ? routeStops : null,
            adultPrice: Number(editVariant.adultPrice) || 0,
            childPrice: editVariant.childPrice != null ? Number(editVariant.childPrice) : null,
            pricingType: (editVariant.pricingType as 'per_person' | 'per_vehicle') || 'per_person',
            privatePriceTiers: enableTierPricing ? privateTierRows : null,
            sortOrder: editVariant.sortOrder ?? 0,
            isActive: editVariant.isActive !== false,
            isRecommended: Boolean(editVariant.isRecommended),
        });
        setVariantSaving(false);
        if (result.ok && editTourId) {
            await getTourVariantsForAdmin(editTourId).then(setVariants);
            setEditingVariantId(null);
        } else if (!result.ok) {
            alert(result.error);
        }
    };

    const openEditTour = (tourId: string) => {
        setEditTourId(tourId);
    };

    const handleDeleteTour = async (tourId: string) => {
        if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
        const result = await deleteTour(tourId);
        if (!result.ok) {
            alert(result.error);
            return;
        }
        const list = await getTours();
        setTours(list.map((t) => ({ id: t.id, titleEn: t.titleEn, type: t.type, basePrice: t.basePrice, hasReservationType: t.hasReservationType, reservationTypeMode: (t.reservationTypeMode as ReservationTypeMode | undefined) ?? 'private_regular' })));
        if (editTourId === tourId) {
            setEditTourId(null);
            setVariants([]);
            setShowAddVariant(false);
            setEditingVariantId(null);
        }
    };

    const addDefaultAgeGroupRow = (target: 'new' | 'edit') => {
        const next: AgeGroupDraft = {
            minAge: 0,
            maxAge: 99,
            pricingType: 'adult',
            descriptionEn: 'Adult price applies',
            descriptionTr: 'Yetişkin fiyatı uygulanır',
            descriptionZh: '成人价格适用',
        };
        if (target === 'new') setNewAgeGroups((prev) => [...prev, next]);
        else setTourEditAgeGroups((prev) => [...prev, next]);
    };

    const uploadImageToCloudinary = async (file: File): Promise<string> => {
        const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
        if (!cloud || !preset) throw new Error('Cloudinary env eksik: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME / NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET');
        const body = new FormData();
        body.append('file', file);
        body.append('upload_preset', preset);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
            method: 'POST',
            body,
        });
        if (!res.ok) throw new Error('Görsel upload başarısız');
        const json = (await res.json()) as { secure_url?: string };
        if (!json.secure_url) throw new Error('Upload URL alınamadı');
        return json.secure_url;
    };

    const handleUploadImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editTourId) return;
        const file = e.target.files?.[0];
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            alert('Sadece JPG/PNG/WebP desteklenir.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert('Maksimum dosya boyutu 5MB.');
            return;
        }
        setImageUploading(true);
        try {
            const url = await uploadImageToCloudinary(file);
            const result = await addTourImage(editTourId, { url });
            if (!result.ok) throw new Error(result.error ?? 'Görsel kaydedilemedi');
            const refreshed = await getTourById(editTourId);
            const rec = refreshed as { images?: { id: string; url: string; isPrimary: boolean }[] } | null;
            setTourImages((rec?.images ?? []).map((img) => ({ id: img.id, url: img.url, isPrimary: img.isPrimary })));
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Yükleme başarısız');
        } finally {
            setImageUploading(false);
            e.target.value = '';
        }
    };

    const handleAddImageByUrl = async () => {
        if (!editTourId || !imageUrlInput.trim()) return;
        const result = await addTourImage(editTourId, { url: imageUrlInput.trim() });
        if (!result.ok) {
            alert(result.error);
            return;
        }
        setImageUrlInput('');
        const refreshed = await getTourById(editTourId);
        const rec = refreshed as { images?: { id: string; url: string; isPrimary: boolean }[] } | null;
        setTourImages((rec?.images ?? []).map((img) => ({ id: img.id, url: img.url, isPrimary: img.isPrimary })));
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
                <h1>Ürünler Yönetimi</h1>
                <Button onClick={() => setShowNewTourForm((v) => !v)}>
                    {showNewTourForm ? 'Formu kapat' : 'Yeni Ürün Ekle'}
                </Button>
            </div>

            <h2>Ürün Kataloğu</h2>
            <div className="card" style={{ overflowX: 'auto', marginTop: 'var(--space-md)', marginBottom: 'var(--space-2xl)' }}>
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
                                        <Button variant="secondary" style={{ padding: '4px 8px', fontSize: '0.8rem', marginRight: 'var(--space-xs)' }} onClick={() => openEditTour(t.id)}>Düzenle</Button>
                                        <Button variant="secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => handleDeleteTour(t.id)}>Sil</Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
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
                                <option value="TOUR">TOUR</option>
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
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 'bold' }}>Gezi Noktalari</label>
                            <select
                                multiple
                                value={newAttractionIds}
                                onChange={(e) => setNewAttractionIds(Array.from(e.target.selectedOptions).map((opt) => opt.value))}
                                style={{ width: '100%', minHeight: 110, padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                            >
                                {attractions.map((a) => (
                                    <option key={a.id} value={a.id}>{a.nameTr || a.nameEn}</option>
                                ))}
                            </select>
                            <small style={{ color: 'var(--color-text-muted)' }}>Birden fazla secim icin Cmd/Ctrl kullanin.</small>
                        </div>
                        <Input label="Başlık (EN) *" value={newTitleEn} onChange={(e) => setNewTitleEn(e.target.value)} placeholder="e.g. Green Tour" required />
                        <Input label="Başlık (TR)" value={newTitleTr} onChange={(e) => setNewTitleTr(e.target.value)} placeholder="e.g. Yeşil Tur" />
                        <Input label="Başlık (ZH)" value={newTitleZh} onChange={(e) => setNewTitleZh(e.target.value)} placeholder="e.g. 绿线之旅" />
                        <div>
                            <Input
                                label="Slug (SEO URL)"
                                value={newSlug}
                                onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, ''))}
                                placeholder="e.g. cappadocia-green-tour"
                            />
                            <small style={{ color: 'var(--color-text-muted)' }}>
                                Boş bırakılırsa id kullanılır. Sadece küçük harf, rakam ve tire.
                            </small>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 'bold' }}>Satış Etiketleri</label>
                            <small style={{ display: 'block', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                                Ürün kartlarında ve tur detayında rozet olarak gösterilecek etiketleri seçin.
                            </small>
                            <SalesTagsPicker value={newSalesTags} onChange={setNewSalesTags} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 'bold' }}>Başlangıç Saatleri</label>
                            <small style={{ display: 'block', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                                Ürün birden fazla saatte çalışıyorsa tümünü ekleyin. Misafir rezervasyon ekranında seçim yapar.
                            </small>
                            <StartTimesEditor value={newStartTimes} onChange={setNewStartTimes} />
                        </div>
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
                        <div style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: 'var(--space-md)' }}>
                            <strong style={{ display: 'block', marginBottom: 'var(--space-sm)' }}>Urun Detay Bolumleri</strong>
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Highlights (EN)</label>
                            <textarea value={newHighlightsEn} onChange={(e) => setNewHighlightsEn(e.target.value)} rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} placeholder="Her satira bir madde yazin" />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Highlights (TR)</label>
                            <textarea value={newHighlightsTr} onChange={(e) => setNewHighlightsTr(e.target.value)} rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} placeholder="Her satira bir madde yazin" />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Highlights (ZH)</label>
                            <textarea value={newHighlightsZh} onChange={(e) => setNewHighlightsZh(e.target.value)} rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 12 }} placeholder="Her satira bir madde yazin" />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Itinerary (EN)</label>
                            <textarea value={newItineraryEn} onChange={(e) => setNewItineraryEn(e.target.value)} rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Itinerary (TR)</label>
                            <textarea value={newItineraryTr} onChange={(e) => setNewItineraryTr(e.target.value)} rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Itinerary (ZH)</label>
                            <textarea value={newItineraryZh} onChange={(e) => setNewItineraryZh(e.target.value)} rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 12 }} />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Know Before You Go (EN)</label>
                            <textarea value={newKnowBeforeEn} onChange={(e) => setNewKnowBeforeEn(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Know Before You Go (TR)</label>
                            <textarea value={newKnowBeforeTr} onChange={(e) => setNewKnowBeforeTr(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Know Before You Go (ZH)</label>
                            <textarea value={newKnowBeforeZh} onChange={(e) => setNewKnowBeforeZh(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Not Suitable For (EN)</label>
                            <textarea value={newNotSuitableEn} onChange={(e) => setNewNotSuitableEn(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Not Suitable For (TR)</label>
                            <textarea value={newNotSuitableTr} onChange={(e) => setNewNotSuitableTr(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Not Suitable For (ZH)</label>
                            <textarea value={newNotSuitableZh} onChange={(e) => setNewNotSuitableZh(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Not Allowed (EN)</label>
                            <textarea value={newNotAllowedEn} onChange={(e) => setNewNotAllowedEn(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Not Allowed (TR)</label>
                            <textarea value={newNotAllowedTr} onChange={(e) => setNewNotAllowedTr(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Not Allowed (ZH)</label>
                            <textarea value={newNotAllowedZh} onChange={(e) => setNewNotAllowedZh(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 12 }} />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>What&apos;s Included (EN)</label>
                            <textarea value={newWhatsIncludedEn} onChange={(e) => setNewWhatsIncludedEn(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} placeholder="Her satıra bir madde" />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>What&apos;s Included (TR)</label>
                            <textarea value={newWhatsIncludedTr} onChange={(e) => setNewWhatsIncludedTr(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} placeholder="Her satıra bir madde" />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>What&apos;s Included (ZH)</label>
                            <textarea value={newWhatsIncludedZh} onChange={(e) => setNewWhatsIncludedZh(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 12 }} placeholder="Her satıra bir madde" />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Not Included (EN)</label>
                            <textarea value={newNotIncludedEn} onChange={(e) => setNewNotIncludedEn(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} placeholder="Her satıra bir madde" />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Not Included (TR)</label>
                            <textarea value={newNotIncludedTr} onChange={(e) => setNewNotIncludedTr(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} placeholder="Her satıra bir madde" />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Not Included (ZH)</label>
                            <textarea value={newNotIncludedZh} onChange={(e) => setNewNotIncludedZh(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 12 }} placeholder="Her satıra bir madde" />
                            <div style={{ marginBottom: 10 }}>
                                <strong>FAQs (EN)</strong>
                                <Button type="button" variant="secondary" style={{ marginLeft: 8 }} onClick={() => addFaqItem('newEn')}>+ FAQ</Button>
                                {newFaqsEn.map((faq, idx) => (
                                    <div key={`new-en-${idx}`} style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 8, marginTop: 8 }}>
                                        <Input label="Question" value={faq.question} onChange={(e) => updateFaqItem('newEn', idx, 'question', e.target.value)} />
                                        <Input label="Answer" value={faq.answer} onChange={(e) => updateFaqItem('newEn', idx, 'answer', e.target.value)} />
                                        <Button type="button" variant="secondary" onClick={() => removeFaqItem('newEn', idx)}>Sil</Button>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginBottom: 10 }}>
                                <strong>FAQs (TR)</strong>
                                <Button type="button" variant="secondary" style={{ marginLeft: 8 }} onClick={() => addFaqItem('newTr')}>+ FAQ</Button>
                                {newFaqsTr.map((faq, idx) => (
                                    <div key={`new-tr-${idx}`} style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 8, marginTop: 8 }}>
                                        <Input label="Soru" value={faq.question} onChange={(e) => updateFaqItem('newTr', idx, 'question', e.target.value)} />
                                        <Input label="Cevap" value={faq.answer} onChange={(e) => updateFaqItem('newTr', idx, 'answer', e.target.value)} />
                                        <Button type="button" variant="secondary" onClick={() => removeFaqItem('newTr', idx)}>Sil</Button>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginBottom: 10 }}>
                                <strong>FAQs (ZH)</strong>
                                <Button type="button" variant="secondary" style={{ marginLeft: 8 }} onClick={() => addFaqItem('newZh')}>+ FAQ</Button>
                                {newFaqsZh.map((faq, idx) => (
                                    <div key={`new-zh-${idx}`} style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 8, marginTop: 8 }}>
                                        <Input label="问题" value={faq.question} onChange={(e) => updateFaqItem('newZh', idx, 'question', e.target.value)} />
                                        <Input label="答案" value={faq.answer} onChange={(e) => updateFaqItem('newZh', idx, 'answer', e.target.value)} />
                                        <Button type="button" variant="secondary" onClick={() => removeFaqItem('newZh', idx)}>Sil</Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                            <input type="checkbox" checked={newAskForPrice} onChange={(e) => setNewAskForPrice(e.target.checked)} />
                            <span>Ask for Price — fiyat gizlenir, müşteri formu ile talep eder</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                            <input type="checkbox" checked={newFeatured} onChange={(e) => setNewFeatured(e.target.checked)} />
                            <span>Öne çıkar (ana sayfa Best Selling, en fazla 4)</span>
                        </label>
                        <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>İptal / İade notu (EN) — ürün sayfasında modal</label>
                        <textarea value={newCancellationNoteEn} onChange={(e) => setNewCancellationNoteEn(e.target.value)} rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} placeholder="Optional" />
                        <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>İptal / İade notu (TR)</label>
                        <textarea value={newCancellationNoteTr} onChange={(e) => setNewCancellationNoteTr(e.target.value)} rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} />
                        <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>İptal / İade notu (ZH)</label>
                        <textarea value={newCancellationNoteZh} onChange={(e) => setNewCancellationNoteZh(e.target.value)} rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 12 }} />
                        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                            <Input label="Başlangıç fiyatı (€)" type="number" step="0.01" value={newBasePrice} onChange={(e) => setNewBasePrice(e.target.value)} disabled={newAskForPrice} />
                            <Input label="Kapasite" type="number" min={1} value={newCapacity} onChange={(e) => setNewCapacity(e.target.value)} />
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <input type="checkbox" checked={newHasTourType} onChange={(e) => setNewHasTourType(e.target.checked)} />
                            <span>Eco/Plus (Tur Tipi) seçeneği var</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <input type="checkbox" checked={newHasAirportSelect} onChange={(e) => setNewHasAirportSelect(e.target.checked)} />
                            <span>Havalimanı (NAV/ASR) seçeneği var</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <input
                                type="checkbox"
                                checked={newHasReservationType}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    setNewHasReservationType(checked);
                                    if (!checked) setNewReservationTypeMode('none');
                                    else if (newReservationTypeMode === 'none') setNewReservationTypeMode('private_regular');
                                }}
                            />
                            <span>Private/Regular seçeneği var</span>
                        </label>
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 'bold' }}>Reservation Type Seçenek Sayısı</label>
                            <select
                                value={newReservationTypeMode}
                                onChange={(e) => setNewReservationTypeMode(e.target.value as ReservationTypeMode)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                            >
                                <option value="private_regular">Private/Regular</option>
                                <option value="option2">2 Seçenek (Option 1 / Option 2)</option>
                                <option value="option3">3 Seçenek (Option 1 / Option 2 / Option 3)</option>
                                <option value="option4">4 Seçenek (Option 1 / Option 2 / Option 3 / Option 4)</option>
                                <option value="none">Yok</option>
                            </select>
                        </div>
                        <div style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: 'var(--space-md)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                                <strong>Yaş Politikası</strong>
                                <Button type="button" variant="secondary" onClick={() => addDefaultAgeGroupRow('new')}>+ Yaş Grubu Ekle</Button>
                            </div>
                            <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                                {newAgeGroups.map((group, idx) => (
                                    <div key={idx} style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 'var(--space-sm)' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 'var(--space-sm)', alignItems: 'end' }}>
                                            <Input label="Min yaş" type="number" min={0} value={String(group.minAge)} onChange={(e) => setNewAgeGroups((prev) => prev.map((g, i) => i === idx ? { ...g, minAge: parseInt(e.target.value, 10) || 0 } : g))} />
                                            <Input label="Max yaş" type="number" min={0} value={String(group.maxAge)} onChange={(e) => setNewAgeGroups((prev) => prev.map((g, i) => i === idx ? { ...g, maxAge: parseInt(e.target.value, 10) || 0 } : g))} />
                                            <div>
                                                <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Fiyat tipi</label>
                                                <select value={group.pricingType} onChange={(e) => setNewAgeGroups((prev) => prev.map((g, i) => i === idx ? { ...g, pricingType: e.target.value as AgeGroupDraft['pricingType'] } : g))} style={{ width: '100%', padding: '0.5rem', borderRadius: 4, border: '1px solid var(--color-border)' }}>
                                                    <option value="free">Ücretsiz</option>
                                                    <option value="child">Çocuk fiyatı</option>
                                                    <option value="adult">Yetişkin fiyatı</option>
                                                    <option value="not_allowed">İzin verilmez</option>
                                                </select>
                                            </div>
                                            <Button type="button" variant="secondary" onClick={() => setNewAgeGroups((prev) => prev.filter((_, i) => i !== idx))}>Kaldır</Button>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                                            <Input label="Açıklama (EN)" value={group.descriptionEn} onChange={(e) => setNewAgeGroups((prev) => prev.map((g, i) => i === idx ? { ...g, descriptionEn: e.target.value } : g))} />
                                            <Input label="Açıklama (TR)" value={group.descriptionTr} onChange={(e) => setNewAgeGroups((prev) => prev.map((g, i) => i === idx ? { ...g, descriptionTr: e.target.value } : g))} />
                                            <Input label="Açıklama (ZH)" value={group.descriptionZh} onChange={(e) => setNewAgeGroups((prev) => prev.map((g, i) => i === idx ? { ...g, descriptionZh: e.target.value } : g))} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 1fr', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                                <Input label="Min yaş sınırı" type="number" min={0} value={newMinAgeLimit} onChange={(e) => setNewMinAgeLimit(e.target.value)} placeholder="boş=limitsiz" />
                                <Input label="Kısıtlama (EN)" value={newAgeRestrictionEn} onChange={(e) => setNewAgeRestrictionEn(e.target.value)} />
                                <Input label="Kısıtlama (TR)" value={newAgeRestrictionTr} onChange={(e) => setNewAgeRestrictionTr(e.target.value)} />
                                <Input label="Kısıtlama (ZH)" value={newAgeRestrictionZh} onChange={(e) => setNewAgeRestrictionZh(e.target.value)} />
                            </div>
                        </div>
                        {newType === 'ACTIVITY' && (
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                ACTIVITY ürünlerinde süre, konum ve kişi limiti gibi alanları varyant formundan yönetebilirsiniz.
                            </p>
                        )}
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
                    <TourRetranslateButton tourId={editTourId} />
                    <div style={{ display: 'grid', gap: 'var(--space-md)', maxWidth: 560 }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 'bold' }}>Tip</label>
                            <select
                                value={tourEditType}
                                onChange={(e) => setTourEditType(e.target.value as TourType)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                            >
                                <option value="TOUR">TOUR</option>
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
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 'bold' }}>Gezi Noktalari</label>
                            <select
                                multiple
                                value={tourEditAttractionIds}
                                onChange={(e) => setTourEditAttractionIds(Array.from(e.target.selectedOptions).map((opt) => opt.value))}
                                style={{ width: '100%', minHeight: 110, padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                            >
                                {attractions.map((a) => (
                                    <option key={a.id} value={a.id}>{a.nameTr || a.nameEn}</option>
                                ))}
                            </select>
                            <small style={{ color: 'var(--color-text-muted)' }}>Birden fazla secim icin Cmd/Ctrl kullanin.</small>
                        </div>
                        <Input label="Başlık (EN) *" value={tourEditTitleEn} onChange={(e) => setTourEditTitleEn(e.target.value)} placeholder="e.g. Green Tour" required />
                        <Input label="Başlık (TR)" value={tourEditTitleTr} onChange={(e) => setTourEditTitleTr(e.target.value)} placeholder="e.g. Yeşil Tur" />
                        <Input label="Başlık (ZH)" value={tourEditTitleZh} onChange={(e) => setTourEditTitleZh(e.target.value)} placeholder="e.g. 绿线之旅" />
                        <div>
                            <Input
                                label="Slug (SEO URL)"
                                value={tourEditSlug}
                                onChange={(e) => setTourEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, ''))}
                                placeholder="e.g. cappadocia-green-tour"
                            />
                            <small style={{ color: 'var(--color-text-muted)' }}>
                                Boş bırakılırsa id kullanılır. Benzersiz olmalı.
                            </small>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 'bold' }}>Satış Etiketleri</label>
                            <small style={{ display: 'block', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                                Ürün kartlarında ve tur detayında rozet olarak gösterilecek etiketleri seçin.
                            </small>
                            <SalesTagsPicker value={tourEditSalesTags} onChange={setTourEditSalesTags} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 'bold' }}>Başlangıç Saatleri</label>
                            <small style={{ display: 'block', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                                Ürün birden fazla saatte çalışıyorsa tümünü ekleyin. Misafir rezervasyon ekranında seçim yapar.
                            </small>
                            <StartTimesEditor value={tourEditStartTimes} onChange={setTourEditStartTimes} />
                        </div>
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
                        <div style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: 'var(--space-md)' }}>
                            <strong style={{ display: 'block', marginBottom: 'var(--space-sm)' }}>Urun Detay Bolumleri</strong>
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Highlights (EN)</label>
                            <textarea value={tourEditHighlightsEn} onChange={(e) => setTourEditHighlightsEn(e.target.value)} rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} placeholder="Her satira bir madde yazin" />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Highlights (TR)</label>
                            <textarea value={tourEditHighlightsTr} onChange={(e) => setTourEditHighlightsTr(e.target.value)} rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} placeholder="Her satira bir madde yazin" />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Highlights (ZH)</label>
                            <textarea value={tourEditHighlightsZh} onChange={(e) => setTourEditHighlightsZh(e.target.value)} rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 12 }} placeholder="Her satira bir madde yazin" />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Itinerary (EN)</label>
                            <textarea value={tourEditItineraryEn} onChange={(e) => setTourEditItineraryEn(e.target.value)} rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Itinerary (TR)</label>
                            <textarea value={tourEditItineraryTr} onChange={(e) => setTourEditItineraryTr(e.target.value)} rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Itinerary (ZH)</label>
                            <textarea value={tourEditItineraryZh} onChange={(e) => setTourEditItineraryZh(e.target.value)} rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 12 }} />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Know Before You Go (EN)</label>
                            <textarea value={tourEditKnowBeforeEn} onChange={(e) => setTourEditKnowBeforeEn(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Know Before You Go (TR)</label>
                            <textarea value={tourEditKnowBeforeTr} onChange={(e) => setTourEditKnowBeforeTr(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Know Before You Go (ZH)</label>
                            <textarea value={tourEditKnowBeforeZh} onChange={(e) => setTourEditKnowBeforeZh(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Not Suitable For (EN)</label>
                            <textarea value={tourEditNotSuitableEn} onChange={(e) => setTourEditNotSuitableEn(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Not Suitable For (TR)</label>
                            <textarea value={tourEditNotSuitableTr} onChange={(e) => setTourEditNotSuitableTr(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Not Suitable For (ZH)</label>
                            <textarea value={tourEditNotSuitableZh} onChange={(e) => setTourEditNotSuitableZh(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Not Allowed (EN)</label>
                            <textarea value={tourEditNotAllowedEn} onChange={(e) => setTourEditNotAllowedEn(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Not Allowed (TR)</label>
                            <textarea value={tourEditNotAllowedTr} onChange={(e) => setTourEditNotAllowedTr(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Not Allowed (ZH)</label>
                            <textarea value={tourEditNotAllowedZh} onChange={(e) => setTourEditNotAllowedZh(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 12 }} />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>What&apos;s Included (EN)</label>
                            <textarea value={tourEditWhatsIncludedEn} onChange={(e) => setTourEditWhatsIncludedEn(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} placeholder="Her satıra bir madde" />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>What&apos;s Included (TR)</label>
                            <textarea value={tourEditWhatsIncludedTr} onChange={(e) => setTourEditWhatsIncludedTr(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} placeholder="Her satıra bir madde" />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>What&apos;s Included (ZH)</label>
                            <textarea value={tourEditWhatsIncludedZh} onChange={(e) => setTourEditWhatsIncludedZh(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 12 }} placeholder="Her satıra bir madde" />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Not Included (EN)</label>
                            <textarea value={tourEditNotIncludedEn} onChange={(e) => setTourEditNotIncludedEn(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} placeholder="Her satıra bir madde" />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Not Included (TR)</label>
                            <textarea value={tourEditNotIncludedTr} onChange={(e) => setTourEditNotIncludedTr(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} placeholder="Her satıra bir madde" />
                            <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>Not Included (ZH)</label>
                            <textarea value={tourEditNotIncludedZh} onChange={(e) => setTourEditNotIncludedZh(e.target.value)} rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 12 }} placeholder="Her satıra bir madde" />
                            <div style={{ marginBottom: 10 }}>
                                <strong>FAQs (EN)</strong>
                                <Button type="button" variant="secondary" style={{ marginLeft: 8 }} onClick={() => addFaqItem('editEn')}>+ FAQ</Button>
                                {tourEditFaqsEn.map((faq, idx) => (
                                    <div key={`edit-en-${idx}`} style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 8, marginTop: 8 }}>
                                        <Input label="Question" value={faq.question} onChange={(e) => updateFaqItem('editEn', idx, 'question', e.target.value)} />
                                        <Input label="Answer" value={faq.answer} onChange={(e) => updateFaqItem('editEn', idx, 'answer', e.target.value)} />
                                        <Button type="button" variant="secondary" onClick={() => removeFaqItem('editEn', idx)}>Sil</Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                            <input type="checkbox" checked={tourEditAskForPrice} onChange={(e) => setTourEditAskForPrice(e.target.checked)} />
                            <span>Ask for Price — fiyat gizlenir, müşteri formu ile talep eder</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                            <input type="checkbox" checked={tourEditFeatured} onChange={(e) => setTourEditFeatured(e.target.checked)} />
                            <span>Öne çıkar (ana sayfa Best Selling, en fazla 4)</span>
                        </label>
                        <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>İptal / İade notu (EN)</label>
                        <textarea value={tourEditCancellationNoteEn} onChange={(e) => setTourEditCancellationNoteEn(e.target.value)} rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} />
                        <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>İptal / İade notu (TR)</label>
                        <textarea value={tourEditCancellationNoteTr} onChange={(e) => setTourEditCancellationNoteTr(e.target.value)} rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 8 }} />
                        <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold' }}>İptal / İade notu (ZH)</label>
                        <textarea value={tourEditCancellationNoteZh} onChange={(e) => setTourEditCancellationNoteZh(e.target.value)} rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', marginBottom: 12 }} />
                        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                            <Input label="Başlangıç fiyatı (€)" type="number" step="0.01" value={tourEditBasePrice} onChange={(e) => setTourEditBasePrice(e.target.value)} disabled={tourEditAskForPrice} />
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
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <input
                                type="checkbox"
                                checked={tourEditHasReservationType}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    setTourEditHasReservationType(checked);
                                    if (!checked) setTourEditReservationTypeMode('none');
                                    else if (tourEditReservationTypeMode === 'none') setTourEditReservationTypeMode('private_regular');
                                }}
                            />
                            <span>Private/Regular seçeneği var</span>
                        </label>
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 'bold' }}>Reservation Type Seçenek Sayısı</label>
                            <select
                                value={tourEditReservationTypeMode}
                                onChange={(e) => setTourEditReservationTypeMode(e.target.value as ReservationTypeMode)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                            >
                                <option value="private_regular">Private/Regular</option>
                                <option value="option2">2 Seçenek (Option 1 / Option 2)</option>
                                <option value="option3">3 Seçenek (Option 1 / Option 2 / Option 3)</option>
                                <option value="option4">4 Seçenek (Option 1 / Option 2 / Option 3 / Option 4)</option>
                                <option value="none">Yok</option>
                            </select>
                        </div>
                        <div style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: 'var(--space-md)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                                <strong>Yaş Politikası</strong>
                                <Button type="button" variant="secondary" onClick={() => addDefaultAgeGroupRow('edit')}>+ Yaş Grubu Ekle</Button>
                            </div>
                            <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                                {tourEditAgeGroups.map((group, idx) => (
                                    <div key={idx} style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 'var(--space-sm)' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 'var(--space-sm)', alignItems: 'end' }}>
                                            <Input label="Min yaş" type="number" min={0} value={String(group.minAge)} onChange={(e) => setTourEditAgeGroups((prev) => prev.map((g, i) => i === idx ? { ...g, minAge: parseInt(e.target.value, 10) || 0 } : g))} />
                                            <Input label="Max yaş" type="number" min={0} value={String(group.maxAge)} onChange={(e) => setTourEditAgeGroups((prev) => prev.map((g, i) => i === idx ? { ...g, maxAge: parseInt(e.target.value, 10) || 0 } : g))} />
                                            <div>
                                                <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>Fiyat tipi</label>
                                                <select value={group.pricingType} onChange={(e) => setTourEditAgeGroups((prev) => prev.map((g, i) => i === idx ? { ...g, pricingType: e.target.value as AgeGroupDraft['pricingType'] } : g))} style={{ width: '100%', padding: '0.5rem', borderRadius: 4, border: '1px solid var(--color-border)' }}>
                                                    <option value="free">Ücretsiz</option>
                                                    <option value="child">Çocuk fiyatı</option>
                                                    <option value="adult">Yetişkin fiyatı</option>
                                                    <option value="not_allowed">İzin verilmez</option>
                                                </select>
                                            </div>
                                            <Button type="button" variant="secondary" onClick={() => setTourEditAgeGroups((prev) => prev.filter((_, i) => i !== idx))}>Kaldır</Button>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                                            <Input label="Açıklama (EN)" value={group.descriptionEn} onChange={(e) => setTourEditAgeGroups((prev) => prev.map((g, i) => i === idx ? { ...g, descriptionEn: e.target.value } : g))} />
                                            <Input label="Açıklama (TR)" value={group.descriptionTr} onChange={(e) => setTourEditAgeGroups((prev) => prev.map((g, i) => i === idx ? { ...g, descriptionTr: e.target.value } : g))} />
                                            <Input label="Açıklama (ZH)" value={group.descriptionZh} onChange={(e) => setTourEditAgeGroups((prev) => prev.map((g, i) => i === idx ? { ...g, descriptionZh: e.target.value } : g))} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 1fr', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                                <Input label="Min yaş sınırı" type="number" min={0} value={tourEditMinAgeLimit} onChange={(e) => setTourEditMinAgeLimit(e.target.value)} placeholder="boş=limitsiz" />
                                <Input label="Kısıtlama (EN)" value={tourEditAgeRestrictionEn} onChange={(e) => setTourEditAgeRestrictionEn(e.target.value)} />
                                <Input label="Kısıtlama (TR)" value={tourEditAgeRestrictionTr} onChange={(e) => setTourEditAgeRestrictionTr(e.target.value)} />
                                <Input label="Kısıtlama (ZH)" value={tourEditAgeRestrictionZh} onChange={(e) => setTourEditAgeRestrictionZh(e.target.value)} />
                            </div>
                        </div>
                        <div style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: 'var(--space-md)' }}>
                            <strong style={{ display: 'block', marginBottom: 'var(--space-sm)' }}>Ürün Fotoğrafları</strong>
                            <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', marginBottom: 'var(--space-sm)', flexWrap: 'wrap' }}>
                                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUploadImageFile} disabled={imageUploading} />
                                <Input label="Veya görsel URL" value={imageUrlInput} onChange={(e) => setImageUrlInput(e.target.value)} placeholder="https://..." />
                                <Button type="button" variant="secondary" onClick={handleAddImageByUrl}>URL Ekle</Button>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                JPG/PNG/WebP, max 5MB. Ana görsel yıldız ile seçilir.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                                {tourImages.map((img) => (
                                    <div key={img.id} style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 'var(--space-xs)' }}>
                                        <img src={img.url} alt="Tour image preview" style={{ width: '100%', height: 90, objectFit: 'cover', borderRadius: 6 }} />
                                        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                                            <button type="button" className="btn btn-secondary btn-sm" onClick={async () => { await setPrimaryTourImage(img.id); const refreshed = await getTourById(editTourId!); const rec = refreshed as { images?: { id: string; url: string; isPrimary: boolean }[] } | null; setTourImages((rec?.images ?? []).map((x) => ({ id: x.id, url: x.url, isPrimary: x.isPrimary }))); }}>{img.isPrimary ? '★ Ana' : '☆ Ana yap'}</button>
                                            <button type="button" className="btn btn-secondary btn-sm" onClick={async () => { await moveTourImage(img.id, 'up'); const refreshed = await getTourById(editTourId!); const rec = refreshed as { images?: { id: string; url: string; isPrimary: boolean }[] } | null; setTourImages((rec?.images ?? []).map((x) => ({ id: x.id, url: x.url, isPrimary: x.isPrimary }))); }}>↑</button>
                                            <button type="button" className="btn btn-secondary btn-sm" onClick={async () => { await moveTourImage(img.id, 'down'); const refreshed = await getTourById(editTourId!); const rec = refreshed as { images?: { id: string; url: string; isPrimary: boolean }[] } | null; setTourImages((rec?.images ?? []).map((x) => ({ id: x.id, url: x.url, isPrimary: x.isPrimary }))); }}>↓</button>
                                            <button type="button" className="btn btn-secondary btn-sm" onClick={async () => { if (!confirm('Görsel silinsin mi?')) return; await deleteTourImage(img.id); const refreshed = await getTourById(editTourId!); const rec = refreshed as { images?: { id: string; url: string; isPrimary: boolean }[] } | null; setTourImages((rec?.images ?? []).map((x) => ({ id: x.id, url: x.url, isPrimary: x.isPrimary }))); }}>✕</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
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
                    {tourEditReservationTypeMode !== 'none' && variants.some((v) => !isReservationTypeCompatible(tourEditReservationTypeMode, v.reservationType)) && (
                        <div style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-sm)', borderRadius: 8, border: '1px solid #f59e0b', background: '#fff7ed', color: '#9a3412', fontSize: '0.9rem' }}>
                            Bu ürünün reservation type modu ile uyumsuz varyantlar var. Frontend&apos;de görünür olması için varyantları düzenleyip doğru seçeneklere (Option 1/2/3 veya Regular/Private) atayın.
                        </div>
                    )}
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
                                    {tourEditReservationTypeMode !== 'none' ? (
                                        <select
                                            value={normalizeReservationType(tourEditReservationTypeMode, newVariant.reservationType ?? null) ?? ''}
                                            onChange={(e) => setNewVariant((v) => ({ ...v, reservationType: e.target.value }))}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                                        >
                                            {getReservationTypeOptions(tourEditReservationTypeMode).map((opt) => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div style={{ padding: '0.5rem', borderRadius: 4, border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                            Bu üründe Private/Regular kapalı. Bu varyantta rezervasyon tipi boş bırakılacak.
                                        </div>
                                    )}
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
                                    <Input label="Çocuk fiyatı — 4-7 yaş (€, boş = yetişkin ile aynı)" type="number" step="0.01" value={newVariant.childPrice != null ? String(newVariant.childPrice) : ''} onChange={(e) => setNewVariant((v) => ({ ...v, childPrice: e.target.value === '' ? null : parseFloat(e.target.value) }))} />
                                </div>
                                <div style={{ padding: 'var(--space-sm)', borderRadius: 8, background: 'var(--color-bg-alt)', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                                    <strong>ℹ️ Yaş politikası:</strong> 0-3 yaş: Ücretsiz · 4-7 yaş: Çocuk fiyatı · 7+ yaş: Yetişkin fiyatı
                                </div>
                                {canUseTierPricing((newVariant.pricingType as 'per_person' | 'per_vehicle' | undefined), tourEditReservationTypeMode, normalizeReservationType(tourEditReservationTypeMode, newVariant.reservationType ?? null)) && (
                                    <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 'var(--space-md)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                                            <strong>Kişi-fiyat kademeleri</strong>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={() =>
                                                    updateVariantTierRows('new', (rows) => [
                                                        ...rows,
                                                        { pax: rows.length > 0 ? rows[rows.length - 1].pax + 1 : 1, totalPrice: Number(newVariant.adultPrice) || 0 },
                                                    ])
                                                }
                                            >
                                                Kademe ekle
                                            </Button>
                                        </div>
                                        <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                                            {toPaxPriceRows(newVariant.privatePriceTiers ?? null).map((tier, idx) => (
                                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 'var(--space-sm)', alignItems: 'end' }}>
                                                    <Input
                                                        label="Kişi sayısı"
                                                        type="number"
                                                        min={1}
                                                        value={String(tier.pax)}
                                                        onChange={(e) => updateVariantTierRows('new', (rows) => rows.map((r, i) => (i === idx ? { ...r, pax: parseInt(e.target.value, 10) || 1 } : r)))}
                                                    />
                                                    <Input
                                                        label="Toplam fiyat (€)"
                                                        type="number"
                                                        step="0.01"
                                                        min={0}
                                                        value={String(tier.totalPrice)}
                                                        onChange={(e) => updateVariantTierRows('new', (rows) => rows.map((r, i) => (i === idx ? { ...r, totalPrice: parseFloat(e.target.value) || 0 } : r)))}
                                                    />
                                                    <Button type="button" variant="secondary" onClick={() => updateVariantTierRows('new', (rows) => rows.filter((_, i) => i !== idx))}>
                                                        Sil
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                        <p style={{ marginTop: 'var(--space-sm)', marginBottom: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                            Her kişi sayısı bir kez girilmelidir. Kademeler kişi sayısına göre otomatik sıralanır.
                                        </p>
                                    </div>
                                )}
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Açıklama (EN)</label>
                                    <textarea value={newVariant.descEn ?? ''} onChange={(e) => setNewVariant((v) => ({ ...v, descEn: e.target.value }))} rows={3} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Dahil (her satıra bir madde)</label>
                                    <textarea value={Array.isArray(newVariant.includes) ? newVariant.includes.join('\n') : (typeof newVariant.includes === 'string' ? newVariant.includes : '')} onChange={(e) => setNewVariant((v) => ({ ...v, includes: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) }))} rows={2} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }} placeholder="Klimalı araç&#10;Rehber" />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Hariç (her satıra bir madde)</label>
                                    <textarea value={Array.isArray(newVariant.excludes) ? newVariant.excludes.join('\n') : (typeof newVariant.excludes === 'string' ? newVariant.excludes : '')} onChange={(e) => setNewVariant((v) => ({ ...v, excludes: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) }))} rows={2} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }} />
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                                    <Input label="Süre" value={newVariant.duration ?? ''} onChange={(e) => setNewVariant((v) => ({ ...v, duration: e.target.value }))} placeholder="4 saat" style={{ flex: 1 }} />
                                    <Input label="Max grup" type="number" min={1} value={String(newVariant.maxGroupSize ?? '')} onChange={(e) => setNewVariant((v) => ({ ...v, maxGroupSize: e.target.value === '' ? null : parseInt(e.target.value, 10) }))} placeholder="12" style={{ width: '80px' }} />
                                </div>
                                <Input
                                    label="Dil(ler) (virgülle)"
                                    value={Array.isArray(newVariant.languages) ? newVariant.languages.join(', ') : ''}
                                    onChange={(e) => setNewVariant((v) => ({
                                        ...v,
                                        languages: e.target.value
                                            .split(',')
                                            .map((s) => s.trim())
                                            .filter(Boolean),
                                    }))}
                                    placeholder="Türkçe, İngilizce"
                                />
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
                    {editingVariantId && (
                        <form onSubmit={handleUpdateVariant} style={{ marginBottom: 'var(--space-xl)', padding: 'var(--space-lg)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                            <h3 style={{ marginBottom: 'var(--space-md)' }}>Varyantı düzenle</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Tur tipi</label>
                                    <select value={editVariant.tourType ?? ''} onChange={(e) => setEditVariant((v) => ({ ...v, tourType: e.target.value || null }))} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                                        <option value="">— Yok (aktiviteler/transfer) —</option>
                                        <option value="eco">Eco</option>
                                        <option value="plus">Plus</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Rezervasyon tipi</label>
                                    {tourEditReservationTypeMode !== 'none' ? (
                                        <select
                                            value={normalizeReservationType(tourEditReservationTypeMode, editVariant.reservationType ?? null) ?? ''}
                                            onChange={(e) => setEditVariant((v) => ({ ...v, reservationType: e.target.value }))}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
                                        >
                                            {getReservationTypeOptions(tourEditReservationTypeMode).map((opt) => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div style={{ padding: '0.5rem', borderRadius: 4, border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                            Bu üründe Private/Regular kapalı. Rezervasyon tipi boş bırakılacak.
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Havalimanı</label>
                                    <select value={editVariant.airport ?? ''} onChange={(e) => setEditVariant((v) => ({ ...v, airport: e.target.value || null }))} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                                        <option value="">— Yok —</option>
                                        <option value="NAV">NAV (Nevşehir)</option>
                                        <option value="ASR">ASR (Kayseri)</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Fiyat tipi</label>
                                    <select value={editVariant.pricingType ?? 'per_person'} onChange={(e) => setEditVariant((v) => ({ ...v, pricingType: e.target.value as 'per_person' | 'per_vehicle' }))} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                                        <option value="per_person">Kişi başı</option>
                                        <option value="per_vehicle">Araç başı</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                                <Input label="Başlık (EN) *" value={editVariant.titleEn ?? ''} onChange={(e) => setEditVariant((v) => ({ ...v, titleEn: e.target.value }))} />
                                <Input label="Başlık (TR)" value={editVariant.titleTr ?? ''} onChange={(e) => setEditVariant((v) => ({ ...v, titleTr: e.target.value }))} />
                                <Input label="Başlık (ZH)" value={editVariant.titleZh ?? ''} onChange={(e) => setEditVariant((v) => ({ ...v, titleZh: e.target.value }))} />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                                    <Input label="Yetişkin fiyatı (€)" type="number" step="0.01" value={String(editVariant.adultPrice ?? 0)} onChange={(e) => setEditVariant((v) => ({ ...v, adultPrice: parseFloat(e.target.value) || 0 }))} />
                                    <Input label="Çocuk fiyatı — 4-7 yaş (€, boş = yetişkin ile aynı)" type="number" step="0.01" value={editVariant.childPrice != null ? String(editVariant.childPrice) : ''} onChange={(e) => setEditVariant((v) => ({ ...v, childPrice: e.target.value === '' ? null : parseFloat(e.target.value) }))} />
                                </div>
                                <div style={{ padding: 'var(--space-sm)', borderRadius: 8, background: 'var(--color-bg-alt)', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                                    <strong>ℹ️ Yaş politikası:</strong> 0-3 yaş: Ücretsiz · 4-7 yaş: Çocuk fiyatı · 7+ yaş: Yetişkin fiyatı
                                </div>
                                {canUseTierPricing((editVariant.pricingType as 'per_person' | 'per_vehicle' | undefined), tourEditReservationTypeMode, normalizeReservationType(tourEditReservationTypeMode, editVariant.reservationType ?? null)) && (
                                    <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 'var(--space-md)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                                            <strong>Kişi-fiyat kademeleri</strong>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                onClick={() =>
                                                    updateVariantTierRows('edit', (rows) => [
                                                        ...rows,
                                                        { pax: rows.length > 0 ? rows[rows.length - 1].pax + 1 : 1, totalPrice: Number(editVariant.adultPrice) || 0 },
                                                    ])
                                                }
                                            >
                                                Kademe ekle
                                            </Button>
                                        </div>
                                        <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                                            {toPaxPriceRows(editVariant.privatePriceTiers ?? null).map((tier, idx) => (
                                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 'var(--space-sm)', alignItems: 'end' }}>
                                                    <Input
                                                        label="Kişi sayısı"
                                                        type="number"
                                                        min={1}
                                                        value={String(tier.pax)}
                                                        onChange={(e) => updateVariantTierRows('edit', (rows) => rows.map((r, i) => (i === idx ? { ...r, pax: parseInt(e.target.value, 10) || 1 } : r)))}
                                                    />
                                                    <Input
                                                        label="Toplam fiyat (€)"
                                                        type="number"
                                                        step="0.01"
                                                        min={0}
                                                        value={String(tier.totalPrice)}
                                                        onChange={(e) => updateVariantTierRows('edit', (rows) => rows.map((r, i) => (i === idx ? { ...r, totalPrice: parseFloat(e.target.value) || 0 } : r)))}
                                                    />
                                                    <Button type="button" variant="secondary" onClick={() => updateVariantTierRows('edit', (rows) => rows.filter((_, i) => i !== idx))}>
                                                        Sil
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                        <p style={{ marginTop: 'var(--space-sm)', marginBottom: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                            Her kişi sayısı bir kez girilmelidir. Kademeler kişi sayısına göre otomatik sıralanır.
                                        </p>
                                    </div>
                                )}
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Açıklama (EN)</label>
                                    <textarea value={editVariant.descEn ?? ''} onChange={(e) => setEditVariant((v) => ({ ...v, descEn: e.target.value }))} rows={3} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Açıklama (TR)</label>
                                    <textarea value={editVariant.descTr ?? ''} onChange={(e) => setEditVariant((v) => ({ ...v, descTr: e.target.value }))} rows={3} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Açıklama (ZH)</label>
                                    <textarea value={editVariant.descZh ?? ''} onChange={(e) => setEditVariant((v) => ({ ...v, descZh: e.target.value }))} rows={3} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Dahil (her satıra bir madde)</label>
                                    <textarea value={Array.isArray(editVariant.includes) ? editVariant.includes.join('\n') : ''} onChange={(e) => setEditVariant((v) => ({ ...v, includes: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) }))} rows={2} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Hariç (her satıra bir madde)</label>
                                    <textarea value={Array.isArray(editVariant.excludes) ? editVariant.excludes.join('\n') : ''} onChange={(e) => setEditVariant((v) => ({ ...v, excludes: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) }))} rows={2} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }} />
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                                    <Input label="Süre" value={editVariant.duration ?? ''} onChange={(e) => setEditVariant((v) => ({ ...v, duration: e.target.value }))} style={{ flex: 1 }} />
                                    <Input label="Max grup" type="number" min={1} value={String(editVariant.maxGroupSize ?? '')} onChange={(e) => setEditVariant((v) => ({ ...v, maxGroupSize: e.target.value === '' ? null : parseInt(e.target.value, 10) }))} style={{ width: '80px' }} />
                                </div>
                                <Input
                                    label="Dil(ler) (virgülle)"
                                    value={Array.isArray(editVariant.languages) ? editVariant.languages.join(', ') : ''}
                                    onChange={(e) => setEditVariant((v) => ({
                                        ...v,
                                        languages: e.target.value
                                            .split(',')
                                            .map((s) => s.trim())
                                            .filter(Boolean),
                                    }))}
                                    placeholder="Türkçe, İngilizce"
                                />
                                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <input type="checkbox" checked={editVariant.isRecommended ?? false} onChange={(e) => setEditVariant((v) => ({ ...v, isRecommended: e.target.checked }))} />
                                    <span>Önerilen</span>
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                    <input type="checkbox" checked={editVariant.isActive !== false} onChange={(e) => setEditVariant((v) => ({ ...v, isActive: e.target.checked }))} />
                                    <span>Aktif</span>
                                </label>
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                                <Button type="submit" disabled={variantSaving}>{variantSaving ? 'Kaydediliyor...' : 'Varyantı güncelle'}</Button>
                                <Button type="button" variant="secondary" onClick={() => setEditingVariantId(null)}>Vazgeç</Button>
                            </div>
                        </form>
                    )}
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                    <th style={{ padding: 'var(--space-md)' }}>Başlık (EN)</th>
                                    <th style={{ padding: 'var(--space-md)' }}>Tip</th>
                                    <th style={{ padding: 'var(--space-md)' }}>Reservation Type</th>
                                    <th style={{ padding: 'var(--space-md)' }}>Fiyat</th>
                                    <th style={{ padding: 'var(--space-md)' }}>İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {variants.length === 0 ? (
                                    <tr><td colSpan={5} style={{ padding: 'var(--space-md)', color: 'var(--color-text-muted)' }}>Varyant yok. Yukarıdan ekleyin.</td></tr>
                                ) : (
                                    variants.map((v) => (
                                        <tr key={v.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                            <td style={{ padding: 'var(--space-md)' }}>{v.titleEn}</td>
                                            <td style={{ padding: 'var(--space-md)' }}>
                                                {[v.tourType, v.reservationType, v.airport].filter(Boolean).join(' / ') || 'Serbest'}
                                            </td>
                                            <td style={{ padding: 'var(--space-md)' }}>
                                                {v.reservationType ?? 'NULL'}
                                            </td>
                                            <td style={{ padding: 'var(--space-md)' }}>€{v.adultPrice} {v.pricingType === 'per_vehicle' ? '(araç)' : '(kişi)'}</td>
                                            <td style={{ padding: 'var(--space-md)' }}>
                                                <Button type="button" variant="secondary" style={{ padding: '4px 8px', fontSize: '0.8rem', marginRight: 'var(--space-xs)' }} onClick={() => handleStartEditVariant(v)}>✏️ Düzenle</Button>
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

            {false && (
                <>
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
                        <div style={{ flex: '1 1 140px' }}>
                            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 'bold' }}>Fiyat tipi</label>
                            <select value={optPricingMode} onChange={(e) => setOptPricingMode(e.target.value as 'per_person' | 'flat' | 'per_unit')} style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                                <option value="per_person">Kişi başı (× pax)</option>
                                <option value="flat">Sabit (1 kez)</option>
                                <option value="per_unit">Adet bazlı (misafir seçer)</option>
                            </select>
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
                                <th style={{ padding: 'var(--space-md)' }}>Tip</th>
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
                                                    <select value={editPricingMode} onChange={(e) => setEditPricingMode(e.target.value as 'per_person' | 'flat' | 'per_unit')} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid var(--color-border)' }}>
                                                        <option value="per_person">Kişi başı</option>
                                                        <option value="flat">Sabit</option>
                                                        <option value="per_unit">Adet bazlı</option>
                                                    </select>
                                                    <Button type="submit" style={{ padding: '4px 8px' }}>Kaydet</Button>
                                                    <Button type="button" variant="secondary" style={{ padding: '4px 8px' }} onClick={() => setEditingId(null)}>İptal</Button>
                                                </form>
                                            </td>
                                            <td colSpan={3} />
                                        </>
                                    ) : (
                                        <>
                                            <td style={{ padding: 'var(--space-md)' }}>{o.titleEn}</td>
                                            <td style={{ padding: 'var(--space-md)' }}>+€{o.priceAdd}</td>
                                            <td style={{ padding: 'var(--space-md)' }}>{o.pricingMode === 'flat' ? 'Sabit' : 'Kişi başı'}</td>
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
                </>
            )}

            <div className="card" style={{ padding: 'var(--space-md)', marginBottom: 'var(--space-2xl)', backgroundColor: '#eef6ff', borderColor: '#bfdbfe' }}>
                Günlük fiyat, kapasite, ekstralar ve transfer kademeleri artık <strong>Fiyatlandırma ve Müsaitlik</strong> ekranında yönetiliyor.
            </div>

        </div>
    );
}
