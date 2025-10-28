import { redirect } from "next/navigation";

export default function DashboardContractorsPage() {
  // Redirect to the main organization contractors page
  redirect("/organization/contractors");
}
