import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { AppBootstrap } from "@/components/AppBootstrap";
import { ExtensionBridge } from "@/components/ExtensionBridge";
import { ToastViewport } from "@/components/ui/Toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const space = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — Mission control for your time`,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_TAGLINE,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${space.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <AppBootstrap />
        <ExtensionBridge />
        {children}
        <ToastViewport />
      </body>
    </html>
  );
}
