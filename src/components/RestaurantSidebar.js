"use client";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const NAV = [
  { href: '/restaurant',           icon: '▪', label: 'Dashboard'   },
  { href: '/restaurant/analytics', icon: '▪', label: 'Analytics'   },
  { href: '/restaurant/orders',    icon: '▪', label: 'Operations'  },
];

export default function RestaurantSidebar({ user }) {
  const pathname = usePathname();
  const router   = useRouter();

  const handleSignOut = () => {
    localStorage.removeItem('decarb_user');
    router.push('/');
  };

  return (
    <aside className="dash-sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Last Bite" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
        </div>
        <div>
          <div className="sidebar-brand-name">Last Bite</div>
          <div className="sidebar-brand-sub">Restaurant Portal</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV.map(({ href, icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`sidebar-link ${active ? 'sidebar-link--active' : ''}`}
            >
              <span className="sidebar-link-icon">
                {label === 'Dashboard'  && '⊞'}
                {label === 'Analytics'  && '📈'}
                {label === 'Operations' && '🧾'}
              </span>
              <span>{label}</span>
              {active && <span className="sidebar-link-pip" />}
            </Link>
          );
        })}
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* User + Logout */}
      {user && (
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {(user.name || user.email || 'R')[0].toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="sidebar-user-name">{user.name || 'Restaurant'}</div>
              <div className="sidebar-user-role">Owner</div>
            </div>
          </div>
          <button className="sidebar-logout" onClick={handleSignOut}>
            <span>↩</span> Sign Out
          </button>
        </div>
      )}
    </aside>
  );
}
