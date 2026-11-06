'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface LabeledSelectProps {
  name: string
  defaultValue: string
  labels: Record<string, string>
  ariaLabel: string
  className?: string
  size?: 'default' | 'sm'
}

export function LabeledSelect({ name, defaultValue, labels, ariaLabel, className, size }: LabeledSelectProps) {
  return (
    <Select name={name} defaultValue={defaultValue}>
      <SelectTrigger aria-label={ariaLabel} size={size} className={className}>
        <SelectValue>{(value: string) => labels[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(labels).map(([value, label]) => (
          <SelectItem key={value} value={value}>{label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
