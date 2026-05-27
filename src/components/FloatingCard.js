export default function FloatingCard({ children, style, className = '', hoverEffect = true, ...props }) {
  return (
    <div 
      className={`floating-card ${hoverEffect ? 'hover-lift' : ''} ${className}`}
      style={{
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
}
