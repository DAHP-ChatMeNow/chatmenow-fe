import { Montserrat, Roboto } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/providers/query-provider";
import { SocketProvider } from "@/components/providers/socket-provider";
import { VideoCallProvider } from "@/components/providers/video-call-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { LanguageProvider } from "@/contexts/language-context";

const montserrat = Montserrat({
  subsets: ["latin", "vietnamese"],
  variable: "--font-montserrat",
  display: "swap",
});

const roboto = Roboto({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${montserrat.variable} ${roboto.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LanguageProvider>
            <QueryProvider>
              <SocketProvider>
                <VideoCallProvider>
                  <div className="w-full min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
                    {children}
                    <Toaster position="top-right" richColors />
                  </div>
                </VideoCallProvider>
              </SocketProvider>
            </QueryProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
