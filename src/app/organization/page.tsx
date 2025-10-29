import { redirect } from "next/navigation";

export default function OrganizationRootPage() {
  // Redirect organization root to business details (first organization page)
  redirect("/dashboard/business");
}