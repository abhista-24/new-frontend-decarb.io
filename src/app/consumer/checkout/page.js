"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/components/CartContext';

// ── Payment Processing Overlay ─────────────────────────────────────────────────
function PaymentOverlay({ stage }) {
  // stage: 'processing' | 'done'
  const steps = [
    { id: 'processing', icon: '🔐', label: 'Encrypting your payment…'   },
    { id: 'verifying',  icon: '🏦', label: 'Verifying with your bank…'  },
    { id: 'confirming', icon: '✅', label: 'Confirming order…'          },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15, 30, 20, 0.82)',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
      animation: 'fadeInOverlay 0.3s ease',
    }}>
      <div style={{
        background: '#fff', borderRadius: '28px',
        padding: '48px 40px', maxWidth: '400px', width: '90%',
        textAlign: 'center',
        boxShadow: '0 30px 80px rgba(0,0,0,0.3)',
        animation: 'slideUpCard 0.4s cubic-bezier(0.16,1,0.3,1)',
      }}>
        {stage === 'processing' ? (
          <>
            {/* Spinner */}
            <div style={{
              width: '72px', height: '72px', margin: '0 auto 24px',
              border: '5px solid #E6F4EA',
              borderTop: '5px solid #2f6b4f',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1C1C1C', marginBottom: '8px' }}>
              Processing Payment
            </h2>
            <p style={{ color: '#9AA0A6', fontSize: '0.88rem', marginBottom: '28px' }}>
              Please do not close this page
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
              {steps.map((s, i) => (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 14px', borderRadius: '12px',
                  background: '#F4F7F5',
                  animation: `slideUpFade 0.4s ${i * 0.3}s both`,
                }}>
                  <span style={{ fontSize: '1.2rem' }}>{s.icon}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#5F6F65' }}>{s.label}</span>
                  <div style={{ marginLeft: 'auto', width: '16px', height: '16px', border: '2px solid #E6F4EA', borderTop: '2px solid #2f6b4f', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Success tick */}
            <div style={{
              width: '80px', height: '80px', margin: '0 auto 20px',
              background: 'linear-gradient(135deg, #2f6b4f, #4CAF7A)',
              borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '2.4rem', color: '#fff',
              boxShadow: '0 8px 30px rgba(47,107,79,0.4)',
              animation: 'confirmPop 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
            }}>
              ✓
            </div>
            <h2 style={{ fontSize: '1.7rem', fontWeight: 800, color: '#1C1C1C', marginBottom: '8px' }}>
              Payment Successful! 🎉
            </h2>
            <p style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.9rem', marginBottom: '6px' }}>
              Your order has been confirmed
            </p>
            <p style={{ color: '#9AA0A6', fontSize: '0.82rem' }}>
              Redirecting to your order summary…
            </p>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin           { to { transform: rotate(360deg); } }
        @keyframes fadeInOverlay  { from { opacity:0; } to { opacity:1; } }
        @keyframes slideUpCard    { from { transform:translateY(40px); opacity:0; } to { transform:translateY(0); opacity:1; } }
        @keyframes confirmPop     { from { transform:scale(0); opacity:0; } to { transform:scale(1); opacity:1; } }
      `}</style>
    </div>
  );
}

// ── Main Checkout Page ─────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalItems, totalPrice, clearCart } = useCart();
  const [user, setUser] = useState(null);

  // Form
  const [name,   setName]   = useState('');
  const [email,  setEmail]  = useState('');
  const [phone,  setPhone]  = useState('');
  const [method, setMethod] = useState('upi');
  const [upiId,  setUpiId]  = useState('');
  const [cardNo, setCardNo] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv,    setCvv]    = useState('');

  // Payment stage: null | 'processing' | 'done'
  const [payStage, setPayStage] = useState(null);
  const [error,    setError]    = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('decarb_user');
    if (!stored) { router.push('/?auth=login'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'customer') { router.push('/'); return; }
    setUser(u);
    setName(u.name || '');
    setEmail(u.email || '');
  }, [router]);

  useEffect(() => {
    if (user && items.length === 0 && !payStage) router.replace('/consumer/cart');
  }, [user, items, router, payStage]);

  if (!user) return null;

  const co2Total      = items.reduce((s, i) => s + Number(i.listing.co2_saved || 0) * i.qty, 0);
  const savingsTotal  = items.reduce((s, i) => s + (Number(i.listing.original_price || 0) - Number(i.listing.price || 0)) * i.qty, 0);
  const mealsCount    = items.reduce((s, i) => s + i.qty, 0);

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setError('');
    if (method === 'upi' && !upiId.trim())                               { setError('Please enter your UPI ID.'); return; }
    if (method === 'card' && (!cardNo.trim() || !expiry.trim() || !cvv.trim())) { setError('Please fill all card details.'); return; }

    // Step 1: show "processing" overlay
    setPayStage('processing');

    try {
      // Simulate min 2.5s processing feel
      const [results] = await Promise.all([
        Promise.all(
          items.map(({ listing, qty }) =>
            fetch('http://localhost:5000/api/order/place', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: user.id, food_id: listing._id, quantity: qty }),
            }).then(r => r.json())
          )
        ),
        new Promise(res => setTimeout(res, 2500)),
      ]);

      const failed = results.find(r => r.error);
      if (failed) throw new Error(failed.error || 'One or more orders failed');

      // Step 2: show "payment done" overlay
      setPayStage('done');

      // Build order summary data to pass to confirmed page
      const pickupTime = items[0]?.listing?.pickup_time;
      const orderData = {
        items: items.map(i => ({
          title: i.listing.title,
          qty: i.qty,
          price: Number(i.listing.price) * i.qty,
          restaurantName: typeof i.listing.restaurant_id === 'object' && i.listing.restaurant_id
            ? i.listing.restaurant_id.name : 'Partner Store',
          pickup_time: i.listing.pickup_time,
        })),
        totalPrice,
        co2Total,
        savingsTotal,
        mealsCount,
        paymentMethod: method,
        orderTime: new Date().toISOString(),
        pickupTime,
      };
      sessionStorage.setItem('decarb_last_order', JSON.stringify(orderData));

      clearCart();

      // Wait 1.8s on success screen then redirect
      setTimeout(() => router.push('/consumer/confirmed'), 1800);
    } catch (err) {
      setPayStage(null);
      setError(err.message);
    }
  };

  return (
    <>
      {/* Payment overlay */}
      {payStage && <PaymentOverlay stage={payStage} />}

      <main className="page-container" style={{ maxWidth: '860px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <Link href="/consumer/cart" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: '14px', fontWeight: 500 }}>
            ← Back to Cart
          </Link>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '4px' }}>
            💳 Payment
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Secure checkout — your details are never stored.
          </p>
        </div>

        <form onSubmit={handlePlaceOrder}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>

            {/* ── Left: Form ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Contact */}
              <div className="checkout-section">
                <h2 className="checkout-section-title">📋 Contact Details</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label className="form-label">Full Name</label>
                    <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Riya Sharma" required />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label className="form-label">Email</label>
                      <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="riya@email.com" required />
                    </div>
                    <div>
                      <label className="form-label">Phone</label>
                      <input type="tel" className="form-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" required />
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="checkout-section">
                <h2 className="checkout-section-title">💳 Payment Method</h2>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  {[
                    { id: 'upi',  label: '🏦 UPI'            },
                    { id: 'card', label: '💳 Card'            },
                    { id: 'cod',  label: '💵 Cash on Pickup'  },
                  ].map(m => (
                    <button key={m.id} type="button" onClick={() => setMethod(m.id)}
                      className={`payment-tab ${method === m.id ? 'payment-tab--active' : ''}`}>
                      {m.label}
                    </button>
                  ))}
                </div>

                {method === 'upi' && (
                  <div className="payment-fields">
                    <label className="form-label">UPI ID</label>
                    <input type="text" className="form-input" value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="yourname@upi" />
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                      Accepted: GPay, PhonePe, Paytm, BHIM, any UPI app
                    </p>
                  </div>
                )}

                {method === 'card' && (
                  <div className="payment-fields" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label className="form-label">Card Number</label>
                      <input type="text" className="form-input" value={cardNo} onChange={e => setCardNo(e.target.value)} placeholder="1234 5678 9012 3456" maxLength={19} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label className="form-label">Expiry (MM/YY)</label>
                        <input type="text" className="form-input" value={expiry} onChange={e => setExpiry(e.target.value)} placeholder="08/27" maxLength={5} />
                      </div>
                      <div>
                        <label className="form-label">CVV</label>
                        <input type="password" className="form-input" value={cvv} onChange={e => setCvv(e.target.value)} placeholder="•••" maxLength={4} />
                      </div>
                    </div>
                  </div>
                )}

                {method === 'cod' && (
                  <div className="payment-fields" style={{ background: '#E6F4EA', borderRadius: '12px', padding: '16px', fontSize: '0.88rem', color: '#2f6b4f', fontWeight: 500 }}>
                    💚 Pay with cash when you pick up your order. No advance payment needed.
                  </div>
                )}
              </div>

              {error && (
                <div style={{ background: '#FCE8E6', color: '#C5221F', padding: '12px 16px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600 }}>
                  ⚠ {error}
                </div>
              )}
            </div>

            {/* ── Right: Summary ── */}
            <div className="cart-summary">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '16px' }}>Order Summary</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                {items.map(({ listing, qty }) => (
                  <div key={listing._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <span style={{ color: '#5F6F65', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {listing.title} ×{qty}
                    </span>
                    <span style={{ fontWeight: 700, color: '#1C1C1C' }}>
                      {Number(listing.price) === 0 ? 'Free' : `₹${(Number(listing.price) * qty).toFixed(2)}`}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '2px solid #EAEEF2', paddingTop: '14px', marginBottom: '16px' }}>
                <div className="summary-row" style={{ color: '#16a34a' }}>
                  <span>You Save</span><span>−₹{savingsTotal.toFixed(2)}</span>
                </div>
                <div className="summary-row summary-row--total" style={{ marginTop: '8px' }}>
                  <span>Total</span><span>₹{totalPrice.toFixed(2)}</span>
                </div>
                <div style={{ marginTop: '10px', background: '#E0F2F1', borderRadius: '10px', padding: '10px 12px', fontSize: '0.78rem', color: '#00695C', fontWeight: 600 }}>
                  🌱 This order saves {co2Total.toFixed(1)} kg CO₂ — equivalent to planting {(co2Total / 20).toFixed(1)} trees!
                </div>
              </div>

              <button type="submit" disabled={!!payStage} className="checkout-btn"
                style={{ border: 'none', cursor: payStage ? 'not-allowed' : 'pointer', opacity: payStage ? 0.6 : 1 }}>
                {payStage ? '⏳ Processing…' : `✔ Confirm & Pay ₹${totalPrice.toFixed(2)}`}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '14px', fontSize: '0.72rem', color: '#9AA0A6', fontWeight: 500 }}>
                🔒 Secure & encrypted checkout
              </div>
            </div>
          </div>
        </form>
      </main>
    </>
  );
}
