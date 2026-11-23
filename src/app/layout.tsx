import type { Metadata, Viewport } from "next";
import { StoreProvider } from "@/lib/store";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Opulent Vision Board", template: "%s · Opulent Vision Board" },
  description: "Turn your vision into daily action with living vision boards, personalized AI affirmations, goals and reflection.",
  applicationName: "Opulent Vision Board",
  appleWebApp: { capable: true, title: "Opulent", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0D0D0D",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>{children}</StoreProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
