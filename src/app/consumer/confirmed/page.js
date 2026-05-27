"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ── Animated counter ────────────────────────────────────────────────────────────
function AnimatedNumber({ target, decimals = 1, prefix = '', suffix = '', duration = 1500 }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setVal(+(target * ease).toFixed(decimals));
      if (progress < 1) requestAnimationFrame(step);
    };
    const id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [target, decimals, duration]);
  return <>{prefix}{val.toFixed(decimals)}{suffix}</>;
}

// ── Eco stat card ───────────────────────────────────────────────────────────────
function EcoCard({ icon, label, value, sub, color, bg, delay = 0 }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <div style={{
      background: bg, borderRadius: '16px', padding: '20px',
      textAlign: 'center', border: `1px solid ${color}22`,
      transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
      opacity: visible ? 1 : 0,
      transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)',
    }}>
      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color, lineHeight: 1.1, marginBottom: '4px' }}>{value}</div>
      <div style={{ fontSize: '0.78rem', fontWeight: 700, color, marginBottom: '2px' }}>{label}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: '#9AA0A6', fontWeight: 500 }}>{sub}</div>}
    </div>
  );
}

// ── Main Confirmed Page ─────────────────────────────────────────────────────────
export default function ConfirmedPage() {
  const router = useRouter();
  const [show,  setShow]  = useState(false);
  const [count, setCount] = useState(12);
  const [order, setOrder] = useState(null);

  useEffect(() => {
    // Load order data from sessionStorage
    try {
      const saved = sessionStorage.getItem('decarb_last_order');
      if (saved) setOrder(JSON.parse(saved));
    } catch (_) {}
    const t = setTimeout(() => setShow(true), 150);
    return () => clearTimeout(t);
  }, []);

  // Auto-redirect countdown
  useEffect(() => {
    if (!show) return;
    if (count <= 0) { router.push('/consumer'); return; }
    const t = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [show, count, router]);

  // ── Derived eco metrics ──────────────────────────────────────────────────────
  const co2Total     = order?.co2Total     || 0;
  const mealsCount   = order?.mealsCount   || 0;
  const savingsTotal = order?.savingsTotal || 0;
  const totalPrice   = order?.totalPrice   || 0;
  const payMethod    = order?.paymentMethod || 'upi';

  // Environmental equivalents
  const treesEquiv    = +(co2Total / 20).toFixed(2);    // 1 tree ~ 20 kg CO2/yr
  const kmDriving     = +(co2Total / 0.21).toFixed(1);  // avg car 210g CO2/km
  const phonesCharged = Math.round(co2Total / 0.008);   // ~8g CO2 per phone charge

  // Pickup window
  const pickupDate = order?.pickupTime ? new Date(order.pickupTime) : null;
  const now        = new Date();
  const pickupFormatted = pickupDate
    ? pickupDate.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null;
  const minutesUntil = pickupDate ? Math.max(0, Math.round((pickupDate - now) / 60000)) : null;
  const pickupStatus = minutesUntil !== null
    ? minutesUntil < 60
      ? `Ready in ~${minutesUntil} min`
      : minutesUntil < 1440
        ? `Ready in ~${Math.round(minutesUntil / 60)} hr${Math.round(minutesUntil / 60) > 1 ? 's' : ''}`
        : `Pickup: ${pickupFormatted}`
    : 'Check pickup window';

  const paymentLabels = { upi: 'UPI', card: 'Card', cod: 'Cash on Pickup' };

  return (
    <main style={{ minHeight: '100vh', background: '#F4F7F5', padding: '24px' }}>

      {/* Ambient blobs */}
      <div style={{ position: 'fixed', top: '5%', left: '5%', width: '320px', height: '320px', background: 'radial-gradient(circle, rgba(76,175,122,0.18) 0%, transparent 70%)', filter: 'blur(50px)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '8%', right: '5%', width: '380px', height: '380px', background: 'radial-gradient(circle, rgba(47,107,79,0.13) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ maxWidth: '680px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* ── Hero Confirmed Card ── */}
        <div style={{
          background: '#FFFFFF', borderRadius: '28px', padding: '48px 40px',
          textAlign: 'center', marginBottom: '24px',
          boxShadow: '0 20px 60px rgba(47,107,79,0.12)',
          border: '1px solid rgba(255,255,255,0.8)',
          transform: show ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.95)',
          opacity: show ? 1 : 0,
          transition: 'all 0.6s cubic-bezier(0.16,1,0.3,1)',
        }}>

          {/* Animated check circle */}
          <div style={{
            width: '88px', height: '88px', margin: '0 auto 20px',
            background: 'linear-gradient(135deg, #2f6b4f, #4CAF7A)',
            borderRadius: '50%', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '2.6rem', color: '#fff',
            boxShadow: '0 8px 32px rgba(47,107,79,0.4)',
            animation: show ? 'confirmPop 0.55s cubic-bezier(0.34,1.56,0.64,1) 0.3s both' : 'none',
          }}>✓</div>

          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#E6F4EA', color: '#2f6b4f', padding: '6px 16px', borderRadius: '30px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
            🌍 Order Confirmed & Payment Received
          </div>

          <h1 style={{ fontSize: '2.1rem', fontWeight: 800, color: '#1C1C1C', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '10px' }}>
            Your meal is rescued! 🎉
          </h1>
          <p style={{ color: '#5F6F65', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '24px' }}>
            Payment of <strong style={{ color: '#2f6b4f' }}>₹{totalPrice.toFixed(2)}</strong> received via{' '}
            <strong>{paymentLabels[payMethod] || payMethod}</strong>. Your rescue bag is being prepared.
          </p>

          {/* ── Pickup Time Banner ── */}
          <div style={{
            background: 'linear-gradient(135deg, #2f6b4f, #4CAF7A)',
            borderRadius: '16px', padding: '18px 24px',
            display: 'flex', alignItems: 'center', gap: '16px',
            marginBottom: '24px', textAlign: 'left',
            boxShadow: '0 6px 20px rgba(47,107,79,0.25)',
            animation: show ? 'slideUpFade 0.5s 0.5s both' : 'none',
          }}>
            <div style={{ fontSize: '2.2rem', flexShrink: 0 }}>🕒</div>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>
                Expected Pickup Window
              </p>
              <p style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 800, marginBottom: '2px' }}>
                {pickupFormatted || 'See your order details'}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.82rem', fontWeight: 600 }}>
                ⚡ {pickupStatus}
              </p>
            </div>
          </div>

          {/* ── Items ordered ── */}
          {order?.items?.length > 0 && (
            <div style={{ background: '#F4F7F5', borderRadius: '14px', padding: '16px', marginBottom: '20px', textAlign: 'left' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9AA0A6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Items in this order</p>
              {order.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < order.items.length - 1 ? '1px solid #EAEEF2' : 'none', fontSize: '0.85rem' }}>
                  <span style={{ color: '#5F6F65', fontWeight: 500 }}>{item.title} ×{item.qty}</span>
                  <span style={{ fontWeight: 700, color: '#1C1C1C' }}>
                    {item.price === 0 ? 'Free' : `₹${item.price.toFixed(2)}`}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Next steps */}
          <div style={{ textAlign: 'left', marginBottom: '24px' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2f6b4f', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>What happens next?</p>
            {[
              { icon: '📩', text: 'Order confirmation sent to your email' },
              { icon: '🏪', text: 'Restaurant is packing your rescue bag' },
              { icon: '🛍️', text: 'Pick up during the window shown above' },
              { icon: '🌱', text: 'You just made a real environmental impact!' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 0', borderBottom: i < 3 ? '1px solid #EAEEF2' : 'none' }}>
                <span style={{ fontSize: '1.1rem', width: '26px', textAlign: 'center' }}>{s.icon}</span>
                <span style={{ fontSize: '0.86rem', color: '#5F6F65', fontWeight: 500 }}>{s.text}</span>
              </div>
            ))}
          </div>

          {/* CTA + countdown */}
          <Link href="/consumer" style={{ display: 'block', width: '100%', padding: '15px', background: 'linear-gradient(135deg, #2f6b4f, #4CAF7A)', color: '#fff', borderRadius: '16px', textDecoration: 'none', fontWeight: 700, fontSize: '1rem', marginBottom: '12px', boxShadow: '0 6px 20px rgba(47,107,79,0.3)' }}>
            🛒 Rescue More Meals
          </Link>
          <p style={{ fontSize: '0.75rem', color: '#9AA0A6', fontWeight: 500 }}>
            Auto-redirecting in {count}s…
          </p>
        </div>

        {/* ── Carbon Impact Section ── */}
        {show && co2Total > 0 && (
          <div style={{
            background: '#FFFFFF', borderRadius: '24px', padding: '32px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.06)', marginBottom: '24px',
            border: '1px solid #EAEEF2',
            animation: 'slideUpFade 0.6s 0.4s both',
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#E0F2F1', color: '#00695C', padding: '7px 18px', borderRadius: '30px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                🌍 Your Environmental Contribution
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1C1C1C', marginBottom: '6px' }}>
                You saved{' '}
                <span style={{ color: '#00796B' }}>
                  <AnimatedNumber target={co2Total} decimals={1} suffix=" kg" />
                </span>{' '}of CO₂!
              </h2>
              <p style={{ color: '#5F6F65', fontSize: '0.88rem' }}>
                By rescuing {mealsCount} meal{mealsCount > 1 ? 's' : ''} instead of letting them go to waste
              </p>
            </div>

            {/* Eco stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              <EcoCard icon="🌳" label="Trees equivalent" value={<AnimatedNumber target={treesEquiv} decimals={2} />} sub="(yearly absorption)" color="#16a34a" bg="#dcfce7" delay={200} />
              <EcoCard icon="🚗" label="Driving avoided" value={<AnimatedNumber target={kmDriving} decimals={0} suffix=" km" />} sub="avg car emissions" color="#0277BD" bg="#E1F5FE" delay={350} />
              <EcoCard icon="📱" label="Phones charged" value={<AnimatedNumber target={phonesCharged} decimals={0} />} sub="equivalent charges" color="#6A1B9A" bg="#F3E5F5" delay={500} />
            </div>

            {/* Big CO2 progress bar */}
            <div style={{ background: '#F4F7F5', borderRadius: '12px', padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#5F6F65' }}>CO₂ Emissions Prevented</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#00796B' }}>{co2Total.toFixed(1)} kg</span>
              </div>
              <div style={{ background: '#EAEEF2', borderRadius: '8px', height: '10px', overflow: 'hidden' }}>
                <div style={{
                  background: 'linear-gradient(90deg, #00796B, #4CAF7A)',
                  height: '100%', borderRadius: '8px',
                  width: `${Math.min((co2Total / 50) * 100, 100)}%`,
                  transition: 'width 1.5s cubic-bezier(0.16,1,0.3,1)',
                }} />
              </div>
              <p style={{ fontSize: '0.72rem', color: '#9AA0A6', marginTop: '8px', fontWeight: 500 }}>
                Every meal rescued = 2.5 kg less CO₂ in our atmosphere 🌿
              </p>
            </div>

            {/* Savings banner */}
            {savingsTotal > 0 && (
              <div style={{ marginTop: '16px', background: 'linear-gradient(135deg, #2f6b4f11, #4CAF7A11)', border: '1px solid #4CAF7A33', borderRadius: '12px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '0.78rem', color: '#5F6F65', fontWeight: 600, marginBottom: '2px' }}>💰 Money you saved</p>
                  <p style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2f6b4f' }}>
                    <AnimatedNumber target={savingsTotal} decimals={2} prefix="₹" />
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.78rem', color: '#5F6F65', fontWeight: 600, marginBottom: '2px' }}>🍱 Meals rescued</p>
                  <p style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1565C0' }}>{mealsCount}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Share impact ── */}
        {show && (
          <div style={{ textAlign: 'center', color: '#9AA0A6', fontSize: '0.78rem', fontWeight: 500, animation: 'slideUpFade 0.5s 0.8s both' }}>
            🌱 Share your impact and inspire others to rescue surplus meals!
          </div>
        )}
      </div>

      <style>{`
        @keyframes confirmPop   { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes slideUpFade  { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </main>
  );
}
