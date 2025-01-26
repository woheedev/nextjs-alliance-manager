import { createTheme } from "@mantine/core";

export const theme = createTheme({
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
});
