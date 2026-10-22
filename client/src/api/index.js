import { request } from './client.js'

export const authApi = {
  register: (body) => request('POST', '/auth/register', body),
  login: (body) => request('POST', '/auth/login', body),
  logout: () => request('POST', '/auth/logout', {}),
  me: () => request('GET', '/auth/me'),
}

export const productsApi = {
  list: () => request('GET', '/products'),
  create: (body) => request('POST', '/products', body),
  get: (productId) => request('GET', `/products/${encodeURIComponent(productId)}`),
  remove: (productId) => request('DELETE', `/products/${encodeURIComponent(productId)}`),
}

export const publicApi = {
  get: (slug) => request('GET', `/public/${encodeURIComponent(slug)}`),
  submit: (slug, body) => request('POST', `/public/${encodeURIComponent(slug)}/submissions`, body),
}

export const submissionsApi = {
  list: (productId) => request('GET', `/products/${encodeURIComponent(productId)}/submissions`),
  remove: (productId, id) => request('DELETE', `/products/${encodeURIComponent(productId)}/submissions/${id}`),
  clear: (productId) => request('DELETE', `/products/${encodeURIComponent(productId)}/submissions`),
}

export const issuesApi = {
  list: (productId) => request('GET', `/products/${encodeURIComponent(productId)}/issues`),
  setStatus: (productId, id, status) => request('PATCH', `/products/${encodeURIComponent(productId)}/issues/${id}/status`, { status }),
  remove: (productId, id) => request('DELETE', `/products/${encodeURIComponent(productId)}/issues/${id}`),
  removeByStatus: (productId, status) => request('DELETE', `/products/${encodeURIComponent(productId)}/issues?status=${encodeURIComponent(status)}`),
}

export const compileApi = {
  run: (productId) => request('POST', `/products/${encodeURIComponent(productId)}/compile`, {}),
}
