import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Prowider - Lead Distribution System",
  description: "Automated, fair lead distribution system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <Navbar />
          <div className="page-wrapper">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
