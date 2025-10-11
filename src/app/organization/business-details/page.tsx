import { redirect } from "next/navigation";

export default function BusinessDetailsLegacyRedirect() {
  redirect("/organization/business");
}