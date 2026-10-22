import type { Listing, PiUser, TradeMethod } from "./types";

/** 화면 구성을 보여주기 위한 예시 판매글. demo=true 이므로 실제 결제는 막혀 있다. */
const sellers: (PiUser & { location: string })[] = [
  { uid: "demo-1", username: "제주감귤농장", location: "제주시" },
  { uid: "demo-2", username: "파이오니어88", location: "역삼동" },
  { uid: "demo-3", username: "디지털파이", location: "용산동" },
  { uid: "demo-4", username: "잠실러", location: "잠실동" },
  { uid: "demo-5", username: "멍냥상회", location: "망원동" },
];

type Seed = {
  title: string;
  brand?: string;
  category: string;
  emoji: string;
  bg: string;
  price: number;
  original?: number;
  used?: boolean;
  fast?: boolean;
  methods?: TradeMethod[];
  status?: Listing["status"];
  seller: number;
};

const seeds: Seed[] = [
  { title: "제주 감귤 5kg 산지직송", category: "fresh", emoji: "🍊", bg: "bg-orange-50", price: 0.42, original: 0.7, fast: true, seller: 0 },
  { title: "무선 블루투스 헤드폰 Pro (미개봉)", brand: "사운드랩", category: "digital", emoji: "🎧", bg: "bg-slate-100", price: 3.9, original: 6.5, fast: true, seller: 2 },
  { title: "프리미엄 한우 등심 300g", category: "fresh", emoji: "🥩", bg: "bg-red-50", price: 1.85, original: 2.6, fast: true, seller: 0 },
  { title: "고농축 세탁세제 3L x 2", brand: "클린하우스", category: "living", emoji: "🧴", bg: "bg-sky-50", price: 0.55, original: 0.99, fast: true, seller: 1 },
  { title: "스마트워치 S9 실리콘 밴드", brand: "삼성", category: "digital", emoji: "⌚", bg: "bg-violet-50", price: 0.28, original: 0.5, seller: 2 },
  { title: "아이패드 에어 5세대 64GB (풀박스)", brand: "Apple", category: "digital", emoji: "📲", bg: "bg-slate-100", price: 8.5, used: true, methods: ["direct", "delivery"], seller: 1 },
  { title: "원목 1인 책상 + 의자 세트", category: "living", emoji: "🪑", bg: "bg-amber-50", price: 2.2, used: true, methods: ["direct"], status: "reserved", seller: 1 },
  { title: "닌텐도 스위치 OLED + 젤다 칩", brand: "Nintendo", category: "digital", emoji: "🎮", bg: "bg-red-50", price: 6.8, used: true, seller: 2 },
  { title: "노스페이스 눕시 패딩 95 (블랙)", brand: "The North Face", category: "fashion", emoji: "🧥", bg: "bg-gray-100", price: 3.1, used: true, methods: ["direct", "delivery"], seller: 3 },
  { title: "유기농 바나나 1.2kg 한 송이", category: "fresh", emoji: "🍌", bg: "bg-yellow-50", price: 0.18, original: 0.24, fast: true, seller: 0 },
  { title: "데일리 오버핏 코튼 후드티", brand: "베이직핏", category: "fashion", emoji: "👚", bg: "bg-pink-50", price: 1.2, seller: 3 },
  { title: "수분 진정 시카 앰플 30ml", brand: "그린랩", category: "beauty", emoji: "🧴", bg: "bg-emerald-50", price: 0.75, original: 1.1, fast: true, seller: 3 },
  { title: "65W 고속 충전기 GaN 3포트", brand: "Anker", category: "digital", emoji: "🔌", bg: "bg-slate-100", price: 1.45, original: 1.9, fast: true, seller: 2 },
  { title: "논스틱 프라이팬 28cm", category: "living", emoji: "🍳", bg: "bg-orange-50", price: 0.95, seller: 1 },
  { title: "강아지 동결건조 간식 트릿", category: "pet", emoji: "🦴", bg: "bg-lime-50", price: 0.48, fast: true, seller: 4 },
  { title: "요가매트 TPE 8mm 논슬립", category: "sports", emoji: "🧘", bg: "bg-violet-50", price: 1.05, original: 1.5, seller: 3 },
  { title: "아기 원목 블록 쌓기 장난감", category: "baby", emoji: "🧸", bg: "bg-yellow-50", price: 0.65, used: true, seller: 1 },
  { title: "고양이 스크래쳐 하우스 (새상품)", category: "pet", emoji: "🐱", bg: "bg-amber-50", price: 0.88, original: 1.2, seller: 4 },
  { title: "경량 러닝화 에어 쿠션", brand: "Nike", category: "sports", emoji: "👟", bg: "bg-sky-50", price: 2.4, original: 3.2, fast: true, seller: 3 },
  { title: "해리포터 전집 23권 (거의 새책)", category: "sports", emoji: "📚", bg: "bg-indigo-50", price: 0.9, used: true, seller: 1 },
];

let cache: Listing[] | null = null;

export function demoListings(): Listing[] {
  if (cache) return cache;
  const base = Date.UTC(2026, 9, 19, 9, 0, 0);
  cache = seeds.map((s, i) => {
    const seller = sellers[s.seller];
    return {
      id: `demo${i + 1}`,
      title: s.title,
      brand: s.brand,
      description: "바로온다 화면 구성을 보여주기 위한 예시 판매글이에요. 실제 구매는 할 수 없어요.",
      category: s.category,
      condition: s.used ? "used" : "new",
      pricePi: s.price,
      originalPricePi: s.original,
      todayDeal: !s.used && s.original ? true : undefined,
      negotiable: Boolean(s.used),
      tradeMethods: s.methods ?? ["delivery"],
      location: seller.location,
      fastShipping: Boolean(s.fast),
      images: [`/images/listings/demo${i + 1}.jpg`],
      ...(s.used
        ? { usageGrade: "A" as const }
        : s.category === "fashion"
          ? {
              stock: 18,
              soldCount: 30 + i * 7,
              options: [{ name: "사이즈", values: ["S", "M", "L", "XL"] }],
              variants: ["S", "M", "L", "XL"].map((v, j) => ({ id: `v${j + 1}`, options: { 사이즈: v }, stock: 3 + j })),
            }
          : { stock: 12 + i, soldCount: 30 + i * 7 }),
      emoji: s.emoji,
      bg: s.bg,
      seller: { uid: seller.uid, username: seller.username },
      status: s.status ?? "selling",
      createdAt: new Date(base - i * 47 * 60000).toISOString(),
      demo: true,
    };
  });
  return cache;
}
