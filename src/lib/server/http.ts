import { NextResponse } from "next/server";
import { PiApiError, PiConfigError } from "./pi";
import { getSessionUser } from "./session";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function requireUser(req: Request) {
  const user = getSessionUser(req);
  if (!user) throw new HttpError(401, "Pi 계정으로 로그인해 주세요.");
  return user;
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "잘못된 요청 형식이에요.");
  }
}

export function handle<C>(fn: (req: Request, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      if (e instanceof PiConfigError) return json({ error: e.message }, 503);
      if (e instanceof PiApiError) {
        console.error("Pi API error", e.status, e.body);
        return json({ error: "Pi 서버 요청에 실패했어요.", detail: e.body }, 502);
      }
      console.error(e);
      return json({ error: "서버 오류가 발생했어요." }, 500);
    }
  };
}
