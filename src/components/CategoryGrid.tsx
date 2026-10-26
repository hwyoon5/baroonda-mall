import Link from "next/link";
import { homeCategories as defaultCategories, type Category } from "@/lib/categories";

export default function CategoryGrid({ items = defaultCategories }: { items?: Category[] }) {
  return (
    <section aria-label="카테고리" className="bg-white px-3 py-4">
      <ul className="grid grid-cols-5 gap-y-4 lg:grid-cols-10">
        {items.map((c) => (
          <li key={c.id}>
            <Link href={c.href} className="tap flex flex-col items-center gap-1.5 rounded-xl py-1">
              <span className={`relative block h-14 w-14 rounded-2xl ring-1 ring-black/5 ${c.bg}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.image} alt="" width={56} height={56} className="h-full w-full rounded-2xl object-cover" />
                {c.badge && (
                  <span className="absolute -right-1.5 -top-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-extrabold leading-none text-white">
                    {c.badge}
                  </span>
                )}
              </span>
              <span
                className={`break-keep text-center text-[11px] font-medium leading-tight ${c.badge ? "font-bold text-pi" : "text-gray-700"}`}
              >
                {c.name.replaceAll("/", "/\u200b")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
