import "./globals.css";
import GlassNavbar from "@/components/GlassNavbar";
import { CartProvider } from "@/components/CartContext";
import Chatbot from "@/components/Chatbot";

export const metadata = {
  title: "Last Bite - Zero Food Waste, Surplus Food Rescue",
  description: "Rescue surplus meals from local restaurants, groceries, and cafes. Every last bite counts — eliminate food waste today.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const stored = localStorage.getItem('decarb_theme');
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  const theme = stored || (prefersDark ? 'dark' : 'light');
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <CartProvider>
          <GlassNavbar />
          {children}
          <Chatbot />
        </CartProvider>
      </body>
    </html>
  );
}
