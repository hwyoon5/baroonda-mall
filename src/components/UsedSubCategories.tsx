import Link from "next/link";
import { listingCategories } from "@/lib/categories";
import type { Listing } from "@/lib/types";

/** 중고 거래에 쓰는 세부 분류(신선식품은 개인 간 중고 대상이 아니라 뺀다) */
export const usedSubCategories = listingCategories.filter((c) => c.id !== "fresh");

/** 중고마켓 상단 가로 스크롤 세부 카테고리 칩. 선택값은 ?sub= 로 주소에 남긴다. */
export default function UsedSubCategories({ items, active }: { items: Listing[]; active?: string }) {
  const count = (id?: string) => (id ? items.filter((l) => l.category === id).length : items.length);
  const chips = [{ id: undefined, name: "전체", icon: "🤝" }, ...usedSubCategories];
  return (
    <nav aria-label="중고 세부 카테고리" className="sticky top-14 z-10 border-b border-gray-100 bg-white">
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2.5">
        {chips.map((c) => {
          const on = (active ?? undefined) === c.id;
          return (
            <Link
              key={c.id ?? "all"}
              href={c.id ? `/category/used?sub=${c.id}` : "/category/used"}
              replace
              scroll={false}
              aria-current={on ? "page" : undefined}
              className={`tap flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold ${
                on ? "border-pi bg-pi text-white" : "border-gray-200 bg-white text-gray-700"
              }`}
            >
              <span aria-hidden>{c.icon}</span>
              {c.name}
              <span className={on ? "text-white/80" : "text-gray-400"}>{count(c.id)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
