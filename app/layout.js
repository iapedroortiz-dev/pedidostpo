import './globals.css';

export const metadata = {
  title: 'Pedidos PO',
  description: 'Gestión segura de pedidos'
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}