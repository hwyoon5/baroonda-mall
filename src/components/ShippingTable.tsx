import { shippingRows, type ShippingTerms } from "@/lib/business";

export default function ShippingTable({ terms }: { terms: ShippingTerms }) {
  return (
    <table className="w-full text-left text-xs">
      <tbody>
        {shippingRows(terms).map(([k, v]) => (
          <tr key={k} className="border-b border-gray-100 last:border-0">
            <th className="w-28 py-1.5 pr-2 align-top font-medium text-gray-500">{k}</th>
            <td className="py-1.5 text-gray-800">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
