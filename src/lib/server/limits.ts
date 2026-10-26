import { isAdmin } from "./admin";
import { takeDailyQuota } from "./db";
import { HttpError } from "./http";

type User = NonNullable<Parameters<typeof isAdmin>[0]>;

const envInt = (name: string, fallback: number) => {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

const QUOTAS = {
  listing: {
    env: "MAX_LISTINGS_PER_DAY",
    fallback: 30,
    message: (n: number) => `상품은 하루 ${n}개까지 등록할 수 있어요(임시저장 포함). 내일 다시 등록해 주세요.`,
  },
  upload: {
    env: "MAX_UPLOADS_PER_DAY",
    fallback: 400,
    message: (n: number) => `사진·동영상은 하루 ${n}개까지 올릴 수 있어요. 내일 다시 시도해 주세요.`,
  },
};

/** 도배·과부하 방지용 하루 한도. 관리자는 제외. */
export async function assertDailyQuota(user: User, kind: keyof typeof QUOTAS) {
  if (isAdmin(user)) return;
  const q = QUOTAS[kind];
  const limit = envInt(q.env, q.fallback);
  if (!(await takeDailyQuota(kind, user.uid, limit))) throw new HttpError(429, q.message(limit));
}
