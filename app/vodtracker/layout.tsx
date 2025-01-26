import { Metadata } from "next";

export const metadata: Metadata = {
  title: "VOD Tracker",
};

export default function VodTrackerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
