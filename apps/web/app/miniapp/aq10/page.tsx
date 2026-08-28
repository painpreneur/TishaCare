import { AQ10_DEF } from "@tishacare/db/client";
import QuestionnaireRunner from "@/components/patient/QuestionnaireRunner";

export default function Page() {
  return <QuestionnaireRunner def={AQ10_DEF} />;
}
