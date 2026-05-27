"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import RestaurantSidebar from '@/components/RestaurantSidebar';

// ── Shared tooltip ─────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label, currency = true }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontWeight: 600, fontSize: '0.8rem' }}>
          {p.name}: {currency ? '₹' : ''}{Number(p.value).toFixed(currency ? 2 : 0)}
        </p>
      ))}
    </div>
  );
};

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

// ── Constants ─────────────────────────────────────────────────────────────────
const WEEK  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const MONTH = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DONUT_COLORS = ['#2f6b4f', '#4CAF7A', '#9AA0A6', '#1A73E8'];

export default function RestaurantAnalyticsPage() {
  const router = useRouter();
  const [user,     setUser]     = useState(null);
  const [orders,   setOrders]   = useState([]);
  const [listings, setListings] = useState([]);
  const [loading,  setLoading]  = useState(true);

  // Auth
  useEffect(() => {
    const stored = localStorage.getItem('decarb_user');
    if (!stored) { router.push('/?auth=login'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'restaurant') { router.push('/'); return; }
    setUser(u);
  }, [router]);

  // Fetch
  useEffect(() => {
    if (!user) return;
    async function load() {
      setLoading(true);
      try {
        const [ordRes, lstRes] = await Promise.all([
          fetch(`http://localhost:5000/api/order/restaurant/${user.id}`),
          fetch(`http://localhost:5000/api/food/listings?restaurant_id=${user.id}`),
        ]);
        if (ordRes.ok) setOrders(await ordRes.json());
        if (lstRes.ok) setListings(await lstRes.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    load();
  }, [user]);

  if (!user) return null;

  // ── Derived metrics ─────────────────────────────────────────────────────────
  const completedOrders = orders.filter(o => o.status === 'completed');
  const activeOrders    = orders.filter(o => o.status === 'placed');
  const inTransit       = orders.filter(o => o.status === 'picked');

  const totalRevenue    = orders.reduce((s, o) => s + Number(o.total_price || 0), 0);
  const completedRev    = completedOrders.reduce((s, o) => s + Number(o.total_price || 0), 0);
  const totalItemsSold  = orders.reduce((s, o) => s + Number(o.quantity || 0), 0);
  const co2Saved        = totalItemsSold * 2.5;
  const uniqueCustomers = new Set(orders.map(o => o.user_id)).size;
  const avgOrderValue   = orders.length > 0 ? totalRevenue / orders.length : 0;

  const customerSavings = orders.reduce((s, o) => {
    const food = o.food_id || {};
    return s + (Number(food.original_price || 0) - Number(food.price || 0)) * Number(o.quantity || 0);
  }, 0);

  const invAvailable = listings.filter(l => l.status === 'available').length;
  const invSold      = listings.filter(l => l.status === 'sold').length;
  const invExpired   = listings.filter(l => l.status === 'expired').length;
  const fulfillRate  = orders.length > 0 ? ((completedOrders.length / orders.length) * 100).toFixed(0) : 0;

  // ── Chart Data ──────────────────────────────────────────────────────────────

  // Weekday revenue + orders
  const revByWd = Array(7).fill(0);
  const cntByWd = Array(7).fill(0);
  orders.forEach(o => {
    const wd = (new Date(o.createdAt || Date.now()).getDay() + 6) % 7;
    revByWd[wd] += Number(o.total_price || 0);
    cntByWd[wd]++;
  });
  const weekdayData = WEEK.map((label, i) => ({ label, Revenue: +revByWd[i].toFixed(2), Orders: cntByWd[i] }));

  // Monthly revenue
  const revByMonth = Array(12).fill(0);
  orders.forEach(o => { revByMonth[new Date(o.createdAt || Date.now()).getMonth()] += Number(o.total_price || 0); });
  const monthData = MONTH.map((label, i) => ({ label, Revenue: +revByMonth[i].toFixed(2) }));

  // Daily trend (last 30 days)
  const dayMap = {};
  orders.forEach(o => {
    const d = new Date(o.createdAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    dayMap[d] = (dayMap[d] || 0) + Number(o.total_price || 0);
  });
  const trendData = Object.entries(dayMap)
    .sort((a, b) => new Date(a[0]) - new Date(b[0]))
    .slice(-30)
    .map(([date, rev]) => ({ date, Revenue: +rev.toFixed(2) }));

  // Category revenue
  const catMap = {};
  listings.forEach(l => {
    const rev = orders.filter(o => (o.food_id?._id || o.food_id) === l._id)
                      .reduce((s, o) => s + Number(o.total_price || 0), 0);
    catMap[l.category] = (catMap[l.category] || 0) + rev;
  });
  const catData = Object.entries(catMap).map(([label, value]) => ({ label, Revenue: +value.toFixed(2) }));

  // Inventory donut
  const invDonut = [
    { name: 'Available', value: invAvailable },
    { name: 'Sold',      value: invSold      },
    { name: 'Expired',   value: invExpired   },
  ].filter(d => d.value > 0);

  // Order status donut
  const orderDonut = [
    { name: 'Completed', value: completedOrders.length },
    { name: 'In Transit', value: inTransit.length     },
    { name: 'Pending',   value: activeOrders.length   },
  ].filter(d => d.value > 0);

  // Top listings
  const listingPerf = listings.map(l => {
    const claimed = orders.filter(o => (o.food_id?._id || o.food_id) === l._id)
                          .reduce((s, o) => s + Number(o.quantity || 0), 0);
    const rev = orders.filter(o => (o.food_id?._id || o.food_id) === l._id)
                      .reduce((s, o) => s + Number(o.total_price || 0), 0);
    return { ...l, claimedQty: claimed, revenue: rev };
  }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="dash-layout">
      <RestaurantSidebar user={user} />

      <main className="dash-main">

        {/* ── Top Bar ── */}
        <div className="dash-topbar">
          <div>
            <h1 className="dash-page-title">Business Analytics</h1>
            <p className="dash-page-sub">{today}</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div className="topbar-badge">{invAvailable} Live listings</div>
            <div className="topbar-badge topbar-badge--neutral">{listings.length} Total listed</div>
          </div>
        </div>

        {loading ? (
          <div className="dash-loading">📊 Crunching your business numbers…</div>
        ) : (
          <>
            {/* ── KPI Row ── */}
            <div className="kpi-row kpi-row--wide">
              <KpiCard icon="💰" label="Total Revenue"       value={`₹${totalRevenue.toFixed(2)}`}    sub="All orders" color="#1565C0" bg="#E3F2FD" />
              <KpiCard icon="✅" label="Confirmed Revenue"   value={`₹${completedRev.toFixed(2)}`}    sub={`${completedOrders.length} completed`} color="#2E7D32" bg="#E8F5E9" />
              <KpiCard icon="👥" label="Unique Customers"    value={uniqueCustomers}                   sub="Distinct buyers / NGOs" color="#6A1B9A" bg="#F3E5F5" />
              <KpiCard icon="🍱" label="Items Rescued"       value={totalItemsSold}                    sub="Total qty sold" color="#E65100" bg="#FFF3E0" />
              <KpiCard icon="🌱" label="CO₂ Saved"           value={`${co2Saved.toFixed(1)} kg`}       sub="2.5 kg/meal" color="#00695C" bg="#E0F2F1" />
              <KpiCard icon="🎁" label="Customer Savings"    value={`₹${customerSavings.toFixed(2)}`} sub="Discount generated" color="#7B1FA2" bg="#F3E5F5" />
              <KpiCard icon="📋" label="Avg Order Value"     value={`₹${avgOrderValue.toFixed(2)}`}   sub={`${orders.length} orders`} color="#BF360C" bg="#FBE9E7" />
              <KpiCard icon="🎯" label="Fulfillment Rate"    value={`${fulfillRate}%`}                 sub="Completed vs total" color="#0277BD" bg="#E1F5FE" />
            </div>

            {/* ── Row 1: Revenue Trend + Bar Chart ── */}
            <div className="charts-row">
              <div className="dash-card chart-card chart-card--tall">
                <div className="card-header">
                  <h2 className="card-title">Revenue Trend (30 days)</h2>
                  <span className="card-badge">Daily</span>
                </div>
                {trendData.length === 0 ? (
                  <div className="chart-empty">No order data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#1565C0" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#1565C0" stopOpacity={0}   />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9AA0A6' }} tickLine={false} axisLine={false} interval={2} />
                      <YAxis tick={{ fontSize: 10, fill: '#9AA0A6' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="Revenue" stroke="#1565C0" strokeWidth={2.5} fill="url(#revGrad2)" dot={false} activeDot={{ r: 4 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="dash-card chart-card chart-card--tall">
                <div className="card-header">
                  <h2 className="card-title">Revenue by Weekday</h2>
                  <span className="card-badge">Pattern</span>
                </div>
                {weekdayData.every(d => d.Revenue === 0) ? (
                  <div className="chart-empty">No revenue data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={weekdayData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }} barSize={24}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9AA0A6' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#9AA0A6' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
                      <Bar dataKey="Revenue" fill="#4CAF7A" radius={[6,6,0,0]} />
                      <Bar dataKey="Orders"  fill="#A8E6CF" radius={[6,6,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* ── Row 2: Monthly + Category ── */}
            <div className="charts-row">
              <div className="dash-card chart-card chart-card--tall">
                <div className="card-header">
                  <h2 className="card-title">Monthly Revenue</h2>
                  <span className="card-badge">This year</span>
                </div>
                {monthData.every(d => d.Revenue === 0) ? (
                  <div className="chart-empty">No monthly data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={monthData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9AA0A6' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#9AA0A6' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                      <Tooltip content={<ChartTooltip />} />
                      <Line type="monotone" dataKey="Revenue" stroke="#2f6b4f" strokeWidth={2.5} dot={{ r: 4, fill: '#2f6b4f' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="dash-card chart-card chart-card--tall">
                <div className="card-header">
                  <h2 className="card-title">Revenue by Category</h2>
                  <span className="card-badge">Breakdown</span>
                </div>
                {catData.length === 0 ? (
                  <div className="chart-empty">No category data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={catData} layout="vertical" margin={{ top: 8, right: 16, left: 20, bottom: 0 }} barSize={18}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#9AA0A6' }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                      <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: '#9AA0A6' }} tickLine={false} axisLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="Revenue" fill="#7B1FA2" radius={[0,6,6,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* ── Row 3: Donut Charts ── */}
            <div className="charts-row charts-row--3">
              {/* Inventory Health */}
              <div className="dash-card chart-card">
                <div className="card-header"><h2 className="card-title">Inventory Health</h2></div>
                {invDonut.length === 0 ? (
                  <div className="chart-empty">No listings yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={invDonut} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                        {invDonut.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} />
                      <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Order Status */}
              <div className="dash-card chart-card">
                <div className="card-header"><h2 className="card-title">Order Status</h2></div>
                {orderDonut.length === 0 ? (
                  <div className="chart-empty">No orders yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={orderDonut} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                        {orderDonut.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} />
                      <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Quick stats card */}
              <div className="dash-card chart-card">
                <div className="card-header"><h2 className="card-title">Order Pipeline</h2></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '8px 0' }}>
                  {[
                    { label: 'Completed', count: completedOrders.length, color: '#16a34a', bg: '#dcfce7' },
                    { label: 'In Transit', count: inTransit.length,      color: '#1A73E8', bg: '#e8f0fe' },
                    { label: 'Pending',   count: activeOrders.length,    color: '#B06000', bg: '#FEF3D6' },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.88rem', color: '#5F6F65', fontWeight: 500 }}>{item.label}</span>
                      <span style={{ background: item.bg, color: item.color, fontWeight: 700, fontSize: '0.82rem', padding: '4px 12px', borderRadius: '20px' }}>
                        {item.count}
                      </span>
                    </div>
                  ))}
                  <div style={{ marginTop: '8px', borderTop: '1px solid #f0f0f0', paddingTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.88rem', color: '#5F6F65', fontWeight: 500 }}>Fulfillment Rate</span>
                      <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#2f6b4f' }}>{fulfillRate}%</span>
                    </div>
                    {/* Progress bar */}
                    <div style={{ background: '#f0f0f0', borderRadius: '6px', height: '6px', marginTop: '8px', overflow: 'hidden' }}>
                      <div style={{ background: '#2f6b4f', width: `${fulfillRate}%`, height: '100%', borderRadius: '6px', transition: 'width 0.8s ease' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Row 4: Top Listings + Recent Orders Table ── */}
            <div className="charts-row">
              {/* Top Listings */}
              <div className="dash-card">
                <div className="card-header">
                  <h2 className="card-title">🏆 Top Performing Listings</h2>
                </div>
                {listingPerf.length === 0 ? (
                  <div className="chart-empty">No listing data yet</div>
                ) : (
                  <table className="inv-table">
                    <thead>
                      <tr><th>#</th><th>Item</th><th>Units</th><th>Revenue</th></tr>
                    </thead>
                    <tbody>
                      {listingPerf.map((l, idx) => (
                        <tr key={l._id}>
                          <td>
                            <span className="rank-badge" style={{ background: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : '#E6F4EA', color: idx < 3 ? '#fff' : '#2f6b4f' }}>
                              {idx + 1}
                            </span>
                          </td>
                          <td className="inv-name">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={l.image} alt={l.title} className="inv-thumb" />
                              <span>{l.title}</span>
                            </div>
                          </td>
                          <td>{l.claimedQty}</td>
                          <td style={{ fontWeight: 700, color: '#2f6b4f' }}>₹{l.revenue.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Recent Orders */}
              <div className="dash-card">
                <div className="card-header">
                  <h2 className="card-title">🧾 Recent Orders</h2>
                  <span className="card-badge">{orders.length} total</span>
                </div>
                {orders.length === 0 ? (
                  <div className="chart-empty">No orders yet</div>
                ) : (
                  <div style={{ overflowY: 'auto', maxHeight: '320px' }}>
                    <table className="inv-table">
                      <thead>
                        <tr><th>Item</th><th>Qty</th><th>Revenue</th><th>Status</th></tr>
                      </thead>
                      <tbody>
                        {[...orders].reverse().slice(0, 20).map(o => (
                          <tr key={o._id}>
                            <td className="inv-name" style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {o.food_id?.title || '—'}
                            </td>
                            <td>{o.quantity}</td>
                            <td style={{ fontWeight: 700, color: '#2f6b4f' }}>₹{Number(o.total_price).toFixed(2)}</td>
                            <td>
                              <span className={`status-pill status-pill--${o.status}`}>{o.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
