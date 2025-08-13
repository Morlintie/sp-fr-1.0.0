import { useState, useRef, useEffect } from "react";

function MessageInput({ onSendMessage, onTypingStart, onTypingStop, disabled }) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  // Handle message change
  const handleMessageChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    // Auto-resize textarea
    adjustTextareaHeight();

    // Handle typing indicators
    if (value.trim() && !isTypingRef.current) {
      isTypingRef.current = true;
      onTypingStart?.();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        onTypingStop?.();
      }
    }, 1000);
  };

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
    }
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim() || isSending || disabled) return;

    setIsSending(true);
    
    try {
      await onSendMessage(message);
      setMessage("");
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      // Stop typing indicator
      if (isTypingRef.current) {
        isTypingRef.current = false;
        onTypingStop?.();
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  // Handle key down (Enter to send, Shift+Enter for new line)
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Focus on textarea when component mounts
  useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  return (
    <div className="p-3 bg-gradient-to-r from-gray-50 via-white to-gray-50 border-t border-gray-100">
      <form onSubmit={handleSubmit} className="flex items-end space-x-3">
        {/* Message Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "Mesaj gönderemiyorsunuz..." : "Mesajınızı yazın..."}
            disabled={disabled || isSending}
            className={`w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none transition-all duration-200 shadow-sm focus:shadow-md ${
              disabled ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white/90 backdrop-blur-sm"
            }`}
            style={{ minHeight: "48px", maxHeight: "120px" }}
            rows={1}
          />

          {/* Character count */}
          <div className="absolute bottom-1 right-1 text-xs text-gray-400">
            {message.length}/1000
          </div>
        </div>

        {/* Emoji Button (Optional for future) */}
        <button
          type="button"
          disabled={disabled}
          className={`p-3 text-gray-400 hover:text-gray-600 transition-colors ${
            disabled ? "cursor-not-allowed" : "cursor-pointer"
          }`}
          title="Emoji"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!message.trim() || isSending || disabled}
          className={`p-3 rounded-xl transition-all duration-200 shadow-lg ${
            !message.trim() || isSending || disabled
              ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-sm"
              : "bg-gradient-to-r from-[rgb(0,128,0)] to-[rgb(34,197,94)] text-white hover:from-[rgb(0,100,0)] hover:to-[rgb(21,128,61)] cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-105"
          }`}
          title="Gönder"
        >
          {isSending ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </form>

      {/* Helpful text */}
      {!disabled && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          <span>Enter ile gönder, Shift+Enter ile yeni satır</span>
        </div>
      )}
    </div>
  );
}

export default MessageInput;
