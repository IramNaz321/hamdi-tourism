import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Hamdi Tourism | UAE Airport Transfers & Chauffeur Services",
    template: "%s | Hamdi Tourism",
  },
  description:
    "Airport transfers and private chauffeur services in the United Arab Emirates. Arrange your journey with Hamdi Tourism.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-4"
        >
          Skip to content
        </a>
        <div id="main-content">{children}</div>
      </body>
    </html>
  );
}
