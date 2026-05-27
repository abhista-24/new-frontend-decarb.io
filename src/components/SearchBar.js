"use client";

export default function SearchBar({ value, onChange, placeholder = "Search for surplus meals, groceries, bakery..." }) {
  return (
    <div style={{ 
      position: 'relative', 
      width: '100%',
      maxWidth: '600px',
      margin: '0 auto 24px auto'
    }}>
      <input
        type="text"
        className="form-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          paddingLeft: '48px',
          paddingRight: '20px',
          boxShadow: 'var(--shadow-soft)',
          fontSize: '1rem',
          height: '54px',
          borderRadius: '16px'
        }}
      />
      <span style={{
        position: 'absolute',
        left: '18px',
        top: '50%',
        transform: 'translateY(-52%)',
        fontSize: '1.1rem',
        color: 'var(--text-secondary)',
        pointerEvents: 'none'
      }}>
        🔍
      </span>
    </div>
  );
}
