import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Launch Level 2 Food Hygiene",
};

export default function LegacyLaunchFoodSafetyCoursePage() {
  redirect("/training/courses/l2-food-hygiene/start");
}


