import type { P2PListing } from "@/data/p2p";
import P2PListingCard from "./P2PListingCard";

export default function P2PList({ items }: { items: P2PListing[] }) {
  if (items.length === 0) {
    return <p className="py-10 text-center text-sm text-gray-400">아직 등록된 물건이 없어요.</p>;
  }
  return (
    <ul className="divide-y divide-gray-100">
      {items.map((item) => (
        <li key={item.id}>
          <P2PListingCard item={item} />
        </li>
      ))}
    </ul>
  );
}
