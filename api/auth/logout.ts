import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  // clear the cookie
  res.setHeader(
    "Set-Cookie",
    "jid=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax"
  );
  res.status(200).json({ ok: true });
}
