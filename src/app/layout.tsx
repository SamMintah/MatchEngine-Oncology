import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Clinical Trial Patient Match Co-Pilot',
  description: 'AI-powered clinical trial patient matching dashboard',
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => (
  <html lang="en">
    <body className="antialiased">
      {children}
    </body>
  </html>
);

export default RootLayout;
