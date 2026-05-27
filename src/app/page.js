"use client";
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CTAButtons from '@/components/CTAButtons';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  /* Dynamic Motto */
  const mottos = [
    "Every meal saved reduces carbon footprint",
    "Zero food waste future",
    "Turning surplus into impact",
    "Food for all, waste for none",
  ];
  const [mottoIndex, setMottoIndex] = useState(0);
  const [fadeState, setFadeState] = useState('in');

  /* ── Sign-in modal only ── */
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  /* Motto ticker */
  useEffect(() => {
    const iv = setInterval(() => {
      setFadeState('out');
      setTimeout(() => { setMottoIndex(p => (p + 1) % mottos.length); setFadeState('in'); }, 500);
    }, 4000);
    return () => clearInterval(iv);
  }, [mottos.length]);



  /* Listen for ?auth=login query */
  useEffect(() => {
    const authType = searchParams.get('auth');
    if (authType === 'login') {
      setShowLogin(true);
    } else if (authType === 'register') {
      router.replace('/register');
    } else {
      setShowLogin(false);
    }
  }, [searchParams, router]);

  const closeLogin = () => { setShowLogin(false); router.push('/'); };

  /* CTA role cards → dedicated register page with role pre-selected */
  const handleRoleCardClick = (role) => {
    router.push(`/register?role=${role}`);
  };

  /* Sign-in submit */
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      localStorage.setItem('decarb_token', data.token);
      localStorage.setItem('decarb_user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('auth-change'));

      if (data.user.role === 'customer') router.push('/consumer');
      else if (data.user.role === 'restaurant') router.push('/restaurant');
      else if (data.user.role === 'ngo') router.push('/ngo');
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: '120px',
      paddingBottom: '60px',
      paddingLeft: '24px',
      paddingRight: '24px',
      position: 'relative',
    }}>

      {/* Background blobs */}
      <div style={{ position: 'absolute', top: '10%', left: '10%', width: '300px', height: '300px', background: 'radial-gradient(circle,rgba(76,175,122,0.15) 0%,transparent 70%)', filter: 'blur(40px)', zIndex: -1, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '20%', right: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle,rgba(47,107,79,0.12) 0%,transparent 70%)', filter: 'blur(50px)', zIndex: -1, pointerEvents: 'none' }} />

      {/* ── Hero ── */}
      <div className="animate-fade-in" style={{ textAlign: 'center', maxWidth: '820px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--accent)', color: 'var(--primary)', padding: '8px 18px', borderRadius: '30px', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
          <span>🌍</span> Eliminate food waste together
        </div>

        <h1 className="gradient-text" style={{ fontSize: '4.5rem', lineHeight: 1.05, fontWeight: 800, letterSpacing: '-0.03em' }}>
          Rescue Food.<br />Reduce Waste.
        </h1>

        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', fontWeight: 500, maxWidth: '520px', lineHeight: 1.55 }}>
          Connecting local surplus food listings directly to hungry consumers and distribution NGOs.
        </p>

        {/* Motto */}
        <div style={{ height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.05rem', fontWeight: 600, color: 'var(--primary)', opacity: fadeState === 'in' ? 1 : 0, transform: fadeState === 'in' ? 'translateY(0)' : 'translateY(-10px)', transition: 'all 0.5s ease-in-out', fontFamily: "'Outfit', sans-serif" }}>
          🍃 {mottos[mottoIndex]}
        </div>
      </div>

      {/* ── CTA Role Cards ── */}
      <div className="animate-fade-in" style={{ animationDelay: '0.2s', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <CTAButtons onSelectRole={handleRoleCardClick} />
      </div>

      {/* ── Sign-In Modal ── */}
      {showLogin && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(47,107,79,0.15)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div className="floating-card animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '40px', background: 'var(--surface)' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)' }}>Sign In</h2>
              <button onClick={closeLogin} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)', lineHeight: 1 }}>×</button>
            </div>

            {loginError && (
              <div style={{ background: '#FCE8E6', color: '#C5221F', padding: '12px 14px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '20px' }}>
                ⚠️ {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Email Address</label>
                <input type="text" className="form-input" placeholder="name@decarb.io" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Password</label>
                <input type="password" className="form-input" placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
              </div>
              <button type="submit" disabled={loginLoading} className="btn btn-primary" style={{ height: '50px', borderRadius: '12px', fontSize: '1rem', marginTop: '8px' }}>
                {loginLoading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '20px' }}>
              Don&apos;t have an account?{' '}
              <button type="button" onClick={() => router.push('/register')}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
                Create one →
              </button>
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: '100px', color: 'var(--text-secondary)' }}>Loading…</div>}>
      <HomeContent />
    </Suspense>
  );
}
