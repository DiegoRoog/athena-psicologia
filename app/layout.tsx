import type { Metadata } from 'next';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-400-italic.css';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/pinyon-script/latin-400.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'ATHENA PSICOLOGIA — Um olhar para dentro',
  description: 'Um espaço de escuta, reflexão e autoconhecimento. Experiência conceitual de psicologia e filosofia, criada para portfólio.',
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
