import Link from "next/link";
import SubHeader from "@/components/SubHeader";
import { productCategories, productsInCategory, usedMarketCategory } from "@/data/mall";

export default function CategoriesPage() {
  const items = [usedMarketCategory, ...productCategories];
  return (
    <>
      <SubHeader title="카테고리" back={false} />
      <ul className="divide-y divide-gray-100 bg-white">
        {items.map((c) => (
          <li key={c.id}>
            <Link href={c.href} className="tap flex items-center gap-3 px-4 py-3.5">
              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl text-2xl ${c.bg}`}>{c.icon}</span>
              <span className="flex-1 text-sm font-semibold text-gray-900">{c.name}</span>
              {c.id !== "used" && <span className="text-xs text-gray-400">{productsInCategory(c.id).length}개</span>}
              {c.badge && <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{c.badge}</span>}
              <span className="text-gray-300">&rsaquo;</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
