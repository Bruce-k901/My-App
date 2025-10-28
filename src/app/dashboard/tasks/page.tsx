import { redirect } from "next/navigation";

export default function TasksPage() {
  // Redirect to templates by default
  redirect("/dashboard/tasks/templates");
}