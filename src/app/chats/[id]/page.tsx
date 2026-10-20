"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState, type FormEvent } from "react";
import SubHeader from "@/components/SubHeader";
import LoginCard from "@/components/pi/LoginCard";
import { useStore } from "@/components/store/StoreProvider";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/client/api";
import type { ChatMessage, ChatRoom } from "@/lib/types";

const POLL_MS = 3000;

export default function ChatRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, ready } = useAuth();
  const { showToast } = useStore();
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const lastAt = useRef<string | null>(null);
  const loaded = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    let stop = false;
    const poll = async () => {
      try {
        const q = lastAt.current ? `?after=${encodeURIComponent(lastAt.current)}` : "";
        const r = await api<{ room: ChatRoom; messages: ChatMessage[] }>(`/api/chats/${id}${q}`);
        if (stop) return;
        loaded.current = true;
        setRoom(r.room);
        if (r.messages.length) {
          lastAt.current = r.messages[r.messages.length - 1].createdAt;
          setMessages((cur) => [...cur, ...r.messages.filter((m) => !cur.some((c) => c.id === m.id))]);
        }
        setError("");
      } catch (e) {
        if (stop) return;
        // 첫 로딩 실패나 권한 없음만 화면에 표시하고, 폴링 중 일시적인 네트워크 오류는 다음 주기에 다시 시도한다.
        const status = (e as { status?: number }).status;
        if (!loaded.current || status === 401 || status === 404) setError(e instanceof Error ? e.message : "채팅을 불러오지 못했어요.");
      }
    };
    void poll();
    const t = setInterval(poll, POLL_MS);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [user, id]);

  useEffect(() => bottom.current?.scrollIntoView({ block: "end" }), [messages.length]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const { message } = await api<{ message: ChatMessage }>(`/api/chats/${id}`, { text });
      setMessages((cur) => (cur.some((c) => c.id === message.id) ? cur : [...cur, message]));
      setText("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "메시지를 보내지 못했어요.");
    } finally {
      setSending(false);
    }
  };

  const other = room && user ? (room.buyer.uid === user.uid ? room.seller : room.buyer) : null;

  return (
    <>
      <SubHeader title={other ? other.username : "채팅"} />
      {!ready ? null : !user ? (
        <LoginCard />
      ) : error ? (
        <p className="p-8 text-center text-sm text-red-500">{error}</p>
      ) : (
        <>
          {room && (
            <Link href={`/listings/${room.listingId}`} className="tap sticky top-14 z-10 flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-2.5">
              {room.listingImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={room.listingImage} alt="" className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50">📦</span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm text-gray-800">{room.listingTitle}</span>
              <span className="text-xs text-gray-400">상품 보기 ›</span>
            </Link>
          )}
          <ul className="space-y-2 px-4 py-4 pb-24">
            {messages.length === 0 && <li className="py-10 text-center text-xs text-gray-400">거래 전 궁금한 점을 물어보세요. 결제는 π 안전결제로만 해 주세요.</li>}
            {messages.map((m) => {
              const mine = m.senderUid === user.uid;
              return (
                <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <span className={`max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${mine ? "rounded-br-sm bg-pi text-white" : "rounded-bl-sm bg-white text-gray-900"}`}>{m.text}</span>
                </li>
              );
            })}
            <div ref={bottom} />
          </ul>
          <form onSubmit={send} className="fixed inset-x-0 bottom-[calc(57px+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-md gap-2 border-t border-gray-100 bg-white px-3 py-2">
            <input
              aria-label="메시지"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={1000}
              placeholder="메시지 보내기"
              className="min-w-0 flex-1 rounded-full bg-gray-100 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
            <button type="submit" disabled={!text.trim() || sending} className="tap shrink-0 rounded-full bg-pi px-4 text-sm font-bold text-white disabled:opacity-40">
              전송
            </button>
          </form>
        </>
      )}
    </>
  );
}
