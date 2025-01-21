import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App, { OAuthCallback } from "./App";
import Statics from "./components/Statics";
import "./index.css";
import "@mantine/core/styles.css";
import { DataProvider } from "./lib/DataContext";

const theme = {
  primaryColor: "indigo",
  colors: {
    dark: [
      "#C1C2C5",
      "#A6A7AB",
      "#909296",
      "#5C5F66",
      "#373A40",
      "#2C2E33",
      "#25262B",
      "#1A1B1E",
      "#141517",
      "#101113",
    ],
  },
  fontFamily: "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif",
  defaultRadius: "md",
  black: "#1A1B1E",
  components: {
    Table: {
      defaultProps: {
        highlightOnHover: true,
        withTableBorder: true,
        withColumnBorders: true,
      },
    },
  },
};

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/statics",
    element: <Statics />,
  },
  {
    path: "/callback",
    element: <OAuthCallback />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <QueryClientProvider client={queryClient}>
        <DataProvider>
          <RouterProvider router={router} />
        </DataProvider>
      </QueryClientProvider>
    </MantineProvider>
  </React.StrictMode>
);
