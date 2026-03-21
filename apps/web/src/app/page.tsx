import { redirect } from "next/navigation";

export default function RootPage() {
  // TODO: check auth status, redirect to /login if unauthenticated
  redirect("/dashboard");
}
