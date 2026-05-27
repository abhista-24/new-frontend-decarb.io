"use client";
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

/* ─── Role Config ─────────────────────────────────────────────────────────── */
const ROLES = {
  customer: {
    icon: '😋',
    label: 'Customer',
    color: '#2f6b4f',
    bg: 'linear-gradient(135deg,#E6F4EA 0%,#A8E6CF 100%)',
    tagline: 'Rescue surplus meals at incredible discounts',
  },
  restaurant: {
    icon: '🍳',
    label: 'Restaurant',
    color: '#E65100',
    bg: 'linear-gradient(135deg,#FFF3E0 0%,#FFCCBC 100%)',
    tagline: 'Turn food waste into revenue and impact',
  },
  ngo: {
    icon: '🌱',
    label: 'NGO',
    color: '#1565C0',
    bg: 'linear-gradient(135deg,#E3F2FD 0%,#B3E5FC 100%)',
    tagline: 'Distribute free food to communities in need',
  },
};

/* ─── Success screens ─────────────────────────────────────────────────────── */
const SUCCESS = {
  customer: {
    emoji: '🌍',
    headline: 'Welcome to the green side!',
    sub: 'Every meal you rescue shrinks your carbon footprint. The planet thanks you.',
    facts: [
      '🥗 1 rescued meal saves ~2.5 kg of CO₂',
      '🌿 You join 1,000+ eco-conscious rescuers',
      '♻️ Together we are building a zero-waste future',
    ],
    btn: 'Start Rescuing Meals →',
    href: '/consumer',
    accent: '#2f6b4f',
    bgGrad: 'linear-gradient(135deg,#E6F4EA,#A8E6CF)',
  },
  restaurant: {
    emoji: '🎉',
    headline: 'Welcome aboard, partner!',
    sub: 'Your restaurant is now part of the zero-waste movement. Start listing surplus food and recover lost revenue.',
    facts: [
      '💰 Recover up to 40% of surplus food value',
      '📈 Gain visibility with eco-conscious customers',
      '🌍 Every listing lowers your restaurant\'s carbon footprint',
    ],
    btn: 'Open Your Dashboard →',
    href: '/restaurant',
    accent: '#E65100',
    bgGrad: 'linear-gradient(135deg,#FFF3E0,#FFCCBC)',
  },
  ngo: {
    emoji: '🙏',
    headline: 'Thank you for making a difference!',
    sub: 'Your registration is under review. Once verified, you will have full access to claim free food donations for your community.',
    facts: [
      '✅ Registration submitted for verification',
      '📬 You will receive a confirmation email shortly',
      '🤝 Together we eliminate hunger and food waste',
    ],
    btn: 'Explore the NGO Portal →',
    href: '/ngo',
    accent: '#1565C0',
    bgGrad: 'linear-gradient(135deg,#E3F2FD,#B3E5FC)',
  },
};

