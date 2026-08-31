import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@tishacare/db";
import { getCurrentDoctor } from "@/lib/session";
import { isClinicAdmin, isDoctorRole } from "@/lib/doctorRole";

// A clinic admin promotes a colleague to admin or steps one back to member.
// The clinic must never be left without an admin.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const doctor = await getCurrentDoctor();
  if (!doctor) return NextResponse.json({ error: "Не авторизованы" }, { status: 401 });
  if (!isClinicAdmin(doctor)) {
    return NextResponse.json({ error: "Доступно только администратору клиники" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const role = body.role;
  if (!isDoctorRole(role)) {
    return NextResponse.json({ error: "Недопустимая роль" }, { status: 400 });
  }

  const target = await prisma.doctor.findFirst({
    where: { id: params.id, clinicId: doctor.clinicId },
  });
  if (!target) return NextResponse.json({ error: "Врач не найден" }, { status: 404 });

  if (role === "member" && target.role === "admin") {
    const adminCount = await prisma.doctor.count({
      where: { clinicId: doctor.clinicId, role: "admin" },
    });
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "В клинике должен остаться хотя бы один администратор" },
        { status: 409 }
      );
    }
  }

  await prisma.doctor.update({ where: { id: target.id }, data: { role } });
  return NextResponse.json({ ok: true, role });
}
