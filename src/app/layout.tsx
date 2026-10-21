import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DAYDAY Management System | DAYDAY SPARKLE AND SHINE CLEANING SERVICE",
  description: "Satisfaction Guaranteed. Enterprise business operations, field cleaning management, and accounting system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
