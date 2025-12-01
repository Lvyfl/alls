import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";
import { ThemeProvider } from "@/components/accessibility/theme-provider";
import { ToastProvider } from "@/components/ui/toast-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ALS Student Tracker",
  description: "Alternative Learning System Student Tracker Application",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Get stored accessibility settings
                  const stored = localStorage.getItem('als-accessibility-settings');
                  if (stored) {
                    const settings = JSON.parse(stored);
                    const state = settings.state || {};

                    // Apply theme
                    if (state.theme) {
                      document.documentElement.setAttribute('data-theme', state.theme);
                      if (state.theme === 'dark') {
                        document.documentElement.classList.add('dark');
                      }
                    }

                    // Apply font scale
                    if (state.fontSize) {
                      const scales = { normal: 1, large: 1.2, 'extra-large': 1.4 };
                      const scale = scales[state.fontSize] || 1;
                      document.documentElement.style.setProperty('--font-scale', scale.toString());
                    }
                  }
                } catch (e) {
                  // Silently fail if localStorage is not available or data is corrupted
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <ToastProvider>
            <Providers>{children}</Providers>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
