import DamScene from "@/components/patient/DamScene";
import ProgressChart from "@/components/patient/ProgressChart";

export default function ProgressPage() {
  return (
    <>
      <ProgressChart />
      <DamScene size="full" />
    </>
  );
}
