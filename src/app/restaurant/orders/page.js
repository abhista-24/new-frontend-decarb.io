"use client";
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import RestaurantSidebar from '@/components/RestaurantSidebar';

// ═══════════════════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════════════════
const STATUS_CFG = {
  placed:    { label: 'Pending',    color: '#B06000', bg: '#FEF3D6', icon: '⏳' },
  picked:    { label: 'In Transit', color: '#1A73E8', bg: '#e8f0fe', icon: '🚗' },
  completed: { label: 'Completed',  color: '#16a34a', bg: '#dcfce7', icon: '✅' },
};
const INV_STATUS = {
  available: { label: 'Available', color: '#16a34a', bg: '#dcfce7' },
  sold:      { label: 'Sold Out',  color: '#1A73E8', bg: '#e8f0fe' },
  expired:   { label: 'Expired',   color: '#9AA0A6', bg: '#f1f3f4' },
};
const CAT_EMOJI = { meals: '🍲', bakery: '🥐', groceries: '🥦', beverages: '☕', other: '📦' };

const VIEWS = [
  { key: 'overview',  label: 'Overview',   icon: '📊' },
  { key: 'inventory', label: 'Inventory',  icon: '📦' },
  { key: 'orders',    label: 'Orders',     icon: '🧾' },
];

// ═══════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtShortDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
function pct(a, b) { return b > 0 ? Math.round((a / b) * 100) : 0; }

function formatPrepDate(dateStr) {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const date = new Date(parts[0], parts[1] - 1, parts[2]);
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
  } catch (_) {}
  return dateStr;
}

