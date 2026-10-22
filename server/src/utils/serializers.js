export const serializeWorkspace = (w) => ({
  id: String(w._id),
  name: w.name,
  description: w.description || '',
  slug: w.slug,
})

export const serializeUser = (u) => ({
  user: { id: String(u._id), name: u.name || '', email: u.email },
})

export const serializeSubmission = (s) => ({
  id: String(s._id),
  title: s.title,
  description: s.description,
  createdAt: s.createdAt,
})

export const serializeIssue = (i) => ({
  id: String(i._id),
  title: i.title,
  description: i.description,
  reportCount: i.reportCount,
  status: i.status,
  createdAt: i.createdAt,
  updatedAt: i.updatedAt,
})
