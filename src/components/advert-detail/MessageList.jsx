import { useState, useRef, useEffect } from "react";

function MessageList({ messages, currentUser, typingUsers }) {
  const messagesContainerRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Format message time
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  // Check if message is from current user
  const isOwnMessage = (message) => {
    return message.user?._id === currentUser?.id || message.user?.id === currentUser?.id;
  };

  // Group messages by date
  const groupMessagesByDate = (messages) => {
    const groups = [];
    let currentGroup = null;

    messages.forEach((message) => {
      const messageDate = new Date(message.createdAt).toDateString();
      
      if (!currentGroup || currentGroup.date !== messageDate) {
        currentGroup = {
          date: messageDate,
          messages: [message],
        };
        groups.push(currentGroup);
      } else {
        currentGroup.messages.push(message);
      }
    });

    return groups;
  };

  // Format date for group headers
  const formatGroupDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (dateString === today) {
      return "Bugün";
    } else if (dateString === yesterday) {
      return "Dün";
    } else {
      return date.toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
  };

  // Handle scroll
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setAutoScroll(isNearBottom);
  };

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  if (!messages || messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-500 mb-2">Henüz Mesaj Yok</h3>
          <p className="text-sm text-gray-400">
            İlk mesajı göndererek sohbeti başlatın!
          </p>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div 
      ref={messagesContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 space-y-4"
    >
      {messageGroups.map((group, groupIndex) => (
        <div key={groupIndex}>
          {/* Date Separator */}
          <div className="flex justify-center mb-4">
            <span className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full">
              {formatGroupDate(group.date)}
            </span>
          </div>

          {/* Messages in this date group */}
          <div className="space-y-3">
            {group.messages.map((message, messageIndex) => {
              const isOwn = isOwnMessage(message);
              const showAvatar = !isOwn && (
                messageIndex === 0 || 
                !isOwnMessage(group.messages[messageIndex - 1])
              );

              return (
                <div 
                  key={message._id || messageIndex}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end space-x-2`}
                >
                  {/* Avatar for other users */}
                  {!isOwn && (
                    <div className="flex-shrink-0">
                      {showAvatar ? (
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600 font-semibold text-sm">
                            {message.user?.name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                      ) : (
                        <div className="w-8 h-8"></div>
                      )}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-1' : 'order-2'}`}>
                    {/* Sender name for other users */}
                    {!isOwn && showAvatar && (
                      <div className="text-xs text-gray-500 mb-1 ml-2">
                        {message.user?.name || 'Bilinmeyen Kullanıcı'}
                      </div>
                    )}

                    {/* Message content */}
                    <div
                      className={`px-4 py-2 rounded-2xl ${
                        isOwn
                          ? 'bg-[rgb(0,128,0)] text-white rounded-br-sm'
                          : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                      }`}
                    >
                      <p className="text-sm break-words">{message.message}</p>
                    </div>

                    {/* Message time */}
                    <div className={`text-xs text-gray-400 mt-1 ${isOwn ? 'text-right mr-2' : 'text-left ml-2'}`}>
                      {formatTime(message.createdAt)}
                    </div>
                  </div>

                  {/* Spacer for own messages */}
                  {isOwn && <div className="flex-shrink-0 w-8"></div>}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Typing Indicators */}
      {typingUsers && typingUsers.length > 0 && (
        <div className="flex justify-start items-end space-x-2">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
          <div className="bg-gray-100 px-4 py-2 rounded-2xl rounded-bl-sm">
            <p className="text-xs text-gray-500">
              {typingUsers.length === 1 ? 'Biri yazıyor...' : 'Birkaç kişi yazıyor...'}
            </p>
          </div>
        </div>
      )}

      {/* Scroll to bottom button */}
      {!autoScroll && (
        <div className="fixed bottom-20 right-8">
          <button
            onClick={() => {
              messagesContainerRef.current?.scrollTo({
                top: messagesContainerRef.current.scrollHeight,
                behavior: 'smooth'
              });
              setAutoScroll(true);
            }}
            className="bg-[rgb(0,128,0)] text-white p-2 rounded-full shadow-lg hover:bg-[rgb(0,100,0)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export default MessageList;
