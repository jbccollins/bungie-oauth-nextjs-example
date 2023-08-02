import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bungie OAuth Next.js Example",
  description: "A bare bones example of using Bungie OAuth with Next.js",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div
          style={{
            margin: "auto",
            width: "50%",
            textAlign: "center",
            marginTop: "40px",
          }}
        >
          {children}
        </div>
      </body>
    </html>
  );
}
