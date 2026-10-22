import crypto from 'node:crypto'

export function slugify(name) {
  const base = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '')
  return base || 'workspace'
}

export const randomSuffix = () => crypto.randomBytes(3).toString('hex')

export const SLUG_PATTERN = /^[a-z0-9-]{1,60}$/
