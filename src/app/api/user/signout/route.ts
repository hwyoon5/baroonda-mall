import { handle, json } from "@/lib/server/http";

/** Pi 공식 데모의 GET /user/signout. 세션은 무상태 Bearer 토큰이라 클라이언트가 토큰을 지운다. */
export const GET = handle(async () => json({ message: "User signed out" }));
