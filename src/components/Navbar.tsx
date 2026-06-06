import { List } from '@phosphor-icons/react'
import ottoLogo from '../assets/logo_nobg.png'

interface Props {
  onMenuClick: () => void
  isMobile: boolean
}

export function Navbar({ onMenuClick, isMobile }: Props) {
  return (
    <div
      className="flex items-center justify-between px-4 flex-shrink-0 border-b"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        height: 48,
      }}
    >
      <div className="flex items-center gap-2.5">
        {isMobile && (
          <button
            onClick={onMenuClick}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <List size={19} />
          </button>
        )}
        <img src={ottoLogo} alt="Otto" style={{ width: 20, height: 20, objectFit: 'contain' }} />
        <span
          className="text-[13px] font-semibold tracking-tight"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Otto
        </span>
      </div>
    </div>
  )
}
