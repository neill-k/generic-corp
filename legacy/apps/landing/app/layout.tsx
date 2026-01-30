import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Generic Corp - Orchestrate Teams of AI Agents Visually",
  description: "Build, deploy, and manage multi-agent AI systems with a platform that makes complexity intuitive. From prototype to production in minutes.",
  keywords: ["AI agents", "multi-agent systems", "agent orchestration", "CLI agent runtime", "visual AI platform"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
