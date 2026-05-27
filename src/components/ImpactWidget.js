"use client";
import { useEffect, useState } from 'react';
import FloatingCard from './FloatingCard';

export default function ImpactWidget({ userId, restaurantId, refreshTrigger }) {
  const [stats, setStats] = useState({ mealsRescued: 0, co2Saved: 0, revenueRecovered: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        let url = 'http://localhost:5000/api/analytics/stats';
        const params = [];
        if (userId) params.push(`user_id=${userId}`);
        if (restaurantId) params.push(`restaurant_id=${restaurantId}`);
        if (params.length > 0) {
          url += `?${params.join('&')}`;
        }

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch analytics statistics:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [userId, restaurantId, refreshTrigger]);

  // Calculate tree equivalents: roughly 1 tree absorbs 20 kg of CO2 per year
  const treeEquivalent = stats.co2Saved > 0 ? (stats.co2Saved / 20.0).toFixed(1) : '0';

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '30px',
        color: 'var(--text-secondary)',
        fontFamily: "'Outfit', sans-serif"
      }}>
        <div className="animate-float">🌍 Analyzing environmental impact...</div>
      </div>
    );
  }

  const isRestaurant = !!restaurantId;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      width: '100%',
      marginBottom: '30px'
    }}>
      {/* Metric 1: Meals Rescued */}
      <FloatingCard style={{
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        padding: '24px',
        backgroundColor: 'var(--surface)'
      }}>
        <div style={{
          background: 'var(--accent)',
          borderRadius: '16px',
          width: '56px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.8rem'
        }}>
          🍲
        </div>
        <div>
          <h4 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1.1 }}>
            {stats.mealsRescued}
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Meals Rescued
          </p>
        </div>
      </FloatingCard>

      {/* Metric 2: CO2 Saved */}
      <FloatingCard style={{
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        padding: '24px',
        backgroundColor: 'var(--surface)'
      }}>
        <div style={{
          background: '#E1F5FE',
          borderRadius: '16px',
          width: '56px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.8rem'
        }}>
          🌱
        </div>
        <div>
          <h4 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0288D1', lineHeight: 1.1 }}>
            {stats.co2Saved} <span style={{ fontSize: '1rem', fontWeight: 600 }}>kg</span>
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            CO₂ Saved
          </p>
        </div>
      </FloatingCard>

      {/* Metric 3: Custom Role-Based Counter (Revenue Recovered vs. Tree Equivalents) */}
      <FloatingCard style={{
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        padding: '24px',
        backgroundColor: 'var(--surface)'
      }}>
        {isRestaurant ? (
          <>
            <div style={{
              background: '#FFF3E0',
              borderRadius: '16px',
              width: '56px',
              height: '56px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8rem'
            }}>
              💰
            </div>
            <div>
              <h4 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#E65100', lineHeight: 1.1 }}>
                ₹{stats.revenueRecovered.toFixed(2)}
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Revenue Recovered
              </p>
            </div>
          </>
        ) : (
          <>
            <div style={{
              background: '#E8F5E9',
              borderRadius: '16px',
              width: '56px',
              height: '56px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8rem'
            }}>
              🌳
            </div>
            <div>
              <h4 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2E7D32', lineHeight: 1.1 }}>
                {treeEquivalent}
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Tree absorption equiv. (yr)
              </p>
            </div>
          </>
        )}
      </FloatingCard>
    </div>
  );
}
