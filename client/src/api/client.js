const BASE = import.meta.env.VITE_API_URL || '/api'

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

let onUnauthorized = () => {}
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn
}

export async function request(method, path, body) {
  let res
  try {
    res = await fetch(BASE + path, {
      method,
      credentials: 'include', // the session lives in an HTTP-only cookie
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Check your connection and try again.')
  }

  let data = null
  try {
    data = await res.json()
  } catch {
    /* empty or non-JSON body */
  }

  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) onUnauthorized() // session expired mid-use
    throw new ApiError(res.status, data?.error?.code || 'ERROR', data?.error?.message || 'Something went wrong. Please try again.')
  }
  return data
}
