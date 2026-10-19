const items = [
  { label: "홈", active: true, d: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" },
  { label: "카테고리", active: false, d: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" },
  { label: "찜", active: false, d: "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" },
  { label: "주문내역", active: false, d: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6" },
  { label: "마이", active: false, d: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" },
];

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5">
        {items.map((it) => (
          <li key={it.label}>
            <a
              href="#"
              className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
                it.active ? "text-pi" : "text-gray-400"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round">
                <path d={it.d} />
              </svg>
              {it.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
