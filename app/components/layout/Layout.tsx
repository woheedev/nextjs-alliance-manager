"use client";

import { Container } from "@mantine/core";
import { Header } from "./Header";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main>
        <Container fluid py="md">
          {children}
        </Container>
      </main>
    </>
  );
}
