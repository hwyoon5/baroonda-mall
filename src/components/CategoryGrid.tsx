import { categories } from "@/data/mall";

export default function CategoryGrid() {
  return (
    <section aria-label="카테고리" className="bg-white px-3 py-4">
      <ul className="grid grid-cols-5 gap-y-4">
        {categories.map((c) => (
          <li key={c.id}>
            <a href={`#${c.id}`} className="flex flex-col items-center gap-1.5">
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${c.bg}`}>
                {c.icon}
              </span>
              <span className="text-[11px] font-medium text-gray-700">{c.name}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
