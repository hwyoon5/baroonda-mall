"use client";

/** 임시: 사업자 정보 화면 테스트용 자동 입력. 정식 오픈 전에 이 파일과 사용처를 지운다. */
export const TEST_BUSINESS = {
  bizName: "바로온다 테스트상점",
  ownerName: "홍길동",
  bizRegNo: "123-45-67891",
  mailOrderNo: "2024-서울강남-01234",
  mailOrderExempt: false,
  address: "서울특별시 강남구 테헤란로 123, 4층",
  phone: "02-1234-5678",
  email: "test@baroonda.example",
  piWallet: "GBBECUSPJ5HEIQJNKRCVGVBNK5AUYTCFKQWTAMBQGAYDAMBQGAYAAKQY",
};

type DocKey = "bizRegDoc" | "mailOrderDoc";

/** 서류처럼 보이는 PNG를 화면에서 그려 실제 첨부와 같은 경로로 올린다. */
async function dummyDoc(title: string): Promise<File> {
  const c = document.createElement("canvas");
  c.width = 800;
  c.height = 1100;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff";
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = "#6d28d9";
  g.lineWidth = 8;
  g.strokeRect(30, 30, c.width - 60, c.height - 60);
  g.fillStyle = "#111";
  g.textAlign = "center";
  g.font = "bold 56px sans-serif";
  g.fillText(title, c.width / 2, 200);
  g.font = "32px sans-serif";
  const lines = [`상호: ${TEST_BUSINESS.bizName}`, `대표자: ${TEST_BUSINESS.ownerName}`, `등록번호: ${TEST_BUSINESS.bizRegNo}`, new Date().toLocaleString("ko-KR")];
  lines.forEach((t, i) => g.fillText(t, c.width / 2, 340 + i * 70));
  g.fillStyle = "#dc2626";
  g.font = "bold 72px sans-serif";
  g.fillText("테스트용 더미", c.width / 2, 900);
  const blob = await new Promise<Blob>((ok, fail) => c.toBlob((b) => (b ? ok(b) : fail(new Error("더미 파일을 만들지 못했어요."))), "image/png"));
  return new File([blob], `${title}-test.png`, { type: "image/png" });
}

export default function BusinessTestFill({
  disabled,
  onFill,
  attach,
}: {
  disabled: boolean;
  onFill: (patch: typeof TEST_BUSINESS) => void;
  attach: (key: DocKey, file: File) => Promise<void>;
}) {
  const run = async () => {
    onFill(TEST_BUSINESS);
    await attach("bizRegDoc", await dummyDoc("사업자등록증"));
    await attach("mailOrderDoc", await dummyDoc("통신판매업 신고증"));
  };
  return (
    <button
      type="button"
      onClick={run}
      disabled={disabled}
      className="w-full rounded-lg border border-dashed border-amber-400 bg-amber-50 py-2.5 text-xs font-bold text-amber-700 disabled:opacity-50"
    >
      🧪 테스트 데이터 자동 입력 (임시)
    </button>
  );
}
