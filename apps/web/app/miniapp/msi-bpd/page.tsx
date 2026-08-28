import { MSI_BPD_DEF } from "@tishacare/db/client";
import QuestionnaireRunner from "@/components/patient/QuestionnaireRunner";

export default function Page() {
  return <QuestionnaireRunner def={MSI_BPD_DEF} />;
}
