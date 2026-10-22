export const preview = (text, max = 160) => (text.length > max ? `${text.slice(0, max).trimEnd()}…` : text)

export const formatDateTime = (value) =>
  new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`
