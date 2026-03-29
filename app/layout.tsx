import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/lexinote/theme-provider";
import { RetroShell } from "@/components/lexinote/retro-shell";

const displayFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

const uiFont = Manrope({
  subsets: ["latin"],
  variable: "--font-ui",
});

const themeBootScript = `
  try {
    var theme = localStorage.getItem("lexinote-theme");
    if (theme) {
      document.documentElement.dataset.theme = theme;
    }
  } catch (error) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${displayFont.variable} ${uiFont.variable}`}>
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <ThemeProvider>
          <RetroShell>{children}</RetroShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
