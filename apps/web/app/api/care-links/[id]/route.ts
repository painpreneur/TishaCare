import { NextRequest, NextResponse } from "next/server";
import { getCurrentDoctor } from "@/lib/session";
import { CareLinkError, acceptLink, declineLink, endLinkByDoctor } from "@/lib/careLink";

const ACTIONS = {
  accept: acceptLink,
  decline: declineLink,
  end: endLinkByDoctor,
} as const;

type Action = keyof typeof ACTIONS;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const doctor = await getCurrentDoctor();
  if (!doctor) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const run = ACTIONS[body.action as Action];
  if (!run) return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });

  try {
    const link = await run(doctor.id, params.id);
    return NextResponse.json({ ok: true, status: link.status });
  } catch (e) {
    if (e instanceof CareLinkError) {
      return NextResponse.json({ error: e.message }, { status: e.httpStatus });
    }
    throw e;
  }
}
