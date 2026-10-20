"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SubHeader from "@/components/SubHeader";
import LoginCard from "@/components/pi/LoginCard";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/client/api";
import { timeAgo } from "@/lib/format";
import type { ChatRoom } from "@/lib/types";

export default function ChatsPage() {
  const { user, ready } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[] | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = () => api<{ rooms: ChatRoom[] }>("/api/chats").then((r) => setRooms(r.rooms)).catch(() => setRooms([]));
    void load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [user]);

  return (
    <>
      <SubHeader title="채팅" />
      {!ready ? null : !user ? (
        <LoginCard message="로그인하면 판매자·구매자와 채팅할 수 있어요." />
      ) : (
        <ul className="divide-y divide-gray-100 bg-white">
          {rooms && rooms.length === 0 && <li className="py-16 text-center text-sm text-gray-500">아직 채팅이 없어요. 상품 상세에서 채팅하기를 눌러 보세요.</li>}
          {rooms?.map((r) => {
            const other = r.buyer.uid === user.uid ? r.seller : r.buyer;
            const unread = r.unread[user.uid] ?? 0;
            return (
              <li key={r.id}>
                <Link href={`/chats/${r.id}`} className="tap flex items-center gap-3 px-4 py-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pi text-sm font-bold text-white">{other.username.slice(0, 1)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-gray-900">{other.username}</span>
                      <span className="text-[11px] text-gray-400">· {timeAgo(r.lastAt)}</span>
                    </span>
                    <span className="block truncate text-[11px] text-gray-500">{r.listingTitle}</span>
                    <span className="block truncate text-sm text-gray-700">{r.lastMessage ?? "대화를 시작해 보세요."}</span>
                  </span>
                  {unread > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white">{unread}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
