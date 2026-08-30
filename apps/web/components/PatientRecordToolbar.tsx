"use client";

// On-screen only (hidden by @media print). "Печать" opens the browser's print
// dialog, from which the doctor can "Сохранить как PDF".
export default function PatientRecordToolbar({ backHref }: { backHref: string }) {
  return (
    <div className="record-toolbar no-print">
      <a href={backHref} className="link-btn">
        ← К карточке пациента
      </a>
      <button type="button" className="btn-primary btn-inline" onClick={() => window.print()}>
        Печать / Сохранить в PDF
      </button>
    </div>
  );
}
