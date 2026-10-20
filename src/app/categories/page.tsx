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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.image} alt="" width={48} height={48} className={`h-12 w-12 rounded-2xl object-cover ring-1 ring-black/5 ${c.bg}`} />
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
