import Link from "next/link";
import SubHeader from "@/components/SubHeader";
import { listingCategories } from "@/lib/categories";

export default function CategoriesPage() {
  return (
    <>
      <SubHeader title="카테고리" back={false} />
      <ul className="grid grid-cols-3 gap-3 bg-white p-4">
        {listingCategories.map((c) => (
          <li key={c.id}>
            <Link href={c.href} className="tap flex flex-col items-center gap-2 rounded-xl border border-gray-100 py-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.image} alt="" width={64} height={64} className={`h-16 w-16 rounded-2xl object-cover ring-1 ring-black/5 ${c.bg}`} />
              <span className="text-xs font-medium text-gray-700">{c.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
