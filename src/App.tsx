import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import HomePage from './pages/HomePage'
import CreateListingPage from './pages/CreateListingPage'
import ListingsPage from './pages/ListingsPage'
import EditListingPage from './pages/EditListingPage'
import PlatformsPage from './pages/PlatformsPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login"  element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/" element={
            <ProtectedRoute><HomePage /></ProtectedRoute>
          } />
          <Route path="/listings" element={
            <ProtectedRoute><ListingsPage /></ProtectedRoute>
          } />
          <Route path="/listings/create" element={
            <ProtectedRoute><CreateListingPage /></ProtectedRoute>
          } />
          <Route path="/listings/:id/edit" element={
            <ProtectedRoute><EditListingPage /></ProtectedRoute>
          } />
          <Route path="/platforms" element={
            <ProtectedRoute><PlatformsPage /></ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
