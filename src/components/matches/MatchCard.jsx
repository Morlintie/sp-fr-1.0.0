import { useState } from "react";
import { useNavigate } from "react-router-dom";

function MatchCard({ match, onJoinMatch }) {
  const [showUserInfo, setShowUserInfo] = useState(false);
  const navigate = useNavigate();

  // Handle join match - join and redirect to chat room
  const handleJoinMatch = async () => {
    try {
      // First join the match via API
      const response = await fetch(`/api/v1/advert/${match.id}/join`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error joining match:", errorData.msg);
        // Still redirect even if join fails (maybe already joined)
      }

      // Redirect to advert chat room
      navigate(`/advert/${match.id}`);
    } catch (error) {
      console.error("Error joining match:", error);
      // Still redirect to chat room even if API fails
      navigate(`/advert/${match.id}`);
    }
  };

  // Team ads background with team photo
  if (match.type === "team-ads") {
    return (
      <div 
        className="rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9)), url(https://res.cloudinary.com/dyepiphy8/image/upload/v1755089552/ChatGPT_Image_Aug_13_2025_03_32_46_PM_o6yrq8.png)`
        }}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">{match.title}</h3>
            <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
              ₺{match.pricePerPerson}/kişi
            </span>
          </div>
          <span className={`text-sm px-2 py-1 rounded ${
            match.status === "full" 
              ? "text-red-700 bg-red-100" 
              : match.status === "available" 
              ? "text-green-700 bg-green-100" 
              : "text-gray-500 bg-gray-100"
          }`}>
            {match.status === "full" ? "Dolu" : "Açık"}
          </span>
        </div>

        {/* Creator Info - always show */}
        <div className="mb-3">
          <p className="text-xs text-gray-600">
            <span className="text-gray-500">İlan sahibi: </span>
            {match.createdBy && match.createdBy.name ? (
              <button 
                className="text-green-600 hover:text-green-700 hover:underline font-medium focus:outline-none"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUserInfo(true);
                }}
              >
                {match.createdBy.name}
              </button>
            ) : (
              <span className="text-gray-500 italic">Bilinmeyen kullanıcı</span>
            )}
          </p>
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-gray-600">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {match.date}
          </div>
          <div className="flex items-center text-gray-600">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {match.location}
          </div>
          <div className="flex items-center text-gray-600">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            {match.players}
          </div>
        </div>

        {/* Description */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 italic">
            {match.description}
          </p>
        </div>

        <div className="mb-4">
          <div className="text-center bg-white bg-opacity-80 rounded-lg p-3">
            <div className="text-lg font-semibold text-green-600 mb-1">
{(match.playersNeeded + match.goalKeepersNeeded) || match.players.split('/')[1].split(' ')[0]} kişilik takım aranıyor
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">
            {match.difficulty}
          </span>
          {match.status === "full" ? (
            <button 
              className="bg-gray-400 text-white font-semibold py-2 px-6 rounded-md cursor-not-allowed"
              disabled
            >
              Dolu
            </button>
          ) : (
            <button 
              onClick={handleJoinMatch}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-md transition-colors cursor-pointer"
              tabIndex="0"
            >
              Maç Yap
            </button>
          )}
        </div>
      </div>
    );
  }

  // Player ads with different background
  return (
    <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-green-100"
    style={{
      backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9)), url(https://res.cloudinary.com/dyepiphy8/image/upload/v1755090617/20250813_1607_Anonim_Futbolcunun_Pozu_simple_compose_01k2hrk1akf9b89nqc967haa0x_pan6au.png)`
    }}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">{match.title}</h3>
          <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
            ₺{match.pricePerPerson}/kişi
          </span>
        </div>
        <span className={`text-sm px-2 py-1 rounded ${
          match.status === "full" 
            ? "text-red-700 bg-red-100" 
            : match.status === "available" 
            ? "text-green-700 bg-green-100" 
            : "text-gray-500 bg-gray-100"
        }`}>
          {match.status === "full" ? "Dolu" : "Açık"}
        </span>
      </div>

      {/* Creator Info - always show */}
      <div className="mb-3">
        <p className="text-xs text-gray-600">
          <span className="text-gray-500">İlan sahibi: </span>
          {match.createdBy && match.createdBy.name ? (
            <button 
              className="text-green-600 hover:text-green-700 hover:underline font-medium focus:outline-none"
              onClick={(e) => {
                e.stopPropagation();
                setShowUserInfo(true);
              }}
            >
              {match.createdBy.name}
            </button>
          ) : (
            <span className="text-gray-500 italic">Bilinmeyen kullanıcı</span>
          )}
        </p>
      </div>
      
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-gray-600">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {match.date}
        </div>
        <div className="flex items-center text-gray-600">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {match.location}
        </div>
        <div className="flex items-center text-gray-600">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
          {match.players}
        </div>
      </div>

      {/* Description */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 italic">
          {match.description}
        </p>
      </div>

      <div className="mb-4">
        <div>
          <div className="text-sm text-gray-600 mb-1">{match.completion}%</div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full" 
              style={{ width: `${match.completion}%` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">
          {match.difficulty}
        </span>
        {match.status === "full" ? (
          <button 
            className="bg-gray-400 text-white font-semibold py-2 px-6 rounded-md cursor-not-allowed"
            disabled
          >
            Dolu
          </button>
        ) : (
          <button 
            onClick={handleJoinMatch}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-md transition-colors cursor-pointer"
            tabIndex="0"
          >
            Maça Katıl
          </button>
        )}
      </div>
      
      {/* User Info Popup */}
      {showUserInfo && match.createdBy && match.createdBy.name && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowUserInfo(false)}>
        <div className="bg-white rounded-lg p-6 m-4 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Kullanıcı Bilgileri</h3>
            <button
              onClick={() => setShowUserInfo(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-3">
            {match.createdBy.profilePicture && (
              <div className="text-center">
                <img 
                  src={match.createdBy.profilePicture} 
                  alt={match.createdBy.name}
                  className="w-16 h-16 rounded-full mx-auto object-cover"
                />
              </div>
            )}
            
            <div>
              <span className="text-sm font-medium text-gray-700">İsim:</span>
              <p className="text-gray-900">{match.createdBy.name}</p>
            </div>
            
            {match.createdBy.school && (
              <div>
                <span className="text-sm font-medium text-gray-700">Okul:</span>
                <p className="text-gray-900">{match.createdBy.school}</p>
              </div>
            )}
            
            {match.createdBy.age && (
              <div>
                <span className="text-sm font-medium text-gray-700">Yaş:</span>
                <p className="text-gray-900">{match.createdBy.age}</p>
              </div>
            )}
            
            {match.createdBy.description && (
              <div>
                <span className="text-sm font-medium text-gray-700">Hakkında:</span>
                <p className="text-gray-900">{match.createdBy.description}</p>
              </div>
            )}
            
            {match.createdBy.goalKeeper !== undefined && (
              <div>
                <span className="text-sm font-medium text-gray-700">Pozisyon:</span>
                <p className="text-gray-900">{match.createdBy.goalKeeper ? 'Kaleci' : 'Saha Oyuncusu'}</p>
              </div>
            )}
          </div>
          
          <div className="mt-6">
            <button
              onClick={() => setShowUserInfo(false)}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

export default MatchCard;