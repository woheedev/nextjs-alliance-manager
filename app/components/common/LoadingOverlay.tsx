import { Box, LoadingOverlay as MantineLoadingOverlay } from "@mantine/core";

export function LoadingOverlay() {
  return (
    <Box pos="fixed" top={0} left={0} right={0} bottom={0} bg="dark.7">
      <MantineLoadingOverlay
        visible={true}
        zIndex={1000}
        overlayProps={{ radius: "sm", blur: 2 }}
        loaderProps={{ size: "xl", color: "indigo" }}
      />
    </Box>
  );
}
