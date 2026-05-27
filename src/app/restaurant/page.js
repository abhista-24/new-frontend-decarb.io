"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import RestaurantSidebar from '@/components/RestaurantSidebar';

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontWeight: 600, fontSize: '0.82rem' }}>
          {p.name}: ₹{Number(p.value).toFixed(2)}
        </p>
      ))}
    </div>
  );
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ icon, label, value, sub, trend, color = '#2f6b4f', bg = '#E6F4EA' }) {
  const isPositive = trend >= 0;
  return (
    <div className="kpi-card">
      <div className="kpi-icon" style={{ background: bg, color }}>
        {icon}
      </div>
      <div className="kpi-body">
        <p className="kpi-label">{label}</p>
        <h3 className="kpi-value" style={{ color }}>{value}</h3>
        {sub && (
          <p className="kpi-sub">
            {trend !== undefined && (
              <span style={{ color: isPositive ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                {isPositive ? '↑' : '↓'} {Math.abs(trend)}%
              </span>
            )}{' '}
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function buildWeekdayData(orders) {
  const rev = Array(7).fill(0);
  const cnt = Array(7).fill(0);
  orders.forEach(o => {
    const d = new Date(o.createdAt || Date.now());
    const wd = (d.getDay() + 6) % 7; // Mon=0
    rev[wd] += Number(o.total_price || 0);
    cnt[wd]++;
  });
  return WEEK_LABELS.map((label, i) => ({ label, Revenue: +rev[i].toFixed(2), Orders: cnt[i] }));
}

function buildTrendData(orders) {
  const map = {};
  orders.forEach(o => {
    const date = new Date(o.createdAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    map[date] = (map[date] || 0) + Number(o.total_price || 0);
  });
  return Object.entries(map)
    .sort((a, b) => new Date(a[0]) - new Date(b[0]))
    .slice(-14)
    .map(([date, rev]) => ({ date, Revenue: +rev.toFixed(2) }));
}

const formatPrepDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const date = new Date(parts[0], parts[1] - 1, parts[2]);
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
  } catch (_) {}
  return dateStr;
};

export default function RestaurantPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const fileInputRef = useRef(null);

  const [listings, setListings] = useState([]);
  const [orders,   setOrders]   = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [loadingOrders,   setLoadingOrders]   = useState(true);
  const [refreshStats, setRefreshStats]       = useState(0);

  // Form states
  const [title,         setTitle]         = useState('');
  const [description,   setDescription]   = useState('');
  const [price,         setPrice]         = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [quantity,      setQuantity]      = useState('1');
  const [category,      setCategory]      = useState('meals');
  const [imageDataUrl,  setImageDataUrl]  = useState('');
  const [imageDragOver, setImageDragOver] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [statusMsg,     setStatusMsg]     = useState({ text: '', type: '' });
  const [orderStatusLoading, setOrderStatusLoading] = useState(null);
  const [activeTab,     setActiveTab]     = useState('claims'); // claims | inventory

  const getDefaultPickupTime = () => {
    const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  const [pickupTime, setPickupTime] = useState(getDefaultPickupTime());

  const getTodayDateString = () => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  };
  const getCurrentTimeString = () => {
    const d = new Date();
    return d.toTimeString().split(' ')[0].slice(0, 5); // HH:MM
  };
  const [preparationDate, setPreparationDate] = useState(getTodayDateString());
  const [preparationTime, setPreparationTime] = useState(getCurrentTimeString());

  // Auth
  useEffect(() => {
    const stored = localStorage.getItem('decarb_user');
    if (!stored) { router.push('/?auth=login'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'restaurant') { router.push('/'); return; }
    setUser(u);
  }, [router]);

  const fetchInventory = async () => {
    if (!user) return;
    setLoadingListings(true);
    try {
      const res = await fetch(`http://localhost:5000/api/food/listings?restaurant_id=${user.id}`);
      if (res.ok) setListings(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoadingListings(false); }
  };

  const fetchOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);
    try {
      const res = await fetch(`http://localhost:5000/api/order/restaurant/${user.id}`);
      if (res.ok) setOrders(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoadingOrders(false); }
  };

  useEffect(() => { if (user) { fetchInventory(); fetchOrders(); } }, [user]);

  // Image helpers
  const processFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) { setStatusMsg({ text: 'Image must be under 5 MB', type: 'error' }); return; }
    const reader = new FileReader();
    reader.onload = (e) => setImageDataUrl(e.target.result);
    reader.readAsDataURL(file);
  };
  const handleDrop = (e) => { e.preventDefault(); setImageDragOver(false); processFile(e.dataTransfer.files[0]); };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!user) return;
    setUploadLoading(true);
    setStatusMsg({ text: '', type: '' });
    try {
      const res = await fetch('http://localhost:5000/api/food/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, description,
          restaurant_id: user.id,
          price: Number(price),
          original_price: Number(originalPrice),
          quantity: Number(quantity),
          category,
          pickup_time: new Date(pickupTime).toISOString(),
          image: imageDataUrl || undefined,
          preparation_date: preparationDate,
          preparation_time: preparationTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setStatusMsg({ text: '🎉 Listing published successfully!', type: 'success' });
      setTitle(''); setDescription(''); setPrice(''); setOriginalPrice('');
      setQuantity('1'); setCategory('meals'); setPickupTime(getDefaultPickupTime()); setImageDataUrl('');
      setPreparationDate(getTodayDateString());
      setPreparationTime(getCurrentTimeString());
      fetchInventory();
      setRefreshStats(p => p + 1);
    } catch (err) { setStatusMsg({ text: err.message, type: 'error' }); }
    finally { setUploadLoading(false); }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    setOrderStatusLoading(orderId);
    try {
      const res = await fetch('http://localhost:5000/api/order/update-status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, status: newStatus }),
      });
      if (res.ok) { fetchOrders(); fetchInventory(); setRefreshStats(p => p + 1); }
    } catch (err) { console.error(err); }
    finally { setOrderStatusLoading(null); }
  };

  if (!user) return null;

  // ── Derived metrics ─────────────────────────────────────────────────────────
  const totalRevenue    = orders.reduce((s, o) => s + Number(o.total_price || 0), 0);
  const mealsRescued    = orders.reduce((s, o) => s + Number(o.quantity || 0), 0);
  const activeListings  = listings.filter(l => l.status === 'available').length;
  const co2Saved        = mealsRescued * 2.5;
  const pendingOrders   = orders.filter(o => o.status === 'placed').length;
  const weekdayData     = buildWeekdayData(orders);
  const trendData       = buildTrendData(orders);

  const statusColor = { available: '#16a34a', sold: '#1A73E8', expired: '#9AA0A6' };
  const statusBg    = { available: '#dcfce7', sold: '#e8f0fe',  expired: '#f1f3f4' };

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="dash-layout">
      <RestaurantSidebar user={user} />

      {/* ── Main Content ── */}
      <main className="dash-main">

        {/* ── Top Bar ── */}
        <div className="dash-topbar">
          <div>
            <h1 className="dash-page-title">Dashboard</h1>
            <p className="dash-page-sub">{today}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {pendingOrders > 0 && (
              <div className="topbar-alert">
                🔔 {pendingOrders} pending order{pendingOrders > 1 ? 's' : ''}
              </div>
            )}
            <Link href="/restaurant/analytics" className="btn-dash-primary">
              📊 Full Analytics
            </Link>
          </div>
        </div>

        {/* ── KPI Row ── */}
        <div className="kpi-row">
          <KpiCard icon="🍲" label="Meals Rescued"    value={mealsRescued}       sub="total this period"    color="#2f6b4f" bg="#E6F4EA" />
          <KpiCard icon="💰" label="Revenue Recovered" value={`₹${totalRevenue.toFixed(2)}`} sub="all orders"  color="#1565C0" bg="#E3F2FD" />
          <KpiCard icon="📋" label="Active Listings"   value={activeListings}    sub="live right now"       color="#7B1FA2" bg="#F3E5F5" />
          <KpiCard icon="🌱" label="CO₂ Saved"         value={`${co2Saved.toFixed(1)} kg`} sub="2.5kg/meal" color="#00796B" bg="#E0F2F1" />
        </div>

        {/* ── Charts Row ── */}
        <div className="charts-row">

          {/* Revenue Trend */}
          <div className="dash-card chart-card">
            <div className="card-header">
              <h2 className="card-title">Revenue Trend</h2>
              <span className="card-badge">Last 14 days</span>
            </div>
            {trendData.length === 0 ? (
              <div className="chart-empty">No order data yet — revenue will appear here</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#2f6b4f" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2f6b4f" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9AA0A6' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9AA0A6' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="Revenue" stroke="#2f6b4f" strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: '#2f6b4f' }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Revenue by Weekday */}
          <div className="dash-card chart-card">
            <div className="card-header">
              <h2 className="card-title">Revenue by Day</h2>
              <span className="card-badge">Weekly pattern</span>
            </div>
            {orders.length === 0 ? (
              <div className="chart-empty">Place some orders to see weekly patterns</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weekdayData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barSize={22}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9AA0A6' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9AA0A6' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="Revenue" fill="#4CAF7A" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Bottom Grid ── */}
        <div className="bottom-grid">

          {/* Upload Form */}
          <div className="dash-card form-card">
            <div className="card-header">
              <h2 className="card-title">🍲 Upload Surplus Food</h2>
            </div>

            {statusMsg.text && (
              <div className={`form-alert form-alert--${statusMsg.type}`}>
                {statusMsg.type === 'success' ? '✔ ' : '⚠ '}{statusMsg.text}
              </div>
            )}

            <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Photo */}
              <div>
                <label className="form-label">Food Photo <span className="form-hint">(optional — max 5 MB)</span></label>
                {imageDataUrl ? (
                  <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', height: '150px' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageDataUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={() => { setImageDataUrl(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setImageDragOver(true); }}
                    onDragLeave={() => setImageDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`drop-zone ${imageDragOver ? 'drop-zone--active' : ''}`}
                  >
                    <div style={{ fontSize: '1.6rem', marginBottom: '6px' }}>📷</div>
                    <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#2f6b4f', margin: 0 }}>Click or drag & drop</p>
                    <p style={{ fontSize: '0.72rem', color: '#9AA0A6', marginTop: '2px' }}>JPG, PNG, WEBP — max 5 MB</p>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={e => processFile(e.target.files[0])} style={{ display: 'none' }} />
              </div>

              {/* Title */}
              <div>
                <label className="form-label">Listing Title</label>
                <input type="text" className="form-input" placeholder="e.g. Avocado Toast Box (Set of 2)" value={title} onChange={e => setTitle(e.target.value)} />
              </div>

              {/* Description */}
              <div>
                <label className="form-label">Description</label>
                <textarea className="form-input" rows="2" placeholder="Describe contents, allergens..." value={description} onChange={e => setDescription(e.target.value)} style={{ resize: 'vertical', minHeight: '60px' }} />
              </div>

              {/* Price row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Rescue Price (₹)</label>
                  <input type="text" className="form-input" placeholder="0 = free" value={price} onChange={e => setPrice(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Original Value (₹)</label>
                  <input type="text" className="form-input" placeholder="Market price" value={originalPrice} onChange={e => setOriginalPrice(e.target.value)} />
                </div>
              </div>

              {/* Qty + Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Quantity</label>
                  <input type="text" className="form-input" value={quantity} onChange={e => setQuantity(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Category</label>
                  <select className="form-input" value={category} onChange={e => setCategory(e.target.value)} style={{ appearance: 'auto' }}>
                    <option value="meals">Surplus Meals</option>
                    <option value="bakery">Bakery / Bread</option>
                    <option value="groceries">Groceries</option>
                    <option value="beverages">Beverages</option>
                    <option value="other">Other Deals</option>
                  </select>
                </div>
              </div>

              {/* Preparation Date & Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Date of Preparation</label>
                  <input
                    type="date"
                    className="form-input"
                    value={preparationDate}
                    onChange={e => setPreparationDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Time of Preparation</label>
                  <input
                    type="time"
                    className="form-input"
                    value={preparationTime}
                    onChange={e => setPreparationTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Pickup */}
              <div>
                <label className="form-label">Pickup Deadline</label>
                <input type="datetime-local" className="form-input" value={pickupTime} onChange={e => setPickupTime(e.target.value)} />
              </div>

              <button type="submit" disabled={uploadLoading} className="btn-dash-primary" style={{ marginTop: '4px', height: '46px' }}>
                {uploadLoading ? 'Publishing...' : '✚ Publish Surplus Listing'}
              </button>
            </form>
          </div>

          {/* Right column: Claims + Inventory Tabs */}
          <div className="dash-card orders-card">
            <div className="card-header">
              <div className="tab-group">
                <button className={`tab-btn ${activeTab === 'claims' ? 'tab-btn--active' : ''}`} onClick={() => setActiveTab('claims')}>
                  🛎 Claims {pendingOrders > 0 && <span className="tab-badge">{pendingOrders}</span>}
                </button>
                <button className={`tab-btn ${activeTab === 'inventory' ? 'tab-btn--active' : ''}`} onClick={() => setActiveTab('inventory')}>
                  📦 Inventory
                </button>
              </div>
              <button onClick={() => { fetchOrders(); fetchInventory(); }} className="btn-icon" title="Refresh">⟳</button>
            </div>

            {/* Claims Tab */}
            {activeTab === 'claims' && (
              <div className="tab-panel">
                {loadingOrders ? (
                  <div className="tab-empty">Loading orders…</div>
                ) : orders.length === 0 ? (
                  <div className="tab-empty">No claims yet. Deals appear here once rescued.</div>
                ) : (
                  <div className="order-list">
                    {orders.map(order => {
                      const isPicked    = order.status === 'picked';
                      const isCompleted = order.status === 'completed';
                      return (
                        <div key={order._id} className="order-row">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span className="order-title">{order.food_id?.title || 'Unknown Item'}</span>
                            <span className={`status-pill status-pill--${order.status}`}>{order.status}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#9AA0A6', marginBottom: isCompleted ? 0 : '10px' }}>
                            <span>Qty: <strong style={{ color: '#1C1C1C' }}>{order.quantity}</strong></span>
                            <span>Total: <strong style={{ color: '#2f6b4f' }}>₹{Number(order.total_price).toFixed(2)}</strong></span>
                          </div>
                          {!isCompleted && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {order.status === 'placed' && (
                                <button disabled={orderStatusLoading === order._id} onClick={() => handleUpdateOrderStatus(order._id, 'picked')}
                                  className="order-action-btn order-action-btn--secondary">
                                  {orderStatusLoading === order._id ? '…' : 'Mark Picked Up'}
                                </button>
                              )}
                              {isPicked && (
                                <button disabled={orderStatusLoading === order._id} onClick={() => handleUpdateOrderStatus(order._id, 'completed')}
                                  className="order-action-btn order-action-btn--primary">
                                  {orderStatusLoading === order._id ? '…' : 'Complete'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Inventory Tab */}
            {activeTab === 'inventory' && (
              <div className="tab-panel">
                {loadingListings ? (
                  <div className="tab-empty">Loading inventory…</div>
                ) : listings.length === 0 ? (
                  <div className="tab-empty">Inventory empty. Use the form to add your first listing.</div>
                ) : (
                  <table className="inv-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listings.map(l => (
                        <tr key={l._id}>
                          <td className="inv-name">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={l.image} alt={l.title} className="inv-thumb" />
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 600 }}>{l.title}</span>
                                {(l.preparation_date || l.preparation_time) && (
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                                    Prepared: {formatPrepDate(l.preparation_date)} {l.preparation_time ? `@ ${l.preparation_time}` : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>₹{Number(l.price).toFixed(2)}</td>
                          <td>{l.quantity}</td>
                          <td>
                            <span className="inv-status" style={{ background: statusBg[l.status] || '#f1f3f4', color: statusColor[l.status] || '#9AA0A6' }}>
                              {l.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
