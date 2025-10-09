import { Suspense } from "react";
import NewPasswordClient from "./NewPasswordClient";

// This disables all static generation and tells Next it’s purely dynamic
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default function NewPasswordPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <NewPasswordClient />
    </Suspense>
  );
}