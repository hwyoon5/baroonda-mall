import type { Listing, PiUser, TradeMethod } from "./types";

/** 예시 판매글. 실제 상품과 똑같이 Pi로 결제되고, 소유·정산은 운영자 계정(DEMO_SELLER_USERNAME)이 맡는다. */
const sellers: (PiUser & { location: string })[] = [
  { uid: "demo-1", username: "제주감귤농장", location: "제주시" },
  { uid: "demo-2", username: "파이오니어88", location: "역삼동" },
  { uid: "demo-3", username: "디지털파이", location: "용산동" },
  { uid: "demo-4", username: "잠실러", location: "잠실동" },
  { uid: "demo-5", username: "멍냥상회", location: "망원동" },
  { uid: "demo-6", username: "리빙하우스", location: "성수동" },
  { uid: "demo-7", username: "헬시랩", location: "판교동" },
  { uid: "demo-8", username: "북앤티켓", location: "합정동" },
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
  desc?: string;
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
  { title: "아기 원목 블록 쌓기 장난감", category: "fashion", emoji: "🧸", bg: "bg-yellow-50", price: 0.65, used: true, seller: 1 },
  { title: "고양이 스크래쳐 하우스 (새상품)", category: "pet", emoji: "🐱", bg: "bg-amber-50", price: 0.88, original: 1.2, seller: 4 },
  { title: "경량 러닝화 에어 쿠션", brand: "Nike", category: "sports", emoji: "👟", bg: "bg-sky-50", price: 2.4, original: 3.2, fast: true, seller: 3 },
  { title: "해리포터 전집 23권 (거의 새책)", category: "sports", emoji: "📚", bg: "bg-indigo-50", price: 0.9, used: true, seller: 1 },
  { title: "천연가죽 3인용 소파 (블랙)", brand: "리빙하우스", category: "interior", emoji: "🛋️", bg: "bg-stone-100", price: 12.5, original: 16.9, seller: 5, desc: "부드러운 천연 소가죽 3인용 소파예요. 폭 210cm, 깊이 92cm이고 착불 없이 택배(화물) 배송돼요." },
  { title: "패브릭 쉐이드 테이블 램프 2개 세트", brand: "루미홈", category: "interior", emoji: "💡", bg: "bg-amber-50", price: 1.35, original: 1.8, fast: true, seller: 5, desc: "따뜻한 전구색 빛의 패브릭 쉐이드 램프 2개 세트예요. 침실·거실 협탁에 잘 어울려요. E26 전구 포함." },
  { title: "클래식 원목 암체어 (블루 패브릭)", category: "interior", emoji: "🪑", bg: "bg-sky-50", price: 6.8, seller: 5, desc: "원목 프레임에 블루 패브릭 시트를 얹은 클래식 암체어예요. 완제품으로 배송돼 조립이 필요 없어요." },
  { title: "rTG 알티지 오메가3 1200mg 180캡슐", brand: "헬시랩", category: "health", emoji: "🐟", bg: "bg-yellow-50", price: 0.95, original: 1.4, fast: true, seller: 6, desc: "EPA·DHA 함량을 높인 rTG 오메가3예요. 하루 1캡슐, 6개월분. 건강기능식품 인증 제품이에요." },
  { title: "비타민C 1000mg 200정", brand: "헬시랩", category: "health", emoji: "🍋", bg: "bg-orange-50", price: 0.62, original: 0.85, fast: true, seller: 6, desc: "하루 한 알로 채우는 고함량 비타민C 1000mg이에요. 200정, 약 6개월분이에요." },
  { title: "아연 + 비타민D 츄어블 90정", brand: "뉴트리데이", category: "health", emoji: "💊", bg: "bg-slate-100", price: 0.48, seller: 6, desc: "물 없이 씹어 먹는 아연·비타민D 츄어블이에요. 하루 1정, 3개월분이에요." },
  { title: "인문 교양 베스트셀러 10권 세트", brand: "북앤티켓", category: "books", emoji: "📚", bg: "bg-indigo-50", price: 1.6, original: 2.2, seller: 7, desc: "올해 많이 읽힌 인문·교양 베스트셀러 10권을 새 책으로 묶은 세트예요. 박스 포장으로 보내 드려요." },
  { title: "오페라 공연 관람권 R석 1매", category: "books", emoji: "🎭", bg: "bg-rose-50", price: 2.4, fast: true, seller: 7, desc: "주말 저녁 오페라 공연 R석 관람권 1매예요. 실물 티켓을 등기 택배로 보내 드려요." },
  { title: "바리스타 원데이 클래스 이용권 (1인)", category: "books", emoji: "☕", bg: "bg-amber-50", price: 0.9, seller: 7, desc: "라떼아트까지 배우는 2시간 바리스타 원데이 클래스 이용권이에요. 이용권 카드를 택배로 보내 드려요." },
];

let cache: Listing[] | null = null;

export function demoListings(): Listing[] {
  if (cache) return cache;
  const base = Date.UTC(2026, 9, 19, 9, 0, 0);
  // 개인 중고(used) 예시는 노출하지 않는다. id(demoN)·이미지가 순번 기준이라 seeds에서는 지우지 않는다.
  cache = seeds.map((s, i): Listing => {
    const seller = sellers[s.seller];
    return {
      id: `demo${i + 1}`,
      title: s.title,
      brand: s.brand,
      description: `${s.desc ? `${s.desc}\n\n` : ""}바로온다 테스트용 예시 판매글이에요. 구매하면 실제 상품과 똑같이 Pi 결제로 테스트가 진행돼요.`,
      category: s.category,
      condition: s.used ? "used" : "new",
      pricePi: s.price,
      originalPricePi: s.original,
      todayDeal: !s.used && s.original ? true : undefined,
      negotiable: Boolean(s.used),
      tradeMethods: s.methods ?? ["delivery"],
      location: seller.location,
      fastShipping: Boolean(s.fast),
      ...(s.used ? {} : { policy: { shipping: s.fast ? { method: "택배", fee: 0 } : { method: "택배", fee: 0.05, freeOver: 1 } } }),
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
  }).filter((l) => l.condition === "new");
  return cache;
}
