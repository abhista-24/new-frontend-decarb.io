"use client";
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);   // [{ listing, qty }]
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage once on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('decarb_cart');
      if (saved) setItems(JSON.parse(saved));
    } catch (_) {}
    setHydrated(true);
  }, []);

  // Persist to localStorage whenever items change
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem('decarb_cart', JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback((listing, qty = 1) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.listing._id === listing._id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], qty: Math.min(updated[idx].qty + qty, Number(listing.quantity)) };
        return updated;
      }
      return [...prev, { listing, qty }];
    });
  }, []);

  const removeItem = useCallback((listingId) => {
    setItems(prev => prev.filter(i => i.listing._id !== listingId));
  }, []);

  const updateQty = useCallback((listingId, qty) => {
    setItems(prev => {
      if (qty <= 0) return prev.filter(i => i.listing._id !== listingId);
      return prev.map(i => i.listing._id === listingId ? { ...i, qty } : i);
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = items.reduce((s, i) => s + i.qty, 0);
  const totalPrice = items.reduce((s, i) => s + Number(i.listing.price) * i.qty, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, totalItems, totalPrice, hydrated }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
