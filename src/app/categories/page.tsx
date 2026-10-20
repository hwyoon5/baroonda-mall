import Link from "next/link";
import SubHeader from "@/components/SubHeader";
import { listingCategories, usedCategory } from "@/lib/categories";

export default function CategoriesPage() {
  return (
    <>
      <SubHeader title="카테고리" back={false} />
      <ul className="grid grid-cols-3 gap-3 bg-white p-4">
        {[usedCategory, ...listingCategories].map((c) => (
          <li key={c.id}>
            <Link href={c.href} className="tap flex flex-col items-center gap-2 rounded-xl border border-gray-100 py-4">
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${c.bg}`}>{c.icon}</span>
              <span className="text-xs font-medium text-gray-700">{c.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
