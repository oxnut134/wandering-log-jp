"use client";

import { useEffect, useRef, useState } from "react";
import { Bot } from "lucide-react";

type ChatMessage = {
    role: "user" | "assistant";
    content: string;
};

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages, isLoading, isOpen]);

    const handleSend = async () => {
        const text = input.trim();
        if (!text || isLoading) return;

        const history = messages;
        setMessages((prev) => [...prev, { role: "user", content: text }]);
        setInput("");
        setIsLoading(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text, history }),
            });
            const data = await res.json();
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: data.reply || "回答を取得できませんでした。" },
            ]);
        } catch (e) {
            console.error("chat send error:", e);
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "エラーが発生しました。時間をおいて再度お試しください。" },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    style={{
                        position: "fixed",
                        bottom: "440px",
                        right: "11px",
                        width: "56px",
                        height: "56px",
                        borderRadius: "50%",
                        backgroundColor: "#ffffff",
                        border: "none",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                        cursor: "pointer",
                        zIndex: 1500,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                    title="AIチャット"
                >
                    <Bot size={28} color="#000000" />
                </button>
            )}

            <div
                className={`fixed inset-x-0 bottom-0 md:inset-x-auto md:right-4 md:bottom-4 z-[1500]
                    w-full md:w-[380px] h-[75vh] md:h-[600px] max-h-[85vh]
                    bg-[#e7eef5] shadow-2xl rounded-t-2xl md:rounded-2xl
                    flex flex-col overflow-hidden
                    transition-transform duration-300 ease-out
                    ${isOpen ? "translate-y-0" : "translate-y-[110%]"}`}
            >
                <div className="flex items-center justify-between px-4 py-3 bg-[#06C755] text-white shrink-0">
                    <span className="font-bold tracking-wide">AIチャット</span>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-white text-xl leading-none px-1"
                        aria-label="閉じる"
                    >
                        ✕
                    </button>
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
                    {messages.length === 0 && (
                        <div className="text-center text-gray-500 text-sm mt-6 px-4">
                            訪問記録について、AIに質問してみましょう。<br />
                            例：「最近どのエリアによく行った？」
                        </div>
                    )}
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                            <div
                                className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed shadow-sm
                                    ${m.role === "user"
                                        ? "bg-[#8DE055] text-black rounded-br-sm"
                                        : "bg-white text-black rounded-bl-sm"}`}
                            >
                                {m.content}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white text-gray-400 px-3 py-2 rounded-2xl rounded-bl-sm text-sm shadow-sm">
                                入力中...
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 px-3 py-2 bg-white border-t border-gray-200 shrink-0">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="質問を入力..."
                        className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-[#06C755]"
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className="bg-[#06C755] text-white rounded-full w-10 h-10 flex items-center justify-center disabled:opacity-40 shrink-0"
                        aria-label="送信"
                    >
                        ➤
                    </button>
                </div>
            </div>
        </>
    );
}