/* ─── Small helpers ───────────────────────────────────────────────────────── */
function Label({ children }) {
  return (
    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {children}
    </label>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────────────── */
function RegisterContent() {
  const router = useRouter();
  const params = useSearchParams();
  const role = params.get('role') || '';

  /* form state */
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  /* address fields (replaces raw lat/lng) */
  const [area, setArea] = useState('');
  const [locality, setLocality] = useState('');
  const [pincode, setPincode] = useState('');
  const [state, setState] = useState('');

  /* restaurant extra */
  const [gstin, setGstin] = useState('');

  /* ngo extra */
  const [ngoId, setNgoId] = useState('');
  const [certFile, setCertFile] = useState('');        // base64
  const [certName, setCertName] = useState('');
  const certRef = useRef(null);

  /* ui state */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [savedUser, setSavedUser] = useState(null);

  /* redirect if no role selected */
  useEffect(() => {
    if (role && !ROLES[role]) router.replace('/register');
  }, [role, router]);

  /* geolocation */
  const detectLocation = () => {
    setLocating(true);
    navigator.geolocation?.getCurrentPosition(
      (p) => { setLat(p.coords.latitude.toFixed(6)); setLng(p.coords.longitude.toFixed(6)); setLocating(false); },
      () => { setLocating(false); }
    );
  };

  /* cert file */
  const handleCert = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setCertName(f.name);
    const reader = new FileReader();
    reader.onload = (ev) => setCertFile(ev.target.result);
    reader.readAsDataURL(f);
  };

  /* submit */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    /* Removed strict GSTIN & NGO validations — accept any input */

    setLoading(true);
    try {
      const body = {
        role,
        name,
        email,
        password,
        address: { area, locality, pincode, state },
        ...(role === 'restaurant' && { gstin: gstin.toUpperCase() }),
        ...(role === 'ngo' && { ngo_id: ngoId, certificate: certFile }),
      };

      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      localStorage.setItem('decarb_token', data.token);
      localStorage.setItem('decarb_user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('auth-change'));
      setSavedUser(data.user);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ── Role selector (no role chosen yet) ────────────────────────────────── */
  if (!role) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 24px 60px', position: 'relative' }}>
        {/* blobs */}
        <div style={{ position: 'absolute', top: '15%', left: '8%', width: '280px', height: '280px', background: 'radial-gradient(circle,rgba(76,175,122,0.18) 0%,transparent 70%)', filter: 'blur(40px)', zIndex: -1 }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '8%', width: '340px', height: '340px', background: 'radial-gradient(circle,rgba(47,107,79,0.12) 0%,transparent 70%)', filter: 'blur(50px)', zIndex: -1 }} />

        <div className="animate-fade-in" style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--accent)', color: 'var(--primary)', padding: '8px 18px', borderRadius: '30px', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '18px' }}>
            🌍 Join the zero-waste movement
          </div>
          <h1 style={{ fontSize: '3.2rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '12px', letterSpacing: '-0.03em' }}>
            Create Your Account
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto' }}>
            Choose your role to get a tailored experience built for you.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'center', maxWidth: '900px' }}>
          {Object.entries(ROLES).map(([key, cfg]) => (
            <div
              key={key}
              onClick={() => router.push(`/register?role=${key}`)}
              className="floating-card hover-lift"
              style={{ width: '260px', padding: '36px 28px', textAlign: 'center', cursor: 'pointer', background: cfg.bg, border: 'none' }}
            >
              <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>{cfg.icon}</div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: cfg.color, marginBottom: '8px' }}>
                I&apos;m a {cfg.label}
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#5f6f65', lineHeight: 1.5 }}>{cfg.tagline}</p>
              <div style={{ marginTop: '20px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'white', color: cfg.color, padding: '8px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>
                Get Started →
              </div>
            </div>
          ))}
        </div>

        <p style={{ marginTop: '36px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Already have an account?{' '}
          <Link href="/?auth=login" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>Sign In</Link>
        </p>
      </div>
    );
  }

  const cfg = ROLES[role];

  /* ── Success Screen ─────────────────────────────────────────────────────── */
  if (success) {
    const sc = SUCCESS[role];
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 24px 60px', background: sc.bgGrad }}>
        <div className="floating-card animate-fade-in" style={{ maxWidth: '540px', width: '100%', padding: '52px 44px', textAlign: 'center', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)' }}>

          {/* Animated emoji */}
          <div className="animate-float" style={{ fontSize: '5rem', marginBottom: '20px', lineHeight: 1 }}>
            {sc.emoji}
          </div>

          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: sc.accent, marginBottom: '14px', letterSpacing: '-0.02em' }}>
            {sc.headline}
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '28px' }}>
            {sc.sub}
          </p>

          {/* Fact pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '36px', textAlign: 'left' }}>
            {sc.facts.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'rgba(255,255,255,0.7)', padding: '12px 16px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)', border: `1px solid rgba(0,0,0,0.06)` }}>
                {f}
              </div>
            ))}
          </div>

          <button
            onClick={() => router.push(sc.href)}
            className="btn"
            style={{ background: sc.accent, color: '#fff', width: '100%', height: '52px', borderRadius: '14px', fontSize: '1rem', fontWeight: 700, boxShadow: `0 8px 24px ${sc.accent}40` }}
          >
            {sc.btn}
          </button>
        </div>
      </div>
    );
  }

  /* ── Registration Form ──────────────────────────────────────────────────── */
  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', alignItems: 'stretch' }}>

      {/* Left Panel — branding */}
      <div style={{ background: cfg.bg, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '80px 48px', textAlign: 'center' }}>
        <div className="animate-float" style={{ fontSize: '6rem', marginBottom: '24px', lineHeight: 1 }}>{cfg.icon}</div>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, color: cfg.color, marginBottom: '12px' }}>
          Join as {cfg.label}
        </h2>
        <p style={{ fontSize: '1rem', color: '#5F6F65', maxWidth: '340px', lineHeight: 1.6 }}>
          {cfg.tagline}
        </p>

        {/* decorative quote */}
        <div style={{ marginTop: '40px', background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(10px)', borderRadius: '20px', padding: '20px 24px', maxWidth: '340px', border: '1px solid rgba(255,255,255,0.6)' }}>
          <p style={{ fontSize: '0.9rem', fontStyle: 'italic', color: cfg.color, fontWeight: 600, lineHeight: 1.5 }}>
            {role === 'customer' && '"The greatest threat to our planet is the belief that someone else will save it." — Robert Swan'}
            {role === 'restaurant' && '"Wasting food is like stealing from the table of those who are poor and hungry." — Pope Francis'}
            {role === 'ngo' && '"No act of kindness, no matter how small, is ever wasted." — Aesop'}
          </p>
        </div>

        <p style={{ marginTop: '32px', fontSize: '0.85rem', color: '#5F6F65' }}>
          Already have an account?{' '}
          <Link href="/?auth=login" style={{ color: cfg.color, fontWeight: 700, textDecoration: 'none' }}>Sign In</Link>
        </p>
      </div>

      {/* Right Panel — form */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px 48px', background: 'var(--surface)', overflowY: 'auto' }}>

        {/* Back + steps */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '36px' }}>
          <Link href="/register" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            ← Change role
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--accent)', padding: '6px 14px', borderRadius: '20px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: cfg.color, textTransform: 'uppercase' }}>
              {cfg.icon} {cfg.label}
            </span>
          </div>
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '6px', letterSpacing: '-0.02em' }}>
          Create your account
        </h1>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '32px' }}>
          Fill in the details below to get started with Last Bite
        </p>

        {error && (
          <div style={{ background: '#FCE8E6', color: '#C5221F', padding: '14px 16px', borderRadius: '12px', fontSize: '0.88rem', fontWeight: 600, marginBottom: '24px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Full Name */}
          <Field label={role === 'ngo' ? 'Organisation Name' : role === 'restaurant' ? 'Restaurant / Business Name' : 'Full Name'}>
            <input type="text" className="form-input"
              placeholder={role === 'ngo' ? 'e.g. Green Hope Foundation' : role === 'restaurant' ? 'e.g. The Green Kitchen' : 'e.g. Priya Sharma'}
              value={name} onChange={e => setName(e.target.value)} />
          </Field>

          {/* ── Restaurant: GSTIN ── */}
          {role === 'restaurant' && (
            <Field label="GSTIN Number (for verification)">
              <div style={{ position: 'relative' }}>
                <input type="text" className="form-input"
                  placeholder="e.g. 27AAPFU0939F1ZV"
                  value={gstin} onChange={e => setGstin(e.target.value.toUpperCase())}
                  maxLength={15}
                  style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: gstin.length === 15 ? '#2E7D32' : 'var(--text-secondary)', fontWeight: 700 }}>
                  {gstin.length}/15
                </span>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
                Your GSTIN is used solely to verify your business registration. It will not be shared publicly.
              </p>
            </Field>
          )}

          {/* ── NGO: Unique ID + Certificate ── */}
          {role === 'ngo' && (
            <>
              <Field label="NGO Unique Registration ID">
                <input type="text" className="form-input"
                  placeholder="e.g. NGO-MH-2024-00123"
                  value={ngoId} onChange={e => setNgoId(e.target.value)} />
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
                  Issued by your state&apos;s charity commissioner or DARPAN portal.
                </p>
              </Field>

              <Field label="Registration Certificate (PDF / Image)">
                <div
                  onClick={() => certRef.current?.click()}
                  style={{
                    border: `2px dashed ${certFile ? '#1565C0' : 'rgba(95,111,101,0.25)'}`,
                    borderRadius: '14px', padding: '22px 16px', textAlign: 'center',
                    cursor: 'pointer', background: certFile ? '#E3F2FD' : 'rgba(244,247,245,0.5)',
                    transition: 'all 0.25s ease'
                  }}
                >
                  {certFile ? (
                    <>
                      <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>📄</div>
                      <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1565C0' }}>{certName}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '3px' }}>Click to change</p>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>📎</div>
                      <p style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                        Click to upload your certificate
                      </p>
                      <p style={{ fontSize: '0.72rem', color: '#9AA0A6', marginTop: '3px' }}>PDF, JPG, PNG — max 5 MB</p>
                    </>
                  )}
                </div>
                <input ref={certRef} type="file" accept=".pdf,image/*" onChange={handleCert} style={{ display: 'none' }} />
              </Field>
            </>
          )}

          {/* Email */}
          <Field label="Email Address">
            <input type="text" className="form-input"
              placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)} />
          </Field>

          {/* Password */}
          <Field label="Password">
            <input type="password" className="form-input"
              placeholder="Enter a password"
              value={password} onChange={e => setPassword(e.target.value)} />
          </Field>

          {/* ── Address Fields ── */}
          <div>
            <Label>📍 Your Location</Label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

              {/* Area */}
              <input
                type="text"
                className="form-input"
                placeholder="Area / Neighbourhood (e.g. Koramangala)"
                value={area}
                onChange={e => setArea(e.target.value)}
              />

              {/* Locality */}
              <input
                type="text"
                className="form-input"
                placeholder="Locality / Street (e.g. 5th Block)"
                value={locality}
                onChange={e => setLocality(e.target.value)}
              />

              {/* Pincode + State side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Pincode (e.g. 560034)"
                  value={pincode}
                  onChange={e => setPincode(e.target.value)}
                  maxLength={10}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="State (e.g. Karnataka)"
                  value={state}
                  onChange={e => setState(e.target.value)}
                />
              </div>

            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              Used to show nearby surplus deals and donations to you.
            </p>
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading} className="btn"
            style={{ marginTop: '8px', height: '52px', borderRadius: '14px', fontSize: '1rem', fontWeight: 700, background: cfg.color, color: '#fff', boxShadow: `0 8px 24px ${cfg.color}30` }}>
            {loading ? 'Creating account…' : role === 'ngo' ? 'Submit for Verification' : 'Create My Account'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: '100px', color: 'var(--text-secondary)' }}>Loading…</div>}>
      <RegisterContent />
    </Suspense>
  );
}
