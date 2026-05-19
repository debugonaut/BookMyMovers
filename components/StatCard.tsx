import React from 'react'

export default function StatCard({
  value,
  label,
  icon: Icon,
  valueStyle = {},
}: {
  value: React.ReactNode
  label: string
  icon?: React.ComponentType<{ className?: string; size?: number }>
  valueStyle?: React.CSSProperties
}) {
  return (
    <div className="stat-card">
      {Icon && <Icon className="text-teal mb-1" size={20} />}
      <div className="stat-card-value" style={valueStyle}>
        {value}
      </div>
      <div className="stat-card-label">{label}</div>
    </div>
  )
}
