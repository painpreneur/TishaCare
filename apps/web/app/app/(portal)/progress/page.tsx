import DamScene from "@/components/patient/DamScene";
import ProgressChart from "@/components/patient/ProgressChart";
import UnlocksList from "@/components/patient/UnlocksList";

export default function AppProgressPage() {
  return (
    <>
      <ProgressChart />
      <DamScene size="full" />
      <UnlocksList />
    </>
  );
}
