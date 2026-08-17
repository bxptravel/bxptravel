import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import ProtectedRoute from './ProtectedRoute'
import PublicHome from './pages/PublicHome'
import PropertyDetail from './pages/PropertyDetail'
import EnquiryForm from './pages/EnquiryForm'
import AdminLogin from './pages/AdminLogin'
import AdminLayout from './pages/AdminLayout'
import AdminProperties from './pages/AdminProperties'
import PropertyForm from './pages/PropertyForm'
import AdminEnquiries from './pages/AdminEnquiries'
import AdminBookings from './pages/AdminBookings'
import RenterLogin from './renter/RenterLogin'
import RenterLayout from './renter/RenterLayout'
import RenterProperties from './renter/RenterProperties'
import RenterPropertyForm from './renter/RenterPropertyForm'
import RenterBookings from './renter/RenterBookings'
import CustomerLogin from './customer/CustomerLogin'
import CustomerLayout from './customer/CustomerLayout'
import CustomerBookings from './customer/CustomerBookings'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicHome />} />
          <Route path="/property/:id" element={<PropertyDetail />} />
          <Route path="/enquire" element={<EnquiryForm />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/renter/login" element={<RenterLogin />} />
          <Route path="/account/login" element={<CustomerLogin />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin" loginPath="/admin/login">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="properties" element={<AdminProperties />} />
            <Route path="properties/new" element={<PropertyForm />} />
            <Route path="properties/:id" element={<PropertyForm />} />
            <Route path="enquiries" element={<AdminEnquiries />} />
            <Route path="bookings" element={<AdminBookings />} />
          </Route>

          <Route
            path="/renter"
            element={
              <ProtectedRoute role="renter" loginPath="/renter/login">
                <RenterLayout />
              </ProtectedRoute>
            }
          >
            <Route path="properties" element={<RenterProperties />} />
            <Route path="properties/new" element={<RenterPropertyForm />} />
            <Route path="properties/:id" element={<RenterPropertyForm />} />
            <Route path="bookings" element={<RenterBookings />} />
          </Route>

          <Route
            path="/account"
            element={
              <ProtectedRoute role="customer" loginPath="/account/login">
                <CustomerLayout />
              </ProtectedRoute>
            }
          >
            <Route path="bookings" element={<CustomerBookings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
