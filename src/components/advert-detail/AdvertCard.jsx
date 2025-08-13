import { useState } from "react";

function AdvertCard({ advert, onNotification }) {
  const [showParticipants, setShowParticipants] = useState(false);

  if (!advert) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 h-full">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("tr-TR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case "open":
        return { color: "bg-green-100 text-green-800", text: "Açık" };
      case "full":
        return { color: "bg-red-100 text-red-800", text: "Dolu" };
      case "cancelled":
        return { color: "bg-gray-100 text-gray-800", text: "İptal Edildi" };
      case "completed":
        return { color: "bg-blue-100 text-blue-800", text: "Tamamlandı" };
      default:
        return { color: "bg-gray-100 text-gray-800", text: "Bilinmiyor" };
    }
  };

  const statusBadge = getStatusBadge(advert.status);

  // Join advert function
  const handleJoinAdvert = async () => {
    try {
      const response = await fetch(`/api/v1/advert/${advert._id}/join`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || "İlana katılma sırasında hata oluştu");
      }

      onNotification("İlana başarıyla katıldınız!", "success");
      // Refresh page to update participant list
      window.location.reload();
    } catch (error) {
      console.error("Error joining advert:", error);
      onNotification(error.message, "error");
    }
  };

  // Leave advert function
  const handleLeaveAdvert = async () => {
    try {
      const response = await fetch(`/api/v1/advert/${advert._id}/leave`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || "İlandan ayrılma sırasında hata oluştu");
      }

      onNotification("İlandan başarıyla ayrıldınız!", "success");
      // Refresh page to update participant list
      window.location.reload();
    } catch (error) {
      console.error("Error leaving advert:", error);
      onNotification(error.message, "error");
    }
  };

  // Check if current user is participant
  const isParticipant = advert.participants?.some(p => p.user?._id === advert.currentUserId);
  const currentParticipants = advert.participants?.length || 0;
  const totalNeeded = (advert.playersNeeded || 0) + (advert.goalKeepersNeeded || 0);

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 h-full flex flex-col overflow-hidden hover:shadow-xl transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="flex justify-between items-start mb-3">
          <h1 className="text-lg font-bold text-gray-900 leading-tight">{advert.name}</h1>
          <span className={`px-2 py-1 rounded-full text-xs font-semibold shadow-sm ${statusBadge.color}`}>
            {statusBadge.text}
          </span>
        </div>

        {/* Creator Info */}
        {advert.createdBy && (
          <div className="flex items-center mb-2">
            <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center mr-2">
              <span className="text-green-600 font-semibold text-xs">
                {advert.createdBy.name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{advert.createdBy.name}</p>
              <p className="text-xs text-gray-500">İlan Sahibi</p>
            </div>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-4 flex-1 overflow-y-auto bg-gradient-to-b from-white to-gray-50/50">
        <div className="space-y-3">
          {/* Date & Time */}
          <div className="flex items-center p-2 bg-white/70 rounded-lg border border-green-100">
            <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center mr-2">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">{formatDate(advert.startsAt)}</span>
          </div>

          {/* Location */}
          <div className="flex items-center p-2 bg-white/70 rounded-lg border border-blue-100">
            <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center mr-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">
              {advert.customPitch?.name || advert.pitch?.name || "Saha Belirtilmemiş"}
            </span>
          </div>

          {/* Price */}
          <div className="flex items-center p-2 bg-white/70 rounded-lg border border-yellow-100">
            <div className="w-7 h-7 bg-yellow-100 rounded-lg flex items-center justify-center mr-2">
              <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700">
              ₺{advert.pricePerPerson || 0}/kişi
            </span>
          </div>

          {/* Participants */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <span className="text-sm text-gray-700">
                {currentParticipants}/{totalNeeded} katılımcı
              </span>
            </div>
            <button
              onClick={() => setShowParticipants(!showParticipants)}
              className="text-xs text-green-600 hover:text-green-700 underline"
            >
              {showParticipants ? "Gizle" : "Katılımcıları Gör"}
            </button>
          </div>

          {/* Participants List */}
          {showParticipants && (
            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="text-xs font-medium text-gray-700 mb-2">Katılımcılar:</h4>
              {advert.participants && advert.participants.length > 0 ? (
                <div className="space-y-1">
                  {advert.participants.map((participant, index) => (
                    <div key={index} className="flex items-center">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-2">
                        <span className="text-green-600 text-xs font-medium">
                          {participant.user?.name?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs text-gray-700">{participant.user?.name || "Bilinmeyen"}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">Henüz katılımcı yok</p>
              )}
            </div>
          )}

          {/* Description */}
          {advert.notes && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Açıklama:</h4>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                {advert.notes}
              </p>
            </div>
          )}

          {/* Level */}
          {advert.level && (
            <div className="flex items-center">
              <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-sm text-gray-700">Seviye: {advert.level}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Button */}
      <div className="p-4 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        {advert.status === "open" && !isParticipant && (
          <button
            onClick={handleJoinAdvert}
            className="w-full bg-gradient-to-r from-[rgb(0,128,0)] to-[rgb(34,197,94)] hover:from-[rgb(0,100,0)] hover:to-[rgb(21,128,61)] text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-105"
            tabIndex="0"
          >
            🚀 İlana Katıl
          </button>
        )}
        
        {advert.status === "open" && isParticipant && (
          <button
            onClick={handleLeaveAdvert}
            className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-105"
            tabIndex="0"
          >
            ❌ İlandan Ayrıl
          </button>
        )}

        {advert.status === "full" && (
          <button
            disabled
            className="w-full bg-gradient-to-r from-gray-400 to-gray-500 text-white font-bold py-3 px-4 rounded-xl cursor-not-allowed opacity-75 shadow-md"
          >
            🔒 İlan Dolu
          </button>
        )}
      </div>
    </div>
  );
}

export default AdvertCard;
