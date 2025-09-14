import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Tech Trends",
  description: "What kind of tech skills are currently in demand?",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script defer data-domain="koodaripula.fi" src="http://analytics.bittive.com/js/script.js"></script>
      </head>
      <body className={`${inter.className} bg-slate-800 container mx-auto p-4`}>{children}</body>
    </html>
  );
}
