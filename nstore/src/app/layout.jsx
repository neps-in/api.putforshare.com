import "./tailwind.css";
import ClientShell from "@/components/ClientShell";

export const metadata = {
  title: "Put For Share Store",
  description: "Pre-loved books and essentials storefront"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-slate-100 text-slate-900 antialiased">
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
