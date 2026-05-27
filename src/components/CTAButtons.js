"use client";

export default function CTAButtons({ onSelectRole }) {
  const roles = [
    { 
      id: 'customer', 
      label: "I'm a Customer", 
      icon: '😋', 
      desc: 'Rescue delicious surplus meals at great discounts' 
    },
    { 
      id: 'restaurant', 
      label: "I'm a Restaurant", 
      icon: '🍳', 
      desc: 'List excess food, cut waste, and recover lost revenue' 
    },
    { 
      id: 'ngo', 
      label: "I'm an NGO", 
      icon: '🌱', 
      desc: 'Claim free food donations for communities in need' 
    }
  ];

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '24px',
      justifyContent: 'center',
      marginTop: '40px',
      width: '100%',
      maxWidth: '1000px'
    }}>
      {roles.map((role) => (
        <div
          key={role.id}
          onClick={() => onSelectRole(role.id)}
          className="floating-card hover-lift"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            padding: '30px 24px',
            width: '280px',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: 'var(--surface)',
            border: '1px solid rgba(255,255,255,0.7)',
            transition: 'var(--transition-bounce)'
          }}
        >
          <span style={{ 
            fontSize: '3rem',
            lineHeight: 1
          }}>{role.icon}</span>
          
          <h3 style={{ 
            fontSize: '1.25rem', 
            fontWeight: 800, 
            color: 'var(--primary)',
            marginTop: '8px'
          }}>
            {role.label}
          </h3>
          
          <p style={{ 
            fontSize: '0.85rem', 
            color: 'var(--text-secondary)',
            lineHeight: 1.4
          }}>
            {role.desc}
          </p>
          
          <span className="badge badge-success" style={{
            marginTop: '12px',
            fontSize: '0.7rem',
            fontWeight: 700
          }}>
            Get Started &rarr;
          </span>
        </div>
      ))}
    </div>
  );
}
