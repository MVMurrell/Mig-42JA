import type { VercelRequest, VercelResponse } from "@vercel/node";

const DEV_USER = {
  id: "dev-user-1",
  username: "devuser",
  email: "dev@local.test",
  name: "Dev User",
};

export default function handler(_req: VercelRequest, res: VercelResponse) {
  // simulate a session cookie
  res.setHeader("Set-Cookie", "jid=dev; Path=/; HttpOnly; SameSite=Lax");
  res.status(200).json({ ok: true, user: DEV_USER });
}
