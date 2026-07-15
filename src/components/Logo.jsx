export default function Logo({ color = '#1C1B19', size = 19 }) {
  return (
    <div
      className="font-mark font-extrabold flex items-center leading-none"
      style={{ color, fontSize: size, letterSpacing: '0.02em' }}
    >
      <span>B</span>
      <span
        style={{
          display: 'inline-block',
          lineHeight: 1,
          padding: '3px 2px 2px',
          margin: '0 1px',
          borderTop: `1.5px solid ${color}`,
          borderBottom: `1.5px solid ${color}`,
        }}
      >
        X
      </span>
      <span>P</span>
    </div>
  )
}
