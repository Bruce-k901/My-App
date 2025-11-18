import { redirect } from "next/navigation";

export default function OrganizationUsersRedirect() {
  redirect("/dashboard/users");
}

