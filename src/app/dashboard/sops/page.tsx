import { redirect } from "next/navigation";

export default function SOPsPage() {
  // Redirect to My SOPs page by default
  redirect("/dashboard/sops/list");
}
