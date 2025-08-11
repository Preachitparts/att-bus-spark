import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";

export type SeatStatus = {
  seat_number: number;
  is_active: boolean;
  status: "available" | "taken";
};

interface SeatMapProps {
  seats: SeatStatus[];
  selectedSeat?: number | null;
  onSelect: (seat: number) => void;
}

// Simple 32-seat layout: 4 columns with an aisle in the middle (2-aisle-2)
// Rows of 4: seats 1-4, 5-8, ...
export function SeatMap({ seats, selectedSeat, onSelect }: SeatMapProps) {
  const layout = useMemo(() => {
    const rows: SeatStatus[][] = [];
    const sorted = [...seats].sort((a, b) => a.seat_number - b.seat_number);
    for (let i = 0; i < sorted.length; i += 4) {
      rows.push(sorted.slice(i, i + 4));
    }
    return rows;
  }, [seats]);

  useEffect(() => {
    // no-op for now
  }, []);

  return (
    <div className="w-full">
      <div className="rounded-lg border p-4 bg-card">
        <div className="grid gap-3">
          {layout.map((row, idx) => (
            <div key={idx} className="grid grid-cols-5 gap-3 items-center">
              {/* Left pair */}
              <div className="grid grid-cols-2 gap-3">
                {row.slice(0, 2).map((s) => (
                  <SeatButton
                    key={s.seat_number}
                    seat={s}
                    selected={selectedSeat === s.seat_number}
                    onClick={() => onSelect(s.seat_number)}
                  />
                ))}
              </div>
              {/* Aisle */}
              <div className="h-10 bg-muted/60 rounded-full" />
              {/* Right pair */}
              <div className="grid grid-cols-2 gap-3">
                {row.slice(2, 4).map((s) => (
                  <SeatButton
                    key={s.seat_number}
                    seat={s}
                    selected={selectedSeat === s.seat_number}
                    onClick={() => onSelect(s.seat_number)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <Legend color="bg-primary/90" label="Selected" />
          <Legend color="bg-accent" label="Available" />
          <Legend color="bg-muted" label="Inactive" />
          <Legend color="bg-destructive" label="Taken" />
        </div>
      </div>
    </div>
  );
}

function SeatButton({
  seat,
  selected,
  onClick,
}: {
  seat: SeatStatus;
  selected: boolean;
  onClick: () => void;
}) {
  const disabled = !seat.is_active || seat.status === "taken";
  const variant = selected
    ? ("default" as const)
    : disabled
    ? ("secondary" as const)
    : ("outline" as const);

  return (
    <Button
      type="button"
      variant={selected ? "default" : "outline"}
      className={
        selected
          ? "bg-primary text-primary-foreground"
          : disabled
          ? "pointer-events-none bg-muted text-muted-foreground"
          : ""
      }
      disabled={disabled}
      onClick={onClick}
    >
      {seat.seat_number}
    </Button>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded-sm ${color}`} />
      <span>{label}</span>
    </div>
  );
}
