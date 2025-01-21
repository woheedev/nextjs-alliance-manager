import { LoadingOverlay as MantineLoadingOverlay } from "@mantine/core";

function LoadingOverlay() {
  return (
    <MantineLoadingOverlay
      visible={true}
      zIndex={1000}
      overlayProps={{ blur: 2 }}
    />
  );
}

export default LoadingOverlay;