// CSV exporter
function downloadCSV(rows, filename) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, color = '#2f6b4f', bg = '#E6F4EA' }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon" style={{ background: bg, color }}>{icon}</div>
      <div className="kpi-body">
        <p className="kpi-label">{label}</p>
        <h3 className="kpi-value" style={{ color }}>{value}</h3>
        {sub && <p className="kpi-sub">{sub}</p>}
      </div>
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ value, max, color = '#2f6b4f', height = 6 }) {
  const w = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ background: '#f0f0f0', borderRadius: height, height, overflow: 'hidden', width: '100%' }}>
      <div style={{ background: color, width: `${w}%`, height: '100%', borderRadius: height, transition: 'width 0.6s ease' }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════
export default function OperationsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState('overview');
  const [invFilter, setInvFilter] = useState('all');
  const [orderFilter, setOrderFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedListing, setSelectedListing] = useState(null);

  // Auth
  useEffect(() => {
    const stored = localStorage.getItem('decarb_user');
    if (!stored) { router.push('/?auth=login'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'restaurant') { router.push('/'); return; }
    setUser(u);
  }, [router]);

  // Fetch
  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [lRes, oRes] = await Promise.all([
        fetch(`http://localhost:5000/api/food/listings?restaurant_id=${user.id}`),
        fetch(`http://localhost:5000/api/order/restaurant/${user.id}`),
      ]);
      if (lRes.ok) setListings(await lRes.json());
      if (oRes.ok) setOrders(await oRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { if (user) fetchAll(); }, [user, fetchAll]);

  // Update order status
  const updateStatus = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch('http://localhost:5000/api/order/update-status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, status: newStatus }),
      });
      if (res.ok) fetchAll();
    } catch (e) { console.error(e); }
    finally { setUpdatingId(null); }
  };

  if (!user) return null;

  // ═══════════════════════════════════════════════════════════
  //  DERIVED DATA — enriched listings with order data
  // ═══════════════════════════════════════════════════════════
  const enrichedListings = listings.map(l => {
    const itemOrders = orders.filter(o => {
      const fid = o.food_id?._id || o.food_id;
      return fid === l._id;
    });
    const unitsClaimed = itemOrders.reduce((s, o) => s + Number(o.quantity || 0), 0);
    const revenue      = itemOrders.reduce((s, o) => s + Number(o.total_price || 0), 0);
    const totalStock   = Number(l.quantity || 0) + unitsClaimed; // original stock = remaining + claimed
    const claimRate    = totalStock > 0 ? pct(unitsClaimed, totalStock) : 0;
    const isExpiringSoon = l.status === 'available' && new Date(l.pickup_time) - Date.now() < 60 * 60 * 1000;
    return { ...l, itemOrders, unitsClaimed, revenue, totalStock, claimRate, isExpiringSoon };
  });

  // Aggregate KPIs
  const invAvailable  = enrichedListings.filter(l => l.status === 'available').length;
  const invSold       = enrichedListings.filter(l => l.status === 'sold').length;
  const invExpired    = enrichedListings.filter(l => l.status === 'expired').length;
  const pendingOrders = orders.filter(o => o.status === 'placed').length;
  const transitOrders = orders.filter(o => o.status === 'picked').length;
  const doneOrders    = orders.filter(o => o.status === 'completed').length;
  const totalRevenue  = orders.reduce((s, o) => s + Number(o.total_price || 0), 0);
  const totalItems    = orders.reduce((s, o) => s + Number(o.quantity || 0), 0);
  const totalCo2      = totalItems * 2.5;
  const avgClaimRate  = enrichedListings.length > 0
    ? Math.round(enrichedListings.reduce((s, l) => s + l.claimRate, 0) / enrichedListings.length) : 0;
  const expiringSoon  = enrichedListings.filter(l => l.isExpiringSoon).length;
  const wastageRate   = listings.length > 0 ? pct(invExpired, listings.length) : 0;

  // Top performing listings
  const topListings = [...enrichedListings].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  // Alerts
  const alerts = [];
  if (pendingOrders > 0) alerts.push({ icon: '🔔', text: `${pendingOrders} orders awaiting pickup`, color: '#B06000', bg: '#FEF3D6' });
  if (expiringSoon > 0) alerts.push({ icon: '⏰', text: `${expiringSoon} listing${expiringSoon > 1 ? 's' : ''} expiring within 1 hour`, color: '#C5221F', bg: '#FCE8E6' });
  if (wastageRate > 30) alerts.push({ icon: '⚠️', text: `${wastageRate}% wastage rate — consider smaller portions`, color: '#B06000', bg: '#FEF3D6' });

  // CSV export helpers
  const exportInventory = () => {
    const rows = enrichedListings.map(l => ({
      Title: l.title,
      Category: l.category,
      Status: l.status,
      'Rescue Price': l.price,
      'Original Price': l.original_price,
      'Stock Remaining': l.quantity,
      'Units Claimed': l.unitsClaimed,
      'Claim Rate %': l.claimRate,
      Revenue: l.revenue.toFixed(2),
      'CO₂ Saved (kg)': (l.co2_saved || 0),
      'Pickup Deadline': l.pickup_time ? new Date(l.pickup_time).toISOString() : '',
      'Created': l.createdAt ? new Date(l.createdAt).toISOString() : '',
    }));
    downloadCSV(rows, `inventory_${new Date().toISOString().slice(0,10)}.csv`);
  };

  const exportOrders = () => {
    const rows = orders.map(o => ({
      'Order ID': o._id,
      Item: o.food_id?.title || '—',
      Quantity: o.quantity,
      'Total Price': Number(o.total_price).toFixed(2),
      Status: o.status,
      'Created': o.createdAt ? new Date(o.createdAt).toISOString() : '',
    }));
    downloadCSV(rows, `orders_${new Date().toISOString().slice(0,10)}.csv`);
  };

  // Filtered views
  const q = search.toLowerCase();
  const filteredListings = enrichedListings
    .filter(l => invFilter === 'all' || l.status === invFilter)
    .filter(l => !q || l.title?.toLowerCase().includes(q) || l.category?.toLowerCase().includes(q));

  const filteredOrders = orders
    .filter(o => orderFilter === 'all' || o.status === orderFilter)
    .filter(o => !q || (o.food_id?.title || '').toLowerCase().includes(q) || (o._id || '').toLowerCase().includes(q));

  // If a listing is selected, only show its orders
  const displayOrders = selectedListing
    ? filteredOrders.filter(o => (o.food_id?._id || o.food_id) === selectedListing)
    : filteredOrders;

  const sortedOrders = [...displayOrders].sort((a, b) => {
    const pri = { placed: 0, picked: 1, completed: 2 };
    const diff = (pri[a.status] ?? 3) - (pri[b.status] ?? 3);
    return diff !== 0 ? diff : new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // ═══════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="dash-layout">
      <RestaurantSidebar user={user} />

      <main className="dash-main">

        {/* ── Top Bar ── */}
        <div className="dash-topbar">
          <div>
            <h1 className="dash-page-title">Operations Hub</h1>
            <p className="dash-page-sub">{today}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={exportInventory} className="btn-icon" title="Export Inventory CSV" style={{ fontSize: '0.78rem', padding: '6px 12px' }}>
              📥 Inventory CSV
            </button>
            <button onClick={exportOrders} className="btn-icon" title="Export Orders CSV" style={{ fontSize: '0.78rem', padding: '6px 12px' }}>
              📥 Orders CSV
            </button>
            <button onClick={fetchAll} className="btn-icon" title="Refresh">⟳</button>
          </div>
        </div>

        {/* ── Alerts ── */}
        {alerts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {alerts.map((a, i) => (
              <div key={i} style={{
                background: a.bg, color: a.color,
                padding: '12px 18px', borderRadius: '12px',
                fontSize: '0.85rem', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '8px',
                animation: 'slideUpFade 0.4s ease forwards',
                animationDelay: `${i * 0.1}s`
              }}>
                <span>{a.icon}</span> {a.text}
              </div>
            ))}
          </div>
        )}

        {/* ── KPI Row ── */}
        <div className="kpi-row kpi-row--wide">
          <KpiCard icon="📦" label="Live Listings"    value={invAvailable}                  sub={`${listings.length} total`}           color="#16a34a" bg="#dcfce7" />
          <KpiCard icon="🧾" label="Active Orders"    value={pendingOrders + transitOrders}  sub={`${orders.length} all time`}          color="#1565C0" bg="#E3F2FD" />
          <KpiCard icon="💰" label="Revenue"          value={`₹${totalRevenue.toFixed(2)}`}  sub={`${totalItems} items sold`}           color="#2f6b4f" bg="#E6F4EA" />
          <KpiCard icon="🎯" label="Avg Claim Rate"   value={`${avgClaimRate}%`}              sub="Across all listings"                  color="#7B1FA2" bg="#F3E5F5" />
          <KpiCard icon="🌱" label="CO₂ Saved"        value={`${totalCo2.toFixed(1)} kg`}     sub="2.5 kg per meal"                      color="#00695C" bg="#E0F2F1" />
          <KpiCard icon="📉" label="Wastage Rate"     value={`${wastageRate}%`}               sub={`${invExpired} expired`}              color={wastageRate > 30 ? '#C5221F' : '#9AA0A6'} bg={wastageRate > 30 ? '#FCE8E6' : '#f1f3f4'} />
        </div>

        {/* ── View Tabs + Search ── */}
        <div className="dash-card" style={{ padding: '14px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div className="tab-group">
              {VIEWS.map(v => (
                <button key={v.key} className={`tab-btn ${view === v.key ? 'tab-btn--active' : ''}`}
                  onClick={() => { setView(v.key); setSelectedListing(null); }}>
                  <span>{v.icon}</span> <span>{v.label}</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {selectedListing && (
                <button onClick={() => setSelectedListing(null)}
                  style={{ background: '#E3F2FD', color: '#1565C0', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                  ✕ Clear filter
                </button>
              )}
              <input type="text" className="form-input" placeholder="🔍 Search..."
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ padding: '9px 14px', fontSize: '0.85rem', minWidth: '200px' }} />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="dash-card">
            <div className="tab-empty" style={{ padding: '60px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📊</div>
              Loading operations data…
            </div>
          </div>
        ) : (
          <>
            {/* ══════════════════════════════════════════════════════════
                OVERVIEW — Cross-referenced inventory + orders
               ══════════════════════════════════════════════════════════ */}
            {view === 'overview' && (
              <>
                {/* Inventory Performance Table */}
                <div className="dash-card">
                  <div className="card-header">
                    <h2 className="card-title">📊 Listing Performance</h2>
                    <span className="card-badge">{enrichedListings.length} listings</span>
                  </div>

                  {enrichedListings.length === 0 ? (
                    <div className="chart-empty">No listings yet — upload surplus food from your Dashboard</div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="inv-table" style={{ minWidth: '800px' }}>
                        <thead>
                          <tr>
                            <th style={{ paddingLeft: '18px' }}>Item</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Stock</th>
                            <th>Claimed</th>
                            <th>Claim Rate</th>
                            <th>Revenue</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right', paddingRight: '18px' }}>Orders</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredListings.map(l => {
                            const st = INV_STATUS[l.status] || INV_STATUS.available;
                            return (
                              <tr key={l._id}
                                onClick={() => { setSelectedListing(l._id); setView('orders'); }}
                                style={{ cursor: 'pointer', transition: 'background 0.15s' }}>
                                <td style={{ paddingLeft: '18px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={l.image} alt={l.title} className="inv-thumb" />
                                    <div>
                                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{l.title}</div>
                                      {(l.preparation_date || l.preparation_time) && (
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                          Prepared: {formatPrepDate(l.preparation_date)} {l.preparation_time ? `@ ${l.preparation_time}` : ''}
                                        </div>
                                      )}
                                      {l.isExpiringSoon && (
                                        <div style={{ fontSize: '0.68rem', color: '#C5221F', fontWeight: 600, marginTop: '2px' }}>
                                          ⏰ Expiring soon
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span style={{ fontSize: '0.82rem' }}>{CAT_EMOJI[l.category] || '📦'} {l.category}</span>
                                </td>
                                <td>
                                  <div>
                                    <span style={{ fontWeight: 700, color: '#2f6b4f' }}>
                                      {Number(l.price) === 0 ? 'FREE' : `₹${Number(l.price).toFixed(0)}`}
                                    </span>
                                    {l.original_price > l.price && (
                                      <span style={{ fontSize: '0.72rem', color: '#9AA0A6', textDecoration: 'line-through', marginLeft: '4px' }}>
                                        ₹{Number(l.original_price).toFixed(0)}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <span style={{ fontWeight: 600 }}>{l.quantity}</span>
                                </td>
                                <td>
                                  <span style={{ fontWeight: 700, color: '#1565C0' }}>{l.unitsClaimed}</span>
                                </td>
                                <td style={{ minWidth: '100px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ProgressBar value={l.claimRate} max={100}
                                      color={l.claimRate >= 70 ? '#16a34a' : l.claimRate >= 30 ? '#B06000' : '#9AA0A6'} />
                                    <span style={{
                                      fontSize: '0.75rem', fontWeight: 700, minWidth: '32px',
                                      color: l.claimRate >= 70 ? '#16a34a' : l.claimRate >= 30 ? '#B06000' : '#9AA0A6'
                                    }}>
                                      {l.claimRate}%
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  <span style={{ fontWeight: 700, color: '#2f6b4f' }}>₹{l.revenue.toFixed(2)}</span>
                                </td>
                                <td>
                                  <span className="inv-status" style={{ background: st.bg, color: st.color }}>
                                    {st.label}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right', paddingRight: '18px' }}>
                                  <span style={{
                                    background: l.itemOrders.length > 0 ? '#E3F2FD' : '#f1f3f4',
                                    color: l.itemOrders.length > 0 ? '#1565C0' : '#9AA0A6',
                                    padding: '3px 10px', borderRadius: '20px',
                                    fontSize: '0.75rem', fontWeight: 700
                                  }}>
                                    {l.itemOrders.length} order{l.itemOrders.length !== 1 ? 's' : ''} →
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Business Insights Row */}
                <div className="charts-row">

                  {/* Top Performers */}
                  <div className="dash-card">
                    <div className="card-header">
                      <h2 className="card-title">🏆 Top Revenue Items</h2>
                    </div>
                    {topListings.length === 0 ? (
                      <div className="chart-empty" style={{ height: '140px' }}>No sales data yet</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {topListings.map((l, i) => (
                          <div key={l._id} style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '10px 14px', borderRadius: '10px', background: '#FAFBFC',
                            border: '1px solid #F4F7F9'
                          }}>
                            <span className="rank-badge" style={{
                              background: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#E6F4EA',
                              color: i < 3 ? '#fff' : '#2f6b4f'
                            }}>
                              {i + 1}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {l.title}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#9AA0A6' }}>
                                {l.unitsClaimed} sold · {l.claimRate}% claimed
                              </div>
                            </div>
                            <span style={{ fontWeight: 800, color: '#2f6b4f', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
                              ₹{l.revenue.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Inventory Health */}
                  <div className="dash-card">
                    <div className="card-header">
                      <h2 className="card-title">📋 Operational Summary</h2>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {[
                        { label: 'Available Listings', count: invAvailable, total: listings.length, color: '#16a34a', bg: '#dcfce7' },
                        { label: 'Sold Out', count: invSold, total: listings.length, color: '#1A73E8', bg: '#e8f0fe' },
                        { label: 'Expired (Wasted)', count: invExpired, total: listings.length, color: '#9AA0A6', bg: '#f1f3f4' },
                      ].map(item => (
                        <div key={item.label}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#5F6F65' }}>{item.label}</span>
                            <span style={{ background: item.bg, color: item.color, fontWeight: 700, fontSize: '0.78rem', padding: '3px 10px', borderRadius: '20px' }}>
                              {item.count} ({pct(item.count, item.total)}%)
                            </span>
                          </div>
                          <ProgressBar value={item.count} max={item.total || 1} color={item.color} />
                        </div>
                      ))}

                      <div style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #EAEEF2' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.82rem', color: '#5F6F65' }}>Order Fulfillment</span>
                          <span style={{ fontWeight: 800, color: '#2f6b4f' }}>
                            {orders.length > 0 ? pct(doneOrders, orders.length) : 0}%
                          </span>
                        </div>
                        <ProgressBar value={doneOrders} max={orders.length || 1} color="#2f6b4f" />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                        <div style={{ background: '#FAFBFC', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.7rem', color: '#9AA0A6', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Avg Revenue / Listing</div>
                          <div style={{ fontWeight: 800, color: '#2f6b4f', fontSize: '1.1rem' }}>
                            ₹{listings.length > 0 ? (totalRevenue / listings.length).toFixed(2) : '0.00'}
                          </div>
                        </div>
                        <div style={{ background: '#FAFBFC', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.7rem', color: '#9AA0A6', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Avg Order Value</div>
                          <div style={{ fontWeight: 800, color: '#1565C0', fontSize: '1.1rem' }}>
                            ₹{orders.length > 0 ? (totalRevenue / orders.length).toFixed(2) : '0.00'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ══════════════════════════════════════════════════════════
                INVENTORY — Detailed card grid
               ══════════════════════════════════════════════════════════ */}
            {view === 'inventory' && (
              <>
                {/* Sub-filters */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {['all', 'available', 'sold', 'expired'].map(f => (
                    <button key={f} onClick={() => setInvFilter(f)}
                      className={`tab-btn ${invFilter === f ? 'tab-btn--active' : ''}`}
                      style={{ borderRadius: '20px', padding: '6px 14px' }}>
                      {f === 'all' ? '📋 All' : f === 'available' ? '🟢 Available' : f === 'sold' ? '🔵 Sold' : '⚫ Expired'}
                    </button>
                  ))}
                </div>

                {filteredListings.length === 0 ? (
                  <div className="dash-card">
                    <div className="tab-empty" style={{ padding: '50px' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📦</div>
                      <p style={{ fontWeight: 600, color: '#5F6F65' }}>No listings found</p>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                    {filteredListings.map(l => {
                      const st = INV_STATUS[l.status] || INV_STATUS.available;
                      const discount = l.original_price > 0 ? Math.round((1 - l.price / l.original_price) * 100) : 0;
                      return (
                        <div key={l._id} className="dash-card"
                          onClick={() => { setSelectedListing(l._id); setView('orders'); }}
                          style={{
                            padding: 0, overflow: 'hidden', cursor: 'pointer',
                            opacity: l.status === 'expired' ? 0.6 : 1,
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}>

                          {/* Image */}
                          <div style={{ position: 'relative', height: '140px', overflow: 'hidden' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={l.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'}
                              alt={l.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <span style={{ position: 'absolute', top: 10, right: 10, background: st.bg, color: st.color, padding: '3px 10px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase' }}>
                              {st.label}
                            </span>
                            {discount > 0 && l.status === 'available' && (
                              <span style={{ position: 'absolute', top: 10, left: 10, background: '#2f6b4f', color: '#fff', padding: '3px 8px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 700 }}>
                                {discount}% OFF
                              </span>
                            )}
                            {l.isExpiringSoon && (
                              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(197,34,31,0.9)', color: '#fff', textAlign: 'center', fontSize: '0.72rem', fontWeight: 700, padding: '4px' }}>
                                ⏰ Expiring soon — pickup by {fmtShortDate(l.pickup_time)}
                              </div>
                            )}
                          </div>

                          {/* Body */}
                          <div style={{ padding: '14px 16px' }}>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '4px', lineHeight: 1.3 }}>{l.title}</h3>
                            {(l.preparation_date || l.preparation_time) && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                Prepared: {formatPrepDate(l.preparation_date)} {l.preparation_time ? `@ ${l.preparation_time}` : ''}
                              </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span style={{ fontWeight: 800, color: '#2f6b4f', fontSize: '1.05rem' }}>
                                {Number(l.price) === 0 ? 'FREE' : `₹${Number(l.price).toFixed(0)}`}
                              </span>
                              <span style={{ fontSize: '0.82rem', color: '#5F6F65' }}>
                                {CAT_EMOJI[l.category]} {l.category}
                              </span>
                            </div>

                            {/* Claim progress */}
                            <div style={{ marginBottom: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#9AA0A6', marginBottom: '3px' }}>
                                <span>{l.unitsClaimed} claimed of {l.totalStock}</span>
                                <span style={{ fontWeight: 700, color: l.claimRate >= 70 ? '#16a34a' : '#B06000' }}>{l.claimRate}%</span>
                              </div>
                              <ProgressBar value={l.unitsClaimed} max={l.totalStock || 1}
                                color={l.claimRate >= 70 ? '#16a34a' : l.claimRate >= 30 ? '#B06000' : '#9AA0A6'} />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#9AA0A6', paddingTop: '8px', borderTop: '1px solid #F4F7F9' }}>
                              <span>💰 ₹{l.revenue.toFixed(2)}</span>
                              <span>🧾 {l.itemOrders.length} orders →</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ══════════════════════════════════════════════════════════
                ORDERS — Full order management
               ══════════════════════════════════════════════════════════ */}
            {view === 'orders' && (
              <>
                {/* Sub-filters */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {['all', 'placed', 'picked', 'completed'].map(f => (
                    <button key={f} onClick={() => setOrderFilter(f)}
                      className={`tab-btn ${orderFilter === f ? 'tab-btn--active' : ''}`}
                      style={{ borderRadius: '20px', padding: '6px 14px' }}>
                      {f === 'all' ? `📋 All (${displayOrders.length})` : `${STATUS_CFG[f]?.icon} ${STATUS_CFG[f]?.label}`}
                    </button>
                  ))}
                  {selectedListing && (
                    <span style={{ fontSize: '0.8rem', color: '#1565C0', fontWeight: 600, marginLeft: '8px' }}>
                      Filtered by: {enrichedListings.find(l => l._id === selectedListing)?.title || 'listing'}
                    </span>
                  )}
                </div>

                <div className="dash-card" style={{ padding: 0 }}>
                  {sortedOrders.length === 0 ? (
                    <div className="tab-empty" style={{ padding: '50px' }}>
                      <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🧾</div>
                      <p style={{ fontWeight: 600, color: '#5F6F65' }}>No orders found</p>
                      <p style={{ fontSize: '0.8rem', color: '#9AA0A6', marginTop: '4px' }}>
                        {selectedListing ? 'No orders for this listing yet.' : 'Orders appear when customers rescue your food.'}
                      </p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="inv-table" style={{ minWidth: '720px' }}>
                        <thead>
                          <tr>
                            <th style={{ paddingLeft: '20px' }}>Order</th>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Revenue</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right', paddingRight: '20px' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedOrders.map(o => {
                            const sc = STATUS_CFG[o.status] || STATUS_CFG.placed;
                            const food = o.food_id || {};
                            const isOpen = expandedOrder === o._id;
                            const nextStatus = o.status === 'placed' ? 'picked' : o.status === 'picked' ? 'completed' : null;
                            const nextLabel = o.status === 'placed' ? 'Mark Picked Up' : o.status === 'picked' ? 'Complete' : null;

                            return (
                              <>
                                <tr key={o._id} onClick={() => setExpandedOrder(isOpen ? null : o._id)}
                                  style={{ cursor: 'pointer' }}>
                                  <td style={{ paddingLeft: '20px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <span style={{ width: 34, height: 34, borderRadius: 10, background: sc.bg, color: sc.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.95rem', flexShrink: 0 }}>
                                        {sc.icon}
                                      </span>
                                      <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>#{(o._id || '').slice(-6).toUpperCase()}</div>
                                        <div style={{ fontSize: '0.68rem', color: '#9AA0A6' }}>{isOpen ? '▲ hide' : '▼ details'}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      {food.image && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={food.image} alt="" className="inv-thumb" />
                                      )}
                                      <span className="inv-name" style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {food.title || '—'}
                                      </span>
                                    </div>
                                  </td>
                                  <td><strong>{o.quantity}</strong></td>
                                  <td><strong style={{ color: '#2f6b4f' }}>₹{Number(o.total_price || 0).toFixed(2)}</strong></td>
                                  <td><span style={{ fontSize: '0.8rem', color: '#5F6F65' }}>{fmtShortDate(o.createdAt)}</span></td>
                                  <td><span className={`status-pill status-pill--${o.status}`}>{sc.label}</span></td>
                                  <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                                    {nextStatus ? (
                                      <button disabled={updatingId === o._id}
                                        onClick={e => { e.stopPropagation(); updateStatus(o._id, nextStatus); }}
                                        className={`order-action-btn ${nextStatus === 'completed' ? 'order-action-btn--primary' : 'order-action-btn--secondary'}`}>
                                        {updatingId === o._id ? '…' : nextLabel}
                                      </button>
                                    ) : (
                                      <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 600 }}>Done ✓</span>
                                    )}
                                  </td>
                                </tr>

                                {isOpen && (
                                  <tr key={`${o._id}-detail`} style={{ background: '#FAFBFC' }}>
                                    <td colSpan={7} style={{ padding: '0 20px 16px' }}>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', padding: '14px 16px', background: '#fff', borderRadius: '10px', border: '1px solid #EAEEF2', marginTop: '4px' }}>
                                        <div>
                                          <div style={{ fontSize: '0.7rem', color: '#9AA0A6', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Item</div>
                                          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{food.title || '—'}</div>
                                          {(food.preparation_date || food.preparation_time) && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                              Prep: {formatPrepDate(food.preparation_date)} {food.preparation_time ? `@ ${food.preparation_time}` : ''}
                                            </div>
                                          )}
                                          <div style={{ fontSize: '0.78rem', color: '#5F6F65', marginTop: '2px' }}>{food.category ? `${CAT_EMOJI[food.category] || ''} ${food.category}` : '—'}</div>
                                        </div>
                                        <div>
                                          <div style={{ fontSize: '0.7rem', color: '#9AA0A6', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Pricing</div>
                                          <div style={{ fontSize: '0.85rem' }}>Rescue: <strong style={{ color: '#2f6b4f' }}>₹{Number(food.price || 0).toFixed(2)}</strong></div>
                                          <div style={{ fontSize: '0.78rem', color: '#9AA0A6', marginTop: '2px' }}>Original: <span style={{ textDecoration: 'line-through' }}>₹{Number(food.original_price || 0).toFixed(2)}</span></div>
                                        </div>
                                        <div>
                                          <div style={{ fontSize: '0.7rem', color: '#9AA0A6', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Details</div>
                                          <div style={{ fontSize: '0.82rem' }}>Order Total: <strong style={{ color: '#1565C0' }}>₹{Number(o.total_price || 0).toFixed(2)}</strong></div>
                                          <div style={{ fontSize: '0.78rem', color: '#5F6F65', marginTop: '2px' }}>Placed: {fmtDate(o.createdAt)}</div>
                                        </div>
                                        <div>
                                          <div style={{ fontSize: '0.7rem', color: '#9AA0A6', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Impact</div>
                                          <div style={{ fontSize: '0.85rem' }}>🌱 <strong style={{ color: '#00695C' }}>{(Number(o.quantity || 0) * 2.5).toFixed(1)} kg</strong> CO₂ saved</div>
                                          <div style={{ fontSize: '0.78rem', color: '#5F6F65', marginTop: '2px' }}>
                                            💰 Customer saved ₹{((Number(food.original_price || 0) - Number(food.price || 0)) * Number(o.quantity || 0)).toFixed(2)}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {sortedOrders.length > 0 && (
                    <div style={{ padding: '12px 20px', borderTop: '1px solid #EAEEF2', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#9AA0A6' }}>
                      <span>Showing {sortedOrders.length} order{sortedOrders.length !== 1 ? 's' : ''}</span>
                      <span>Total: <strong style={{ color: '#2f6b4f' }}>₹{sortedOrders.reduce((s, o) => s + Number(o.total_price || 0), 0).toFixed(2)}</strong></span>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
