import { useThemeStore } from '../store/themeStore'

export function ThemeToggle({ size = 30 }: { size?: number }) {
  const theme = useThemeStore((s) => s.theme)
  const toggle = useThemeStore((s) => s.toggle)

  return (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-label="Toggle color theme"
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        color: 'var(--text-2)',
        fontSize: size * 0.5,
        cursor: 'pointer',
        lineHeight: 1,
        padding: 0,
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
