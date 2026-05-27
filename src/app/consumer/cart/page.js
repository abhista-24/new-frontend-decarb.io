"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/components/CartContext';

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateQty, totalItems, totalPrice } = useCart();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('decarb_user');
    if (!stored) { router.push('/?auth=login'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'customer') { router.push('/'); return; }
    setUser(u);
  }, [router]);

  if (!user) return null;

  const co2Total = items.reduce((s, i) => s + (Number(i.listing.co2_saved || 0) * i.qty), 0);
  const savingsTotal = items.reduce((s, i) => s + (Number(i.listing.original_price || 0) - Number(i.listing.price || 0)) * i.qty, 0);

  return (
    <main className="page-container" style={{ maxWidth: '860px' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '32px' }}>
        <Link href="/consumer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '14px', fontWeight: 500 }}>
          ← Back to Browse
        </Link>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '4px' }}>
          🛒 Your Cart
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Review your selected meals, adjust quantities, then proceed to checkout.
        </p>
      </div>

      {items.length === 0 ? (
        /* ── Empty state ── */
        <div style={{ textAlign: 'center', padding: '80px 24px', background: '#fff', borderRadius: '24px', border: '1px dashed rgba(95,111,101,0.2)' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🛒</div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--primary)', marginBottom: '8px' }}>Your cart is empty</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.95rem' }}>Browse nearby surplus meals and add them to your cart.</p>
          <Link href="/consumer" className="btn btn-primary" style={{ borderRadius: '14px', padding: '12px 28px', textDecoration: 'none' }}>
            Browse Meals
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>

          {/* ── Cart Items ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {items.map(({ listing, qty }) => {
              const isFree      = Number(listing.price) === 0;
              const maxQty      = Math.min(5, Number(listing.quantity));
              const restaurantName = typeof listing.restaurant_id === 'object' && listing.restaurant_id
                ? listing.restaurant_id.name : 'Partner Store';
              const pickupTime  = new Date(listing.pickup_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                + ' – ' + new Date(listing.pickup_time).toLocaleDateString([], { month: 'short', day: 'numeric' });

              return (
                <div key={listing._id} className="cart-item">
                  {/* Thumbnail */}
                  <div style={{ width: '90px', height: '90px', borderRadius: '14px', overflow: 'hidden', flexShrink: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={listing.image} alt={listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>
                      {restaurantName}
                    </p>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '4px', lineHeight: 1.2 }}>{listing.title}</h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                      🕒 Pickup: {pickupTime}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      {/* Qty stepper */}
                      <div className="qty-stepper">
                        <button onClick={() => updateQty(listing._id, qty - 1)} className="qty-btn" aria-label="Decrease">−</button>
                        <span className="qty-value">{qty}</span>
                        <button onClick={() => updateQty(listing._id, qty + 1)} disabled={qty >= maxQty} className="qty-btn" aria-label="Increase">+</button>
                      </div>

                      {/* Remove */}
                      <button onClick={() => removeItem(listing._id)} className="remove-btn">🗑 Remove</button>
                    </div>
                  </div>

                  {/* Price */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {isFree ? (
                      <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>FREE</span>
                    ) : (
                      <>
                        <p style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)' }}>
                          ₹{(Number(listing.price) * qty).toFixed(2)}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textDecoration: 'line-through' }}>
                          ₹{(Number(listing.original_price) * qty).toFixed(2)}
                        </p>
                        <p style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 700, marginTop: '2px' }}>
                          Save ₹{((Number(listing.original_price) - Number(listing.price)) * qty).toFixed(2)}
                        </p>
                      </>
                    )}
                    <p style={{ fontSize: '0.68rem', color: '#00796B', marginTop: '6px', fontWeight: 600 }}>
                      🌱 -{(Number(listing.co2_saved || 0) * qty).toFixed(1)} kg CO₂
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Order Summary ── */}
          <div className="cart-summary">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '20px', color: '#1C1C1C' }}>Order Summary</h2>

            <div className="summary-row">
              <span>Items ({totalItems})</span>
              <span>₹{totalPrice.toFixed(2)}</span>
            </div>
            <div className="summary-row" style={{ color: '#16a34a' }}>
              <span>You Save</span>
              <span>−₹{savingsTotal.toFixed(2)}</span>
            </div>
            <div className="summary-row" style={{ color: '#00796B', fontSize: '0.82rem' }}>
              <span>🌱 CO₂ Saved</span>
              <span>{co2Total.toFixed(1)} kg</span>
            </div>

            <div style={{ borderTop: '2px solid #EAEEF2', margin: '16px 0', paddingTop: '16px' }}>
              <div className="summary-row summary-row--total">
                <span>Total</span>
                <span>₹{totalPrice.toFixed(2)}</span>
              </div>
            </div>

            <Link href="/consumer/checkout" className="checkout-btn">
              Proceed to Payment →
            </Link>

            <Link href="/consumer" style={{ display: 'block', textAlign: 'center', marginTop: '12px', fontSize: '0.82rem', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}>
              ← Continue Shopping
            </Link>

            {/* Eco message */}
            <div style={{ marginTop: '20px', background: '#E0F2F1', borderRadius: '12px', padding: '12px 14px', fontSize: '0.78rem', color: '#00695C', fontWeight: 600, textAlign: 'center' }}>
              🌍 Your order prevents {co2Total.toFixed(1)} kg of CO₂ emissions
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
