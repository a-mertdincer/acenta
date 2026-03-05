import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
    id: string; // Unique cart item ID (e.g. timestamp)
    tourId: string;
    tourType: string;
    title: string;
    date: string;
    pax: number;
    basePrice: number;
    options: {
        id: number;
        title: string;
        price: number;
    }[];
    totalPrice: number;
    /** For transfer: ASR (Kayseri) | NAV (Nevşehir) */
    transferAirport?: 'ASR' | 'NAV';
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
        }
    )
);
