interface Props {
  date: Date
}

function formatLabel(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((today.getTime() - msgDay.getTime()) / 86400000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'long' })
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function DateSeparator({ date }: Props) {
  return (
    <div className="flex justify-center">
      <span
        style={{
          color: 'var(--color-text-muted)',
          fontSize: 12,
          fontStyle: 'italic',
          letterSpacing: '0.01em',
        }}
      >
        {formatLabel(date)}
      </span>
    </div>
  )
}
