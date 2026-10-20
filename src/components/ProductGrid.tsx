import { products as defaultProducts, type Product } from "@/data/mall";
import ProductCard from "./ProductCard";

export default function ProductGrid({
  title = "바로온다 추천상품",
  items = defaultProducts,
  emptyText = "상품이 없어요.",
}: {
  title?: string | null;
  items?: Product[];
  emptyText?: string;
}) {
  return (
    <section className="mt-2 bg-white px-4 py-4">
      {title && <h2 className="mb-3 text-lg font-extrabold text-gray-900">{title}</h2>}
      {items.length === 0 ? (
        <p className="py-16 text-center text-sm text-gray-400">{emptyText}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-5">
          {items.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
