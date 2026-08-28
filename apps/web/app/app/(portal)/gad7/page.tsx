import { GAD7_DEF } from "@tishacare/db/client";
import QuestionnaireRunner from "@/components/patient/QuestionnaireRunner";

export default function Page() {
  return <QuestionnaireRunner def={GAD7_DEF} />;
}
