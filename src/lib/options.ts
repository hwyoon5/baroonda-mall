/** 새 상품 옵션·조합(variant) 규칙. 클라이언트(SellForm)와 서버(listing-input)가 같이 쓴다. */
export const MAX_OPTIONS = 5;
export const MAX_OPTION_VALUES = 20;
export const MAX_VARIANTS = 100;

export type OptionPreset = { name: string; values: string[] };

const color: OptionPreset = { name: "색상", values: ["블랙", "화이트", "그레이", "네이비", "베이지"] };
const size: OptionPreset = { name: "사이즈", values: ["S", "M", "L", "XL"] };
const qty: OptionPreset = { name: "수량", values: ["1개", "2개", "3개"] };
const bundle: OptionPreset = { name: "구성", values: ["단품", "세트"] };

/** 카테고리별 추천 옵션 그룹(쿠팡·스마트스토어식). 탭하면 이름과 기본 값이 채워진다. */
export const categoryOptionPresets: Record<string, OptionPreset[]> = {
  fashion: [color, size, { name: "신발 사이즈", values: ["230", "240", "250", "260", "270", "280"] }, { name: "핏", values: ["레귤러", "오버핏", "슬림"] }, { name: "아동 연령", values: ["0~12개월", "1~3세", "4~6세", "7세 이상"] }],
  fresh: [{ name: "용량", values: ["500g", "1kg", "2kg", "5kg"] }, { name: "수량", values: ["1팩", "2팩", "3팩"] }, { name: "등급", values: ["특", "상", "보통"] }],
  beauty: [{ name: "호수", values: ["13호", "17호", "21호", "23호", "25호"] }, { name: "용량", values: ["30ml", "50ml", "100ml"] }, { name: "컬러", values: ["로즈", "코랄", "레드", "누드"] }],
  digital: [color, { name: "저장용량", values: ["128GB", "256GB", "512GB", "1TB"] }, { name: "메모리", values: ["8GB", "16GB", "32GB"] }, { name: "사양", values: ["기본형", "고급형"] }, { name: "설치", values: ["기사 설치", "자가 설치"] }],
  living: [color, { name: "규격", values: ["소", "중", "대"] }, qty],
  sports: [size, color, { name: "무게", values: ["1kg", "3kg", "5kg"] }],
  pet: [{ name: "용량", values: ["500g", "1kg", "3kg"] }, { name: "맛", values: ["치킨", "연어", "소고기"] }, size],
  interior: [color, { name: "규격", values: ["1인용", "2인용", "3인용"] }, { name: "소재", values: ["원목", "패브릭", "가죽", "스틸"] }],
  health: [{ name: "수량", values: ["1통", "2통", "3통"] }, { name: "구성", values: ["1개월분", "3개월분", "6개월분"] }],
  books: [{ name: "구분", values: ["도서", "티켓", "서비스 이용권"] }, { name: "날짜", values: ["평일", "주말"] }, qty],
};
const fallbackPresets: OptionPreset[] = [color, size, qty, bundle];

export const optionPresetsFor = (category: string) => categoryOptionPresets[category] ?? fallbackPresets;

/** 옵션 이름으로 추천 값을 찾는다(직접 추가한 옵션에도 빠른 값 칩을 보여주기 위해). */
export function presetValuesFor(category: string, name: string): string[] {
  const n = name.trim();
  if (!n) return [];
  return (optionPresetsFor(category).find((p) => p.name === n) ?? Object.values(categoryOptionPresets).flat().concat(fallbackPresets).find((p) => p.name === n))?.values ?? [];
}
