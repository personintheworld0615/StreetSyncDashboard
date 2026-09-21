import type { Metadata } from "next";
import { Geist_Mono, Inter, Nunito } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StreetSync — Municipal Ops",
  description:
    "Triage citizen infrastructure reports: queue, map, and heatmap for municipal admins.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${nunito.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full font-sans text-foreground">{children}</body>
    </html>
  );
}
