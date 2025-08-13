import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Header from "../components/shared/Header";
import Footer from "../components/shared/Footer";
import AdvertCard from "../components/advert-detail/AdvertCard";
import ChatRoom from "../components/advert-detail/ChatRoom";
import Notification from "../components/shared/Notification";

function AdvertDetailPage() {
  const { advertId } = useParams();
  const { isAuthenticated } = useAuth();
  const [advert, setAdvert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Notification state
  const [notification, setNotification] = useState({
    isVisible: false,
    message: "",
    type: "success",
  });

  // Notification helper functions
  const showNotification = (message, type = "success") => {
    setNotification({
      isVisible: true,
      message,
      type,
    });
  };

  const hideNotification = () => {
    setNotification((prev) => ({ ...prev, isVisible: false }));
  };

  // Error message translation function
  const translateMessage = (message) => {
    const translations = {
      "Failed to fetch": "Bağlantı hatası oluştu. İnternet bağlantınızı kontrol edin.",
      "Network Error": "Ağ hatası oluştu. Lütfen tekrar deneyin.",
      "Unauthorized": "Bu işlem için yetkiniz bulunmamaktadır.",
      "Not Found": "İlan bulunamadı.",
      "Internal Server Error": "Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.",
    };
    return translations[message] || message || "Bilinmeyen bir hata oluştu.";
  };

  // Fetch advert details
  const fetchAdvert = async () => {
    if (!advertId) {
      setError("İlan ID'si bulunamadı.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/advert/${advertId}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Not Found");
        } else if (response.status === 401) {
          throw new Error("Unauthorized");
        } else {
          throw new Error("Internal Server Error");
        }
      }

      const data = await response.json();
      setAdvert(data.advert || data);
    } catch (error) {
      console.error("Error fetching advert:", error);
      setError(translateMessage(error.message));
    } finally {
      setLoading(false);
    }
  };

  // Load advert when component mounts
  useEffect(() => {
    fetchAdvert();
  }, [advertId]);

  // Check authentication
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Giriş Yapmanız Gerekiyor
            </h2>
            <p className="text-gray-600 mb-6">
              İlan detaylarını görüntülemek için giriş yapmanız gerekiyor.
            </p>
            <button
              onClick={() => window.location.href = "/login"}
              className="bg-[rgb(0,128,0)] hover:bg-[rgb(0,100,0)] text-white font-semibold py-2 px-6 rounded-md transition-colors cursor-pointer"
              tabIndex="0"
            >
              Giriş Yap
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">İlan yükleniyor...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Hata Oluştu</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={fetchAdvert}
              className="bg-[rgb(0,128,0)] hover:bg-[rgb(0,100,0)] text-white font-semibold py-2 px-6 rounded-md transition-colors cursor-pointer"
              tabIndex="0"
            >
              Tekrar Dene
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-gray-50 relative"
      style={{
        background: `
          linear-gradient(135deg, rgba(0, 128, 0, 0.05) 0%, rgba(34, 197, 94, 0.05) 50%, rgba(16, 185, 129, 0.05) 100%),
          radial-gradient(circle at 20% 80%, rgba(0, 128, 0, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(34, 197, 94, 0.08) 0%, transparent 50%),
          linear-gradient(to bottom, #f9fafb 0%, #f3f4f6 100%)
        `
      }}
    >
      <Header />
      
      

      {/* Main Content */}
      <div className="relative z-10 px-2 sm:px-4 lg:px-6 py-3 max-w-full">
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-3 sm:gap-4 lg:gap-6 min-h-[calc(100vh-8rem)]">
          {/* Left Side - Advert Card */}
          <div className="lg:col-span-3 order-2 lg:order-1">
            <div className="sticky top-3">
              <AdvertCard 
                advert={advert} 
                onNotification={showNotification}
              />
            </div>
          </div>

          {/* Right Side - Chat Room */}
          <div className="lg:col-span-4 order-1 lg:order-2">
            <ChatRoom 
              advert={advert} 
              onNotification={showNotification}
            />
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification.isVisible && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={hideNotification}
        />
      )}

      <Footer />
    </div>
  );
}

export default AdvertDetailPage;
