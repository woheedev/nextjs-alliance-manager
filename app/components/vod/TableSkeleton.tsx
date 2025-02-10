import { Table, Box, Text, Skeleton } from "@mantine/core";
import type { TableSkeletonProps } from "@/app/types/components";

export function TableSkeleton({ rows = 10, columns = 12 }: TableSkeletonProps) {
  return (
    <Table stickyHeader highlightOnHover withTableBorder>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Discord Username</Table.Th>
          <Table.Th>In-game Name</Table.Th>
          <Table.Th>Guild</Table.Th>
          <Table.Th>Primary</Table.Th>
          <Table.Th>Secondary</Table.Th>
          <Table.Th>Ticket</Table.Th>
          <Table.Th>Thread</Table.Th>
          <Table.Th>VOD</Table.Th>
          <Table.Th>Checked</Table.Th>
          <Table.Th>Gear</Table.Th>
          <Table.Th>Checked</Table.Th>
          <Table.Th>CP</Table.Th>
          <Table.Th>Notes</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {Array(rows)
          .fill(0)
          .map((_, i) => (
            <Table.Tr key={i}>
              {Array(columns)
                .fill(0)
                .map((_, j) => (
                  <Table.Td key={j}>
                    <Skeleton
                      height={j === 11 ? 32 : 20}
                      width={j === 11 ? "100%" : j === 10 ? 75 : "100%"}
                    />
                  </Table.Td>
                ))}
            </Table.Tr>
          ))}
      </Table.Tbody>
    </Table>
  );
}
