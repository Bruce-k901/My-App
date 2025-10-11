import { redirect } from "next/navigation";

export default function OrganizationRootRedirect() {
  redirect("/organization/business");
}