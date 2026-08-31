import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tishacare/db";
import { getCurrentDoctor, destroyAllSessionsForDoctor } from "@/lib/session";
import { isClinicAdmin, isDoctorRole } from "@/lib/doctorRole";

// A clinic admin manages a colleague: role (admin <-> member) or activation
// (deactivate / reactivate). The clinic must always keep at least one active
// admin, and an admin cannot act on their own account here.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const doctor = await getCurrentDoctor();
  if (!doctor) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  if (!isClinicAdmin(doctor)) {
    return NextResponse.json({ error: "Доступно только администратору клиники" }, { status: 403 });
  }

  const target = await prisma.doctor.findFirst({
    where: { id: params.id, clinicId: doctor.clinicId },
  });
  if (!target) return NextResponse.json({ error: "Врач не найден" }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  // ── activation ──────────────────────────────────────────────────────────
  if (body.action === "deactivate" || body.action === "reactivate") {
    if (target.id === doctor.id) {
      return NextResponse.json({ error: "Нельзя отключить собственный аккаунт" }, { status: 409 });
    }

    if (body.action === "deactivate") {
      if (target.deactivatedAt) return NextResponse.json({ ok: true });
      if (target.role === "admin") {
        const activeAdmins = await prisma.doctor.count({
          where: { clinicId: doctor.clinicId, role: "admin", deactivatedAt: null },
        });
        if (activeAdmins <= 1) {
          return NextResponse.json(
            { error: "В клинике должен остаться хотя бы один активный администратор" },
            { status: 409 }
          );
        }
      }
      await prisma.doctor.update({ where: { id: target.id }, data: { deactivatedAt: new Date() } });
      await destroyAllSessionsForDoctor(target.id);
      return NextResponse.json({ ok: true });
    }

    await prisma.doctor.update({ where: { id: target.id }, data: { deactivatedAt: null } });
    return NextResponse.json({ ok: true });
  }

  // ── role ────────────────────────────────────────────────────────────────
  const role = body.role;
  if (!isDoctorRole(role)) {
    return NextResponse.json({ error: "Недопустимая роль" }, { status: 400 });
  }

  if (role === "member" && target.role === "admin") {
    const activeAdmins = await prisma.doctor.count({
      where: { clinicId: doctor.clinicId, role: "admin", deactivatedAt: null },
    });
    if (activeAdmins <= 1) {
      return NextResponse.json(
        { error: "В клинике должен остаться хотя бы один администратор" },
        { status: 409 }
      );
    }
  }

  await prisma.doctor.update({ where: { id: target.id }, data: { role } });
  return NextResponse.json({ ok: true, role });
}
