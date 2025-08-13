import { Routes, Route, useLocation } from "react-router-dom";
import { ProfileSidebarProvider } from "./context/ProfileSidebarContext";
import HomePage from "./pages/HomePage";
import ReservationPage from "./pages/nav-links/ReservationPage";
import PitchDetailPage from "./pages/PitchDetailPage";
import MatchesPage from "./pages/nav-links/MatchesPage";
import TournamentsPage from "./pages/nav-links/TournamentsPage";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import ForgotPassword from "./pages/auth/ForgotPassword";
import GoogleFailure from "./pages/auth/GoogleFailure";
import ProfilePage from "./pages/ProfilePage";
import AdvertDetailPage from "./pages/AdvertDetailPage";
import AnimatedProfileSidebar from "./components/profile/AnimatedProfileSidebar";

function AppContent() {
  const location = useLocation();
  const isAuthPage = location.pathname.startsWith('/auth');

  return (
    <div className={`min-h-screen bg-gray-50 ${isAuthPage ? '' : 'pt-16'}`}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/reservation" element={<ReservationPage />} />
          <Route path="/pitch-detail/:pitchId" element={<PitchDetailPage />} />
          <Route path="/advert/:advertId" element={<AdvertDetailPage />} />
          <Route path="/tournaments" element={<TournamentsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/auth/google-failure" element={<GoogleFailure />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/signup" element={<Signup />} />
          <Route path="/auth/forgot-password" element={<ForgotPassword />} />
          
          <Route
            path="*"
            element={
              <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-red-600 mb-4">
                    404 - Page Not Found
                  </h1>
                  <p className="text-lg text-gray-600">
                    The page you're looking for doesn't exist
                  </p>
                </div>
              </div>
            }
          />
        </Routes>
      <AnimatedProfileSidebar />
    </div>
  );
}

function App() {
  return (
    <ProfileSidebarProvider>
      <AppContent />
    </ProfileSidebarProvider>
  );
}

export default App;
