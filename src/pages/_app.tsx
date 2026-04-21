import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], display: "swap", variable: "--font-mono" });
const serif = Source_Serif_4({ subsets: ["latin"], display: "swap", variable: "--font-serif" });

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`${inter.variable} ${mono.variable} ${serif.variable}`}>
      <Component {...pageProps} />
    </div>
  );
}
