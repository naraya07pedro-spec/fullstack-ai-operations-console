import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Operations Console | Workflow control',
  description: 'Create, approve, and inspect sandbox workflow executions.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
