import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { auth } from "@/lib/auth";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = () => new HttpError(404, "Not found");

export async function requireUser(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new HttpError(401, "Unauthorized");
  return session.user.id;
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
  return schema.parse(json);
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Wraps a route handler: maps HttpError/ZodError to the {error, details?} shape. */
export function route<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) {
        return NextResponse.json(
          { error: e.message, details: e.details },
          { status: e.status },
        );
      }
      if (e instanceof ZodError) {
        return NextResponse.json(
          { error: "Validation failed", details: e.flatten().fieldErrors },
          { status: 400 },
        );
      }
      console.error(e);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  };
}

export const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status });

export type IdCtx = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function idParam(ctx: IdCtx): Promise<string> {
  const { id } = await ctx.params;
  if (!UUID.test(id)) throw notFound();
  return id;
}
