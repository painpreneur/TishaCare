"use client";

// On-screen only (hidden by @media print). "Печать" opens the browser's print
// dialog, from which the doctor saves this exact page as PDF. "CSV" downloads a
// flat table dump for import into a clinic EHR.
export default function PatientRecordToolbar({
  backHref,
  csvHref,
}: {
  backHref: string;
  csvHref: string;
}) {
  return (
    <div className="record-toolbar no-print">
      <a href={backHref} className="link-btn">
        ← К карточке пациента
      </a>
      <a href={csvHref} className="btn-primary btn-inline" download>
        Скачать CSV
      </a>
      <button type="button" className="btn-primary btn-inline" onClick={() => window.print()}>
        Печать / Сохранить в PDF
      </button>
    </div>
  );
}
