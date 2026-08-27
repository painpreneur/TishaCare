import { NextRequest, NextResponse } from "next/server";
import { resolveMiniAppPatient } from "@/lib/telegramAuth";
import { CareLinkError, pauseLink, resumeLink, beginEnd, cancelEnd } from "@/lib/careLink";

const ACTIONS = {
  pause: pauseLink,
  resume: resumeLink,
  end: beginEnd,
  "cancel-end": cancelEnd,
} as const;

type Action = keyof typeof ACTIONS;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await resolveMiniAppPatient(req);
  if (!auth) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = body.action as Action;
  const run = ACTIONS[action];
  if (!run) return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });

  try {
    const link = await run(auth.patientId, params.id);
    return NextResponse.json({ ok: true, status: link.status, endsAt: link.endsAt });
  } catch (e) {
    if (e instanceof CareLinkError) {
      return NextResponse.json({ error: e.message }, { status: e.httpStatus });
    }
    throw e;
  }
}
