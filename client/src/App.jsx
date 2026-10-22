import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { GuestRoute, ProtectedRoute, RootRedirect } from './components/RouteGuards.jsx'
import AppLayout from './pages/AppLayout.jsx'
import Inbox from './pages/Inbox.jsx'
import Issues from './pages/Issues.jsx'
import Login from './pages/Login.jsx'
import PublicFeedback from './pages/PublicFeedback.jsx'
import Products from './pages/Products.jsx'
import Register from './pages/Register.jsx'

function NotFound() {
  return (
    <main className="narrow">
      <h1>Page not found</h1>
      <p style={{ marginTop: 12 }}>
        <Link to="/">Go to the start page</Link>.
      </p>
    </main>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
      <Route path="/f/:slug" element={<PublicFeedback />} />
      <Route path="/app" element={<ProtectedRoute><Products /></ProtectedRoute>} />
      <Route path="/app/products/:productId" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="inbox" replace />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="issues" element={<Issues />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
