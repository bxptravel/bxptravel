export default function Logo({ color = '#1C1B19', size = 19 }) {
  return (
    <div
      className="font-mark font-extrabold leading-none"
      style={{ color, fontSize: size, letterSpacing: '0.04em' }}
    >
      BXP
    </div>
  )
}
