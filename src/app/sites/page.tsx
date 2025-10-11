import { redirect } from "next/navigation";

export default function SitesRootRedirect() {
  redirect("/organization/sites");
}