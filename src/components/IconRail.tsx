import { motion } from 'motion/react'
import { Link, Images, ChartBar, MagnifyingGlass, GearSix } from '@phosphor-icons/react'
import ottoLogo from '../assets/logo_nobg.png'
import type { SidebarTab } from '../types'
import { LiquidGlassCard } from '../../components/uilayouts/liquid-glass'

const PAGES: { id: SidebarTab; Icon: React.ElementType; label: string }[] = [
  { id: 'links',     Icon: Link,            label: 'Links' },
  { id: 'media',     Icon: Images,          label: 'Media' },
  { id: 'dashboard', Icon: ChartBar,        label: 'Dashboard' },
  { id: 'browse',    Icon: MagnifyingGlass, label: 'Search' },
]

interface Props {
  activePage: SidebarTab | null
  onPageClick: (page: SidebarTab) => void
}

export function IconRail({ activePage, onPageClick }: Props) {
  return (
    <div
      className="fixed flex flex-col items-center"
      style={{ left: 16, top: '50%', transform: 'translateY(-50%)', zIndex: 20 }}
    >
      <LiquidGlassCard
        draggable={false}
        blurIntensity="lg"
        glowIntensity="sm"
        shadowIntensity="sm"
        borderRadius="28px"
        className="flex flex-col items-center pt-4 pb-5 px-0"
        style={{ width: 52 }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center mb-4 relative z-30" style={{ width: 52, height: 32 }}>
          <img src={ottoLogo} alt="Otto" style={{ width: 28, height: 28, objectFit: 'contain' }} />
        </div>

        {/* Divider */}
        <div className="relative z-30" style={{ width: 28, height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 6 }} />

        {/* Nav icons */}
        <div className="flex flex-col items-center gap-1 relative z-30">
          {PAGES.map(({ id, Icon, label }) => {
            const active = activePage === id
            return (
              <button
                key={id}
                title={label}
                onClick={() => onPageClick(id)}
                className="flex items-center justify-center rounded-2xl cursor-pointer transition-all duration-150"
                style={{
                  width: 40, height: 40,
                  color: active ? 'var(--color-accent)' : 'rgba(255,255,255,0.5)',
                  backgroundColor: active ? 'var(--color-accent-glow)' : 'transparent',
                }}
                onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.85)' } }}
                onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)' } }}
              >
                <Icon size={17} weight={active ? 'fill' : 'regular'} />
              </button>
            )
          })}
        </div>

        {/* Settings — pinned at bottom */}
        <div className="relative z-30 mt-auto pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 8, paddingTop: 6 }}>
          {(() => {
            const active = activePage === 'settings'
            return (
              <button
                title="Settings"
                onClick={() => onPageClick('settings')}
                className="flex items-center justify-center rounded-2xl cursor-pointer transition-all duration-150"
                style={{
                  width: 40, height: 40,
                  color: active ? 'var(--color-accent)' : 'rgba(255,255,255,0.35)',
                  backgroundColor: active ? 'var(--color-accent-glow)' : 'transparent',
                }}
                onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)' } }}
                onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)' } }}
              >
                <GearSix size={17} weight={active ? 'fill' : 'regular'} />
              </button>
            )
          })()}
        </div>
      </LiquidGlassCard>
    </div>
  )
}
