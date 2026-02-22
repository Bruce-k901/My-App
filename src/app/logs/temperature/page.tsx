import { redirect } from "next/navigation";

export default function TemperatureLogsRedirectPage() {
  // Redirect legacy /logs/temperature route to new dashboard location
  redirect("/dashboard/logs/temperature");
}
