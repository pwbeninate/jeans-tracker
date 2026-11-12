import { JeansTable } from "@/components/jeans-table";

export default function TablePage() {
  // `data-wide` lets the shared layout widen its container for this page.
  return (
    <div data-wide>
      <JeansTable />
    </div>
  );
}
