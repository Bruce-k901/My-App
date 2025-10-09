export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import { Suspense } from "react";
import NewPasswordClient from "./NewPasswordClient";

export default function NewPasswordPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <NewPasswordClient />
    </Suspense>
  );
}