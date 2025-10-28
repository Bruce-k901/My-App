import { redirect } from "next/navigation";

export default function SOPsPage() {
  // Redirect to templates by default
  redirect("/dashboard/sops/templates");
}
