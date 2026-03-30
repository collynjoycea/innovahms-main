import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Bot, MessageCircle, Send, Trash2, X } from "lucide-react";

const HISTORY_LIMIT = 120;

const hiddenPrefixes = [
  "/login",
  "/signup",
  "/owner",
  "/staff",
  "/admin",
  "/hr",
  "/manager",
  "/housekeeping",
  "/maintenance",
  "/inventory",
];

const getStoredUser = () => {
  const rawUser = localStorage.getItem("user") || localStorage.getItem("customerSession");
  if (!rawUser) return null;
  try {
    const parsed = JSON.parse(rawUser);
    return parsed?.user && typeof parsed.user === "object" ? parsed.user : parsed;
  } catch {
    return null;
  }
};

const getDefaultWelcome = (firstName) => [
  {
    id: "welcome",
    from: "bot",
    text: firstName
      ? `Hi ${firstName}. I am your AI Assisted History companion. I can help with bookings, rooms, promotions, and account concerns.`
      : "Hi. I am your AI Assisted History companion. I can help with bookings, rooms, promotions, and account concerns.",
    timestamp: Date.now(),
  },
];

export default function GlobalAIAssistant() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [input, setInput] = useState("");
  const [notice, setNotice] = useState("");
  const [sessionUser, setSessionUser] = useState(() => getStoredUser());
  const [messages, setMessages] = useState(() =>
    getDefaultWelcome(getStoredUser()?.firstName || getStoredUser()?.first_name || "")
  );
  const chatScrollRef = useRef(null);

  const shouldHide = hiddenPrefixes.some((prefix) => location.pathname.startsWith(prefix));
  const userId = sessionUser?.id || sessionUser?.customer_id || sessionUser?.user_id || "guest";
  const historyKey = useMemo(() => `innova_ai_history_${userId}`, [userId]);

  useEffect(() => {
    const handleSessionRefresh = () => {
      setSessionUser(getStoredUser());
    };

    window.addEventListener("userUpdated", handleSessionRefresh);
    window.addEventListener("storage", handleSessionRefresh);
    return () => {
      window.removeEventListener("userUpdated", handleSessionRefresh);
      window.removeEventListener("storage", handleSessionRefresh);
    };
  }, []);

  useEffect(() => {
    const handleOpenAssistant = (event) => {
      const prompt = typeof event?.detail?.prompt === "string" ? event.detail.prompt : "";
      setIsOpen(true);
      if (prompt) {
        setInput(prompt);
      }
    };

    window.addEventListener("openGlobalAIAssistant", handleOpenAssistant);
    return () => {
      window.removeEventListener("openGlobalAIAssistant", handleOpenAssistant);
    };
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(historyKey);
    if (!raw) {
      setMessages(getDefaultWelcome(sessionUser?.firstName || sessionUser?.first_name || ""));
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setMessages(parsed.slice(-HISTORY_LIMIT));
      } else {
        setMessages(getDefaultWelcome(sessionUser?.firstName || sessionUser?.first_name || ""));
      }
    } catch {
      setMessages(getDefaultWelcome(sessionUser?.firstName || sessionUser?.first_name || ""));
    }
  }, [historyKey, sessionUser?.firstName, sessionUser?.first_name]);

  useEffect(() => {
    localStorage.setItem(historyKey, JSON.stringify(messages.slice(-HISTORY_LIMIT)));
  }, [historyKey, messages]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isTyping, isOpen]);

  if (shouldHide) return null;

  const handleSend = async () => {
    const message = input.trim();
    if (!message || isTyping) return;

    const userMessage = {
      id: `u-${Date.now()}`,
      from: "user",
      text: message,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setNotice("");

    try {
      setIsTyping(true);
      const response = await fetch("/api/chatbot/rasa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: `global-${userId}`,
          customer_id: userId === "guest" ? null : userId,
          message,
          context_path: location.pathname,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "AI assistant is unavailable right now.");
      }

      if (payload?.source === "fallback") {
        setNotice("Fallback mode active. History is still saved.");
      }

      const replies = Array.isArray(payload.messages) ? payload.messages : [];
      setMessages((prev) => [
        ...prev,
        ...(replies.length
          ? replies.map((text, index) => ({
              id: `b-${Date.now()}-${index}`,
              from: "bot",
              text,
              timestamp: Date.now(),
            }))
          : [
              {
                id: `b-${Date.now()}`,
                from: "bot",
                text: "No response text returned by assistant.",
                timestamp: Date.now(),
              },
            ]),
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          from: "bot",
          text: error?.message || "Unable to process request.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearHistory = () => {
    const reset = getDefaultWelcome(sessionUser?.firstName || sessionUser?.first_name || "");
    setMessages(reset);
    setNotice("History cleared for current session.");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-[1200] h-14 w-14 rounded-full bg-[#bf9b30] text-[#0d0c0a] shadow-2xl shadow-[#bf9b30]/40 flex items-center justify-center hover:brightness-95 transition-all"
        title="AI Assisted History"
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {isOpen ? (
        <div className="fixed bottom-24 right-6 z-[1200] w-[340px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-[#e4d9c2] dark:border-white/10 bg-white dark:bg-[#12110d] shadow-2xl">
          <div className="px-4 py-3 border-b border-[#eee4cf] dark:border-white/10 bg-[#fbf5e9] dark:bg-[#1a1915] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot size={16} className="text-[#bf9b30]" />
              <p className="text-[11px] font-black uppercase tracking-widest text-[#5f5443] dark:text-[#d7c9a6]">
                AI Assisted History
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearHistory}
              className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#8a7b61] dark:text-[#b5a789] hover:text-[#bf9b30]"
            >
              <Trash2 size={12} />
              Clear
            </button>
          </div>

          <div ref={chatScrollRef} className="h-80 overflow-y-auto p-4 space-y-3 bg-[#fffdf8] dark:bg-[#12110d]">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.from === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    message.from === "user"
                      ? "bg-[#bf9b30] text-[#0d0c0a] rounded-tr-sm font-bold"
                      : "bg-white dark:bg-[#1b1914] border border-[#eadfca] dark:border-white/10 text-[#4f4434] dark:text-[#d4ccb8] rounded-tl-sm"
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}

            {isTyping ? (
              <div className="text-[11px] font-semibold text-[#8d7e63] dark:text-[#9e927b]">Assistant is typing...</div>
            ) : null}
          </div>

          {notice ? (
            <p className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#8a7a5f] dark:text-[#9d8f77] border-t border-[#eee4cf] dark:border-white/10">
              {notice}
            </p>
          ) : null}

          <div className="p-3 border-t border-[#eee4cf] dark:border-white/10 bg-[#fbf5e9] dark:bg-[#1a1915]">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask about rooms, promos, booking..."
                className="flex-1 rounded-xl border border-[#e7ddc8] dark:border-white/10 bg-white dark:bg-[#12110d] px-3 py-2 text-sm text-[#504434] dark:text-[#d4ccb8] outline-none focus:border-[#bf9b30]"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="h-10 w-10 rounded-xl bg-[#bf9b30] text-[#0d0c0a] disabled:opacity-50 flex items-center justify-center"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
