import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/server/auth";

export function POST() {
  const res = NextResponse.json({ data: { ok: true } });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 0 });
  return res;
}
