import { Link, Images, ChartBar, MagnifyingGlass, GearSix } from '@phosphor-icons/react'
import ottoLogo from '../assets/logo_nobg.png'
import type { SidebarTab } from '../types'
import { LiquidGlassCard } from '../../components/uilayouts/liquid-glass'

const PAGES: { id: SidebarTab; Icon: React.ElementType; label: string }[] = [
  { id: 'links',     Icon: Link,            label: 'Links' },
  { id: 'media',     Icon: Images,          label: 'Media' },
  { id: 'dashboard', Icon: ChartBar,        label: 'Dashboard' },
  { id: 'browse',    Icon: MagnifyingGlass, label: 'Search' },
  { id: 'settings',  Icon: GearSix,         label: 'Settings' },
]

interface Props {
  activePage: SidebarTab | null
  onPageClick: (page: SidebarTab) => void
}

export function MobileNav({ activePage, onPageClick }: Props) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 flex justify-center items-end"
      style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom))', zIndex: 50, pointerEvents: 'none' }}
    >
      <div style={{ pointerEvents: 'auto' }}>
        <LiquidGlassCard
          draggable={false}
          blurIntensity="lg"
          glowIntensity="sm"
          shadowIntensity="sm"
          borderRadius="28px"
          className="flex flex-row items-center px-4 py-0"
          style={{ height: 52 }}
        >
          {/* Otto logo */}
          <div className="flex items-center justify-center relative z-30" style={{ width: 32, height: 52 }}>
            <img src={ottoLogo} alt="Otto" style={{ width: 24, height: 24, objectFit: 'contain' }} />
          </div>

          {/* Divider */}
          <div className="relative z-30" style={{ width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.15)', margin: '0 6px' }} />

          {/* Nav icons */}
          <div className="flex flex-row items-center gap-1 relative z-30">
            {PAGES.map(({ id, Icon, label }) => {
              const active = activePage === id
              return (
                <button
                  key={id}
                  title={label}
                  onClick={() => onPageClick(id)}
                  className="flex items-center justify-center rounded-2xl transition-all duration-150"
                  style={{
                    width: 40,
                    height: 40,
                    color: active ? 'var(--color-accent)' : 'rgba(255,255,255,0.5)',
                    backgroundColor: active ? 'var(--color-accent-glow)' : 'transparent',
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.1)'
                      ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.85)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                      ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'
                    }
                  }}
                >
                  <Icon size={17} weight={active ? 'fill' : 'regular'} />
                </button>
              )
            })}
          </div>
        </LiquidGlassCard>
      </div>
    </div>
  )
}
