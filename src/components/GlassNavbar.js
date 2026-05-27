"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

export default function GlassNavbar() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Read the actual theme attribute from documentElement on mount
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(currentTheme);

    // Check local storage for user info on boot
    const storedUser = localStorage.getItem('decarb_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    // Listen for custom authentication changes (e.g. login/register/logout)
    const handleAuthChange = () => {
      const stored = localStorage.getItem('decarb_user');
      setUser(stored ? JSON.parse(stored) : null);
    };

    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('decarb_theme', nextTheme);
  };

  const handleLogout = () => {
    localStorage.removeItem('decarb_user');
    localStorage.removeItem('decarb_token');
    setUser(null);
    window.dispatchEvent(new Event('auth-change'));
    router.push('/');
  };

  return (
    <nav className="glass-panel" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      width: '100%',
      height: '70px',
      borderRadius: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 30px',
      zIndex: 1000,
      boxShadow: '0 2px 20px rgba(0,0,0,0.08)'
    }}>
      {/* Brand Logo */}
      <Link href="/" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        textDecoration: 'none',
        fontWeight: 800,
        fontSize: '1.4rem',
        color: 'var(--primary)',
        fontFamily: "'Outfit', sans-serif"
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Last Bite" style={{ width: '32px', height: '32px' }} />
        Last <span style={{ color: 'var(--secondary)' }}>Bite</span>
      </Link>

      {/* Nav Links */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px'
      }}>
        <Link href="/" style={{
          color: pathname === '/' ? 'var(--primary)' : 'var(--text-secondary)',
          fontWeight: pathname === '/' ? '700' : '500',
          textDecoration: 'none',
          fontSize: '0.95rem',
          transition: 'var(--transition-smooth)'
        }}>
          Home
        </Link>

        {user && user.role === 'customer' && (
          <Link href="/consumer" style={{
            color: pathname === '/consumer' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: pathname === '/consumer' ? '700' : '500',
            textDecoration: 'none',
            fontSize: '0.95rem',
            transition: 'var(--transition-smooth)'
          }}>
            Rescue Deals
          </Link>
        )}

        {user && user.role === 'restaurant' && (
          <Link href="/restaurant" style={{
            color: pathname === '/restaurant' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: pathname === '/restaurant' ? '700' : '500',
            textDecoration: 'none',
            fontSize: '0.95rem',
            transition: 'var(--transition-smooth)'
          }}>
            Dashboard
          </Link>
        )}

        {user && user.role === 'restaurant' && (
          <Link href="/restaurant/analytics" style={{
            color: pathname === '/restaurant/analytics' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: pathname === '/restaurant/analytics' ? '700' : '500',
            textDecoration: 'none',
            fontSize: '0.95rem',
            transition: 'var(--transition-smooth)'
          }}>
            Analytics
          </Link>
        )}

        {user && user.role === 'ngo' && (
          <Link href="/ngo" style={{
            color: pathname === '/ngo' ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: pathname === '/ngo' ? '700' : '500',
            textDecoration: 'none',
            fontSize: '0.95rem',
            transition: 'var(--transition-smooth)'
          }}>
            NGO Portal
          </Link>
        )}
      </div>

      {/* Auth Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'var(--transition-smooth)',
            color: 'var(--text-primary)',
            outline: 'none',
            padding: 0,
          }}
          aria-label="Toggle Theme"
          className="btn-icon"
        >
          {theme === 'light' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.5s ease' }}>
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.5s ease', transform: 'rotate(45deg)' }}>
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
          )}
        </button>

        {user ? (
          <>
            <span style={{
              fontSize: '0.85rem',
              background: 'var(--accent)',
              color: 'var(--primary)',
              padding: '6px 12px',
              borderRadius: '20px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {user.role}
            </span>
            <span style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--text-primary)'
            }}>
              Hi, {user.name.split(' ')[0]}
            </span>
            <button onClick={handleLogout} className="btn btn-glass" style={{
              padding: '8px 16px',
              fontSize: '0.85rem'
            }}>
              Sign Out
            </button>
          </>
        ) : (
          <>
            {/* We will route to modals or standard routes. Let's make an intuitive modal trigger or redirect them to sign-in */}
            <Link href="/?auth=login" className="btn btn-glass" style={{
              padding: '8px 16px',
              fontSize: '0.85rem'
            }}>
              Sign In
            </Link>
            <Link href="/?auth=register" className="btn btn-primary" style={{
              padding: '8px 16px',
              fontSize: '0.85rem'
            }}>
              Get Started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
