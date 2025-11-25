import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";

// Load fonts with CSS variables for consistent typography across the app
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], display: "swap", variable: "--font-mono" });
const serif = Source_Serif_4({ subsets: ["latin"], display: "swap", variable: "--font-serif" });

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={true}
      disableTransitionOnChange={false}
    >
      {/* Apply font variables globally */}
      <div className={`${inter.variable} ${mono.variable} ${serif.variable}`}>
        <Component {...pageProps} />
        <Toaster />
      </div>
    </ThemeProvider>
  );
}
