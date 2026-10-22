export const STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
]

export const statusLabel = (value) => STATUSES.find((s) => s.value === value)?.label ?? value
