import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

function ChatRoom({ advert, onNotification }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  
  // WebSocket ref for real-time messaging
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Error message translation
  const translateMessage = (message) => {
    const translations = {
      "Failed to fetch": "Bağlantı hatası oluştu. İnternet bağlantınızı kontrol edin.",
      "Network Error": "Ağ hatası oluştu. Lütfen tekrar deneyin.",
      "Unauthorized": "Bu işlem için yetkiniz bulunmamaktadır.",
      "Not Found": "Mesajlar bulunamadı.",
    };
    return translations[message] || message || "Bilinmeyen bir hata oluştu.";
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch chat messages
  const fetchMessages = async () => {
    if (!advert?._id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/advert/${advert._id}/messages`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // No messages yet, this is normal
          setMessages([]);
          return;
        }
        throw new Error("Failed to fetch messages");
      }

      const data = await response.json();
      setMessages(data.messages || []);
      
      // Scroll to bottom after loading messages
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error("Error fetching messages:", error);
      setError(translateMessage(error.message));
    } finally {
      setLoading(false);
    }
  };

  // Send message
  const handleSendMessage = async (messageText) => {
    if (!messageText.trim() || !advert?._id) return;

    try {
      const response = await fetch(`/api/v1/advert/${advert._id}/messages`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageText.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || "Mesaj gönderilirken hata oluştu");
      }

      const data = await response.json();
      
      // Add new message to list
      setMessages(prev => [...prev, data.message]);
      
      // Scroll to bottom
      setTimeout(scrollToBottom, 100);
      
      onNotification("Mesaj gönderildi!", "success");
    } catch (error) {
      console.error("Error sending message:", error);
      onNotification(translateMessage(error.message), "error");
    }
  };

  // Handle typing indicators
  const handleTypingStart = () => {
    setIsTyping(true);
    // TODO: Send typing indicator via WebSocket
  };

  const handleTypingStop = () => {
    setIsTyping(false);
    // TODO: Send stop typing indicator via WebSocket
  };

  // Initialize WebSocket connection (for future real-time messaging)
  const initializeWebSocket = () => {
    if (!advert?._id) return;

    try {
      // TODO: Replace with your WebSocket server URL
      const wsUrl = `ws://localhost:5000/ws/advert/${advert._id}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("WebSocket connected for advert chat");
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case "new_message":
            setMessages(prev => [...prev, data.message]);
            setTimeout(scrollToBottom, 100);
            break;
          case "typing_start":
            if (data.userId !== user?.id) {
              setTypingUsers(prev => [...prev.filter(id => id !== data.userId), data.userId]);
            }
            break;
          case "typing_stop":
            setTypingUsers(prev => prev.filter(id => id !== data.userId));
            break;
          default:
            console.log("Unknown WebSocket message type:", data.type);
        }
      };

      wsRef.current.onclose = () => {
        console.log("WebSocket disconnected");
        // Attempt to reconnect after 3 seconds
        setTimeout(initializeWebSocket, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    } catch (error) {
      console.error("Failed to initialize WebSocket:", error);
    }
  };

  // Load messages when component mounts
  useEffect(() => {
    fetchMessages();
  }, [advert?._id]);

  // Initialize WebSocket when component mounts
  useEffect(() => {
    // Uncomment when WebSocket is ready
    // initializeWebSocket();

    // Cleanup WebSocket on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [advert?._id]);

  if (!advert) {
    return (
      <div className="bg-white rounded-lg shadow-md h-full flex items-center justify-center">
        <p className="text-gray-500">İlan bilgisi yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 h-full flex flex-col overflow-hidden hover:shadow-xl transition-all duration-300">
      {/* Chat Header */}
      <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center">
              <span className="text-2xl mr-2">💬</span>
              <span>{advert.name}</span>
              <span className="ml-2 text-sm font-normal text-green-600">Chat Odası</span>
            </h2>
            <p className="text-sm text-gray-600 ml-8 flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
              {advert.participants?.length || 0} katılımcı online
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchMessages}
              className="p-2 bg-white/70 text-green-600 hover:text-green-700 hover:bg-white transition-all duration-200 rounded-lg shadow-sm hover:shadow-md"
              title="Mesajları Yenile"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
              <p className="text-gray-500 text-sm">Mesajlar yükleniyor...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-red-600 mb-2">
                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-red-600 text-sm mb-2">{error}</p>
              <button
                onClick={fetchMessages}
                className="text-xs text-green-600 hover:text-green-700 underline"
              >
                Tekrar Dene
              </button>
            </div>
          </div>
        ) : (
          <>
            <MessageList 
              messages={messages} 
              currentUser={user}
              typingUsers={typingUsers}
            />
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200">
        <MessageInput
          onSendMessage={handleSendMessage}
          onTypingStart={handleTypingStart}
          onTypingStop={handleTypingStop}
          disabled={loading || error}
        />
      </div>
    </div>
  );
}

export default ChatRoom;
