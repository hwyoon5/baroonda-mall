import Link from "next/link";
import { homeCategories as defaultCategories, type Category } from "@/lib/categories";

export default function CategoryGrid({ items = defaultCategories }: { items?: Category[] }) {
  return (
    <section aria-label="카테고리" className="bg-white px-3 py-4">
      <ul className="grid grid-cols-5 gap-y-4">
        {items.map((c) => (
          <li key={c.id}>
            <Link href={c.href} className="tap flex flex-col items-center gap-1.5 rounded-xl py-1">
              <span className={`relative flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${c.bg}`}>
                {c.icon}
                {c.badge && (
                  <span className="absolute -right-1.5 -top-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-extrabold leading-none text-white">
                    {c.badge}
                  </span>
                )}
              </span>
              <span className={`text-[11px] font-medium ${c.badge ? "font-bold text-pi" : "text-gray-700"}`}>
                {c.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
