import { redirect } from "next/navigation";

export default function OrganizationPage() {
  // Unify organization routes by redirecting legacy dashboard page
  // to the new centralized organization hierarchy.
  redirect("/organization/business");
}