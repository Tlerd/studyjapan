import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Học tiếng Nhật Kanji Mạng Nhện",
  description: "Học tiếng Nhật theo Kanji, mảnh LEGO và Mạng Nhện liên kết ngữ cảnh",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const saved = localStorage.getItem("theme");
                if (saved === "dark") {
                  document.documentElement.setAttribute("data-theme", "dark");
                } else if (saved === "light") {
                  document.documentElement.setAttribute("data-theme", "light");
                }
              } catch (e) {}
            `,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Noto+Sans+JP:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-bg text-text antialiased">
        {children}
      </body>
    </html>
  );
}
