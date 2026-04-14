import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** SSR-safe storage: no-op on server so persist middleware does not touch localStorage during server render. */
const safeStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(name, value);
    } catch {
      // ignore
    }
  },
  removeItem: (name: string): void => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};

export interface CartItem {
    id: string; // Unique cart item ID (e.g. timestamp)
    tourId: string;
    tourType: string;
    title: string;
    date: string;
    pax: number;
    basePrice: number;
    options: {
        id: string | number;
        title: string;
        price: number;
        pricingMode?: 'per_person' | 'flat';
    }[];
    totalPrice: number;
    /** Promosyon öncesi toplam (varsa doğrulama) */
    listTotalPrice?: number;
    /** For transfer: ASR (Kayseri) | NAV (Nevşehir) */
    transferAirport?: 'ASR' | 'NAV';
    /** When booking with variant system (Eco/Plus, Regular/Private) */
    variantId?: string;
    /** Transfer: arrival | departure | roundtrip */
    transferDirection?: 'arrival' | 'departure' | 'roundtrip';
    transferFlightArrival?: string | null;
    transferFlightDeparture?: string | null;
    transferHotelName?: string | null;
    childCount?: number;
    adultCount?: number;
    infantCount?: number;
}

interface CartState {
    items: CartItem[];
    addItem: (item: Omit<CartItem, 'id'>) => void;
    removeItem: (id: string) => void;
    clearCart: () => void;
    getTotal: () => number;
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            addItem: (item) => set((state) => ({
                items: [...state.items, { ...item, id: Date.now().toString() }]
            })),
            removeItem: (id) => set((state) => ({
                items: state.items.filter(i => i.id !== id)
            })),
            clearCart: () => set({ items: [] }),
            getTotal: () => get().items.reduce((total, item) => total + item.totalPrice, 0)
        }),
        {
            name: 'kismet-cart-storage',
            storage: safeStorage as unknown as any,
        }
    )
);
