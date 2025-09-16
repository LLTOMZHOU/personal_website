import type { Metadata } from "next";
import "./globals.css";
import "@/components/prose.css";

export const metadata: Metadata = {
  title: "Yuxing Zhou",
  description: "Personal site",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <header className="mb-10 flex items-baseline justify-between">
            <a href="/" className="text-2xl font-bold">
              Yuxing Zhou
            </a>
            <nav className="space-x-5 text-sm">
              <a href="/projects">Projects</a>
              <a href="/writing">Writing</a>
              <a href="/photography">Photography</a>
              <a href="/about">About</a>
            </nav>
          </header>
          {children}
          <footer className="mt-16 border-t pt-6 text-xs">
            © {new Date().getFullYear()} • Built with Next.js
          </footer>
        </div>
      </body>
    </html>
  );
}
