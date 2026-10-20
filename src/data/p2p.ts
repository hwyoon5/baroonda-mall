export type TradeMethod = "direct" | "delivery";

export type Seller = {
  nickname: string;
  location: string;
  piVerified: boolean;
  rating: number;
  trades: number;
  avatarColor: string;
};

export type ListingStatus = "selling" | "reserved" | "sold";

export type P2PListing = {
  id: string;
  title: string;
  category: string;
  pricePi: number;
  negotiable: boolean;
  tradeMethods: TradeMethod[];
  meetingPlace?: string;
  description: string;
  emoji?: string;
  bg?: string;
  imageUrl?: string;
  seller: Seller;
  minutesAgo: number;
  chats: number;
  likes: number;
  status: ListingStatus;
};

export const tradeMethodLabel: Record<TradeMethod, string> = {
  direct: "직거래",
  delivery: "택배",
};

export const p2pCategories = ["디지털", "가구/인테리어", "생활/주방", "의류/잡화", "도서/취미", "유아동", "스포츠", "기타"];

export const currentUser: Seller = {
  nickname: "나",
  location: "역삼동",
  piVerified: true,
  rating: 5,
  trades: 0,
  avatarColor: "bg-pi",
};

export const p2pListings: P2PListing[] = [
  {
    id: "u1",
    title: "아이패드 에어 5세대 64GB 스페이스그레이 (풀박스)",
    category: "디지털",
    pricePi: 8.5,
    negotiable: true,
    tradeMethods: ["direct", "delivery"],
    meetingPlace: "강남역 11번 출구",
    description: "",
    emoji: "📲",
    bg: "bg-slate-100",
    seller: { nickname: "파이오니어88", location: "역삼동", piVerified: true, rating: 4.9, trades: 23, avatarColor: "bg-sky-500" },
    minutesAgo: 12,
    chats: 4,
    likes: 17,
    status: "selling",
  },
  {
    id: "u2",
    title: "원목 1인 책상 + 의자 세트",
    category: "가구/인테리어",
    pricePi: 2.2,
    negotiable: false,
    tradeMethods: ["direct"],
    meetingPlace: "서초동 자택 앞",
    description: "",
    emoji: "🪑",
    bg: "bg-amber-50",
    seller: { nickname: "서초새내기", location: "서초동", piVerified: true, rating: 4.7, trades: 5, avatarColor: "bg-emerald-500" },
    minutesAgo: 45,
    chats: 2,
    likes: 8,
    status: "reserved",
  },
  {
    id: "u3",
    title: "닌텐도 스위치 OLED 화이트 + 젤다 칩",
    category: "디지털",
    pricePi: 6.8,
    negotiable: true,
    tradeMethods: ["delivery"],
    description: "",
    emoji: "🎮",
    bg: "bg-red-50",
    seller: { nickname: "게임하는곰", location: "망원동", piVerified: false, rating: 4.5, trades: 11, avatarColor: "bg-orange-500" },
    minutesAgo: 130,
    chats: 9,
    likes: 31,
    status: "selling",
  },
  {
    id: "u4",
    title: "노스페이스 눕시 패딩 95 (블랙)",
    category: "의류/잡화",
    pricePi: 3.1,
    negotiable: false,
    tradeMethods: ["direct", "delivery"],
    meetingPlace: "잠실역 롯데월드몰",
    description: "",
    emoji: "🧥",
    bg: "bg-gray-100",
    seller: { nickname: "잠실러", location: "잠실동", piVerified: true, rating: 5, trades: 42, avatarColor: "bg-rose-500" },
    minutesAgo: 300,
    chats: 1,
    likes: 6,
    status: "selling",
  },
  {
    id: "u5",
    title: "해리포터 전집 23권 (거의 새책)",
    category: "도서/취미",
    pricePi: 0.9,
    negotiable: true,
    tradeMethods: ["delivery"],
    description: "",
    emoji: "📚",
    bg: "bg-indigo-50",
    seller: { nickname: "책벌레", location: "분당동", piVerified: true, rating: 4.8, trades: 17, avatarColor: "bg-violet-500" },
    minutesAgo: 1500,
    chats: 0,
    likes: 3,
    status: "sold",
  },
];

export function formatTimeAgo(minutes: number) {
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}시간 전`;
  return `${Math.floor(minutes / (60 * 24))}일 전`;
}
