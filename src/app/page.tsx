"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

export default function Root() {
  const { ready, state, cloud, session } = useStore();
  const router = useRouter();
  useEffect(() => {
    if (!ready) return;
    if (!state.profile.onboarded) router.replace("/welcome");
    else if (cloud && !session) router.replace("/login");
    else router.replace("/home");
  }, [ready, state.profile.onboarded, cloud, session, router]);
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <p className="font-display text-[28px] gold-text">Opulent</p>
    </div>
  );
}
