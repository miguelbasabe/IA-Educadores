import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Práctica IA | Escuela",
  description: "Un espacio para practicar IA en tu trabajo real.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
