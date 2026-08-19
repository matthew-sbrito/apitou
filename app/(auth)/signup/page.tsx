import { sanitizeNextPath } from "@/lib/auth/next-path";
import { SignupForm } from "./signup-form";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return <SignupForm next={sanitizeNextPath(next)} />;
}
