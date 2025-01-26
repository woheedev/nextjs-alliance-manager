import { Select, Paper, Group, TextInput, Switch, Box } from "@mantine/core";
import type { FiltersProps, FilterValues } from "@/app/types/components";

export function Filters({
  onFilterChange,
  uniqueValues,
  disabled,
}: FiltersProps) {
  const handleFilterChange = (
    field: keyof FilterValues,
    value: string | boolean
  ) => {
    onFilterChange((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Paper p="lg" withBorder>
      <Group justify="center" gap="md" wrap="wrap">
        <TextInput
          placeholder="Search by Name"
          onChange={(e) => handleFilterChange("nameSearch", e.target.value)}
          w={200}
          disabled={disabled}
        />
        <Select
          data={[
            { value: "", label: "All Guilds" },
            ...uniqueValues.guilds.map((g) => ({ value: g, label: g })),
          ]}
          placeholder="Filter by Guild"
          onChange={(value) => handleFilterChange("guild", value || "")}
          searchable
          clearable
          w={200}
          disabled={disabled}
        />
        <Select
          data={[
            { value: "", label: "All Primary" },
            ...uniqueValues.primaryWeapons.map((w) => ({ value: w, label: w })),
          ]}
          placeholder="Filter by Primary"
          onChange={(value) =>
            handleFilterChange("primary_weapon", value || "")
          }
          searchable
          clearable
          w={200}
          disabled={disabled}
        />
        <Select
          data={[
            { value: "", label: "All Secondary" },
            ...uniqueValues.secondaryWeapons.map((w) => ({
              value: w,
              label: w,
            })),
          ]}
          placeholder="Filter by Secondary"
          onChange={(value) =>
            handleFilterChange("secondary_weapon", value || "")
          }
          searchable
          clearable
          w={200}
          disabled={disabled}
        />
        <Select
          data={[
            { value: "", label: "All Tickets" },
            { value: "true", label: "Has Ticket" },
            { value: "false", label: "No Ticket" },
          ]}
          placeholder="Filter by Ticket"
          onChange={(value) => handleFilterChange("has_thread", value || "")}
          clearable
          w={200}
          disabled={disabled}
        />
        <Box
          w={200}
          display="flex"
          style={{ alignItems: "center", justifyContent: "center" }}
        >
          <Switch
            label="Show Editable Only"
            onChange={(e) =>
              handleFilterChange("showEditable", e.currentTarget.checked)
            }
            disabled={disabled}
          />
        </Box>
      </Group>
    </Paper>
  );
}
