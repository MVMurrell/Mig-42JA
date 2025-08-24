// PATH: api/index.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import serverless from "serverless-http";
import app from "./app";

const handler = serverless(app);
export default (req: VercelRequest, res: VercelResponse) =>
  handler(req as any, res as any);
