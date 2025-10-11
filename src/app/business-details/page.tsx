import { redirect } from "next/navigation";

export default function LegacyBusinessDetailsRedirectPage() {
  redirect("/organization/business");
}