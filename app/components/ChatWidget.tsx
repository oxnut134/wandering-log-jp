"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isTextUIPart } from "ai";
import { Bot } from "lucide-react";

const AI_LIMIT_MESSAGE = "デモの本日の利用上限に達しました";

// /api/chat が 429（デモの利用上限）を返したら、画面に出すメッセージのエラーにする
const chatTransport = new DefaultChatTransport({
    api: "/api/chat",
    fetch: async (input, init) => {
        const res = await fetch(input, init);
        if (res.status === 429) throw new Error(AI_LIMIT_MESSAGE);
        return res;
    },
});

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    const { messages, status, sendMessage, error } = useChat({ transport: chatTransport });

    const isLoading = status === "submitted" || status === "streaming";

    useEffect(() => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages, isLoading, isOpen, error]);

    const handleSend = () => {
        if (!input.trim() || isLoading) return;
        sendMessage({ text: input });
        setInput("");
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
                    {messages.map((m) => (
                        <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                            <div
                                className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed shadow-sm
                                    ${m.role === "user"
                                        ? "bg-[#8DE055] text-black rounded-br-sm"
                                        : "bg-white text-black rounded-bl-sm"}`}
                            >
                                {m.parts.filter(isTextUIPart).map((p) => p.text).join("")}
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
                    {error && !isLoading && (
                        <div className="text-center text-red-500 text-xs px-4">
                            {error.message === AI_LIMIT_MESSAGE ? AI_LIMIT_MESSAGE : "回答の生成に失敗しました。もう一度お試しください。"}
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
