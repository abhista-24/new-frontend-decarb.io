"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SearchBar from '@/components/SearchBar';
import CategoryTabs from '@/components/CategoryTabs';
import FoodCard from '@/components/FoodCard';
import ImpactWidget from '@/components/ImpactWidget';
import { useCart } from '@/components/CartContext';

export default function ConsumerPage() {
  const router = useRouter();
  const [user,     setUser]     = useState(null);
  const [listings, setListings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [category, setCategory] = useState('all');
  const [search,   setSearch]   = useState('');
  const [refreshStats, setRefreshStats] = useState(0);
  const { totalItems } = useCart();

  // Auth check
  useEffect(() => {
    const stored = localStorage.getItem('decarb_user');
    if (!stored) { router.push('/?auth=login'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'customer') { router.push('/'); return; }
    setUser(u);
  }, [router]);

  // Fetch listings
  useEffect(() => {
    if (!user) return;
    async function fetchListings() {
      setLoading(true);
      try {
        let url = `http://localhost:5000/api/food/listings?lat=${user.location.lat}&lng=${user.location.lng}&type=paid`;
        if (category !== 'all') url += `&category=${category}`;
        if (search)             url += `&search=${encodeURIComponent(search)}`;
        const res = await fetch(url);
        if (res.ok) setListings(await res.json());
      } catch (err) { console.error('Error loading food listings:', err); }
      finally { setLoading(false); }
    }
    const delay = setTimeout(fetchListings, search ? 300 : 0);
    return () => clearTimeout(delay);
  }, [user, category, search]);

  if (!user) return null;

  return (
    <main className="page-container">

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '6px' }}>
            Rescue Nearby Meals
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '520px' }}>
            Discounted surplus meals from local restaurants near you. Add to cart, pay once, pick up fresh.
          </p>
        </div>

        {/* Cart button */}
        <Link href="/consumer/cart" style={{ textDecoration: 'none' }}>
          <div className="cart-fab">
            <span style={{ fontSize: '1.4rem' }}>🛒</span>
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>My Cart</span>
            {totalItems > 0 && (
              <span className="cart-fab-badge">{totalItems}</span>
            )}
          </div>
        </Link>
      </div>

      {/* ── Impact Widget ── */}
      <div style={{ marginBottom: '36px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '14px', color: 'var(--text-primary)' }}>
          🌱 Your Personal Impact
        </h2>
        <ImpactWidget userId={user.id} refreshTrigger={refreshStats} />
      </div>

      {/* ── Filters ── */}
      <div style={{ marginBottom: '28px' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search restaurants or meals..." />
        <CategoryTabs activeCategory={category} onSelect={setCategory} />
      </div>

      {/* ── Food Grid ── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '1rem' }}>
          🔍 Searching local stores for surplus…
        </div>
      ) : listings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text-secondary)', background: 'var(--glass)', backdropFilter: 'blur(4px)', borderRadius: '24px', border: '1px dashed var(--border)' }}>
          <span style={{ fontSize: '2.5rem' }}>🍃</span>
          <h3 style={{ fontSize: '1.2rem', marginTop: '12px', color: 'var(--primary)' }}>No active surplus deals nearby</h3>
          <p style={{ fontSize: '0.9rem', marginTop: '4px' }}>Local restaurants list meals closer to their closing times. Check back soon!</p>
        </div>
      ) : (
        <div className="grid-responsive">
          {listings.map(item => (
            <FoodCard key={item._id} listing={item} userRole={user.role} />
          ))}
        </div>
      )}

      {/* ── Sticky cart bar when items in cart ── */}
      {totalItems > 0 && (
        <div className="cart-sticky-bar">
          <span>🛒 {totalItems} item{totalItems > 1 ? 's' : ''} in cart</span>
          <Link href="/consumer/cart" className="cart-sticky-btn">
            View Cart & Checkout →
          </Link>
        </div>
      )}
    </main>
  );
}
