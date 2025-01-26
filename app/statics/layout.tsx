import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Statics",
};

export default function StaticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
