import "@mantine/core/styles.css";
import { MantineProvider, ColorSchemeScript, Container } from "@mantine/core";
import { Header } from "./components/layout/Header";

export const metadata = {
  title: "VOD Tracker",
  description: "Track VODs and gear for members",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
        />
      </head>
      <body>
        <MantineProvider defaultColorScheme="dark">
          <div style={{ padding: "md" }}>
            <Header />
            <Container fluid>{children}</Container>
          </div>
        </MantineProvider>
      </body>
    </html>
  );
}
