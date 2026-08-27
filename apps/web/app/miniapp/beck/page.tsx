import { BECK_DEF } from "@tishacare/db/client";
import QuestionnaireRunner from "@/components/patient/QuestionnaireRunner";

export default function BeckPage() {
  return <QuestionnaireRunner def={BECK_DEF} />;
}
