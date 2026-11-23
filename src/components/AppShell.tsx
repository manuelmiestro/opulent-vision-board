"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { cx } from "@/lib/utils";
import { BoardIcon, ChartIcon, GoalIcon, HomeIcon, JournalIcon } from "./icons";
import { Skeleton } from "./ui";

const NAV = [
  { href: "/home", label: "Home", Icon: HomeIcon },
  { href: "/board", label: "Board", Icon: BoardIcon },
  { href: "/goals", label: "Goals", Icon: GoalIcon },
  { href: "/journal", label: "Journal", Icon: JournalIcon },
  { href: "/progress", label: "Progress", Icon: ChartIcon },
];

/** Wraps every signed-in screen: guards onboarding and auth, and draws the bottom navigation. */
export function AppShell({ children, feature, bare }: { children: ReactNode; feature?: string; bare?: boolean }) {
  const { ready, state, cloud, session, track, storageError } = useStore();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (!state.profile.onboarded) router.replace("/welcome");
    else if (cloud && !session) router.replace("/login");
  }, [ready, state.profile.onboarded, cloud, session, router]);

  useEffect(() => {
    if (ready && feature) track(feature);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, feature]);

  useEffect(() => {
    document.documentElement.classList.toggle("ivory", state.profile.theme === "ivory");
  }, [state.profile.theme]);

  const blocked = !ready || !state.profile.onboarded || (cloud && !session);

  return (
    <div className="mx-auto min-h-dvh w-full max-w-2xl">
      <main className={cx("px-5 pt-[calc(env(safe-area-inset-top)+16px)]", !bare && "safe-bottom")}>
        {storageError && <p className="mb-4 rounded-xl border border-rose/40 bg-rose/10 px-4 py-3 text-[13px] text-rose">{storageError}</p>}
        {blocked ? (
          <div className="space-y-4 pt-6">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-40" />
            <Skeleton className="h-28" />
          </div>
        ) : (
          children
        )}
      </main>
      {!bare && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl" aria-label="Main">
          <ul className="mx-auto flex max-w-2xl justify-around">
            {NAV.map(({ href, label, Icon }) => {
              const active = path === href || path.startsWith(href + "/");
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cx("flex min-h-[60px] min-w-[60px] flex-col items-center justify-center gap-1 text-[11px] transition", active ? "text-gold" : "text-faint hover:text-muted")}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon width={22} height={22} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
