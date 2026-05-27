"use client";

export default function CategoryTabs({ activeCategory, onSelect }) {
  const categories = [
    { id: 'all', label: 'All Foods', icon: '🍱' },
    { id: 'meals', label: 'Surplus Meals', icon: '🍲' },
    { id: 'bakery', label: 'Fresh Bakery', icon: '🥐' },
    { id: 'groceries', label: 'Groceries', icon: '🍎' },
    { id: 'beverages', label: 'Beverages', icon: '🥤' },
    { id: 'other', label: 'Other Deals', icon: '🥨' }
  ];

  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      overflowX: 'auto',
      padding: '4px 4px 16px 4px',
      marginBottom: '24px',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
      justifyContent: 'center'
    }}>
      {categories.map((cat) => {
        const isActive = activeCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className="btn"
            style={{
              padding: '10px 20px',
              borderRadius: '20px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
              backgroundColor: isActive ? 'var(--primary)' : 'var(--surface)',
              color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
              border: isActive ? 'none' : '1px solid var(--border)',
              boxShadow: isActive ? '0 6px 15px rgba(47, 107, 79, 0.15)' : 'var(--shadow-soft)',
              transition: 'var(--transition-smooth)'
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>{cat.icon}</span>
            <span style={{ fontWeight: isActive ? 700 : 500 }}>{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
}
