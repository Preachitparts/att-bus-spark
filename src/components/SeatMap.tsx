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

// Realistic 32-seat bus layout with driver area
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
    <div className="w-full max-w-md mx-auto">
      <div className="rounded-lg border p-3 sm:p-4 bg-card shadow-sm">
        {/* Bus Front - Driver Area */}
        <div className="mb-4 pb-3 border-b border-dashed border-muted-foreground/30">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground font-medium">FRONT</div>
            <div className="text-xs text-muted-foreground">Driver</div>
          </div>
          <div className="mt-2 flex justify-end">
            {/* Steering Wheel */}
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-muted-foreground/40 bg-muted/60 flex items-center justify-center">
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-muted-foreground/60"></div>
            </div>
          </div>
        </div>

        {/* Passenger Seats */}
        <div className="space-y-2 sm:space-y-3">
          {layout.map((row, idx) => (
            <div key={idx} className="flex items-center justify-between gap-2 sm:gap-3">
              {/* Left pair */}
              <div className="flex gap-1 sm:gap-2">
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
              <div className="flex-1 h-8 sm:h-10 bg-gradient-to-r from-muted/40 via-muted/20 to-muted/40 rounded-full relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-px bg-muted-foreground/20"></div>
                </div>
              </div>
              
              {/* Right pair */}
              <div className="flex gap-1 sm:gap-2">
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

        {/* Bus Back */}
        <div className="mt-4 pt-3 border-t border-dashed border-muted-foreground/30">
          <div className="text-xs text-muted-foreground font-medium text-center">BACK</div>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t">
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
            <Legend color="bg-primary text-primary-foreground" label="Selected" />
            <Legend color="bg-accent hover:bg-accent/80" label="Available" />
            <Legend color="bg-muted text-muted-foreground" label="Inactive" />
            <Legend color="bg-destructive text-destructive-foreground" label="Taken" />
          </div>
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
  
  let className = "w-8 h-8 sm:w-10 sm:h-10 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 flex items-center justify-center border";
  
  if (selected) {
    className += " bg-primary text-primary-foreground border-primary shadow-md scale-105";
  } else if (disabled) {
    if (!seat.is_active) {
      className += " bg-muted text-muted-foreground border-muted cursor-not-allowed opacity-60";
    } else {
      className += " bg-destructive text-destructive-foreground border-destructive cursor-not-allowed";
    }
  } else {
    className += " bg-accent hover:bg-accent/80 text-accent-foreground border-accent hover:scale-105 cursor-pointer";
  }

  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      onClick={onClick}
    >
      {seat.seat_number}
    </button>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <span className={`h-3 w-3 sm:h-4 sm:w-4 rounded-sm ${color} border`} />
      <span className="text-xs">{label}</span>
    </div>
  );
}