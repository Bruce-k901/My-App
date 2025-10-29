import { redirect } from "next/navigation";

export default function SFBBLibraryRedirectPage() {
  // Redirect legacy /library or SFBB library route to /dashboard/compliance-templates
  redirect("/dashboard/compliance-templates");
}
