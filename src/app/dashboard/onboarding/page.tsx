import { redirect } from 'next/navigation'

// Backwards-compatible alias (emails/old links). The Peoplely version lives under `/dashboard/people/onboarding`.
export default function OnboardingAliasPage() {
  redirect('/dashboard/people/onboarding')
}
