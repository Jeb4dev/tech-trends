import { useState, useRef, useCallback, useEffect } from "react";
import { Results } from "@/types";

// Custom dual-thumb date range slider replacing react-slider
export const Slider = (props: { min: Date; filteredData: Results[]; filterByDate: (min: Date, max: Date) => void; initialMinDate?: Date | null; initialMaxDate?: Date | null; }) => {
  const { min, filterByDate, initialMinDate, initialMaxDate } = props;
  const max = new Date();
  const totalDays = Math.max(1, Math.floor((max.getTime() - min.getTime()) / (1000 * 3600 * 24)));

  const [range, setRange] = useState<[number, number]>([0, totalDays]);
  const commitTimer = useRef<NodeJS.Timeout | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState<null | 'min' | 'max'>(null);

  const toDate = useCallback((offsetDays: number) => new Date(min.getTime() + offsetDays * 24 * 3600 * 1000), [min]);

  const clamp = useCallback((val: number) => Math.min(Math.max(val, 0), totalDays), [totalDays]);
  const pct = useCallback((day: number) => (day / totalDays) * 100, [totalDays]);

  // Convert pixel position to day offset
  const posToDay = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    return clamp(Math.round(ratio * totalDays));
  }, [clamp, totalDays]);

  const commitRange = useCallback(() => {
    const [start, end] = range;
    filterByDate(toDate(start), toDate(end));
  }, [range, filterByDate, toDate]);

  const scheduleCommit = useCallback(() => {
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(commitRange, 300);
  }, [commitRange]);

  const onRelease = useCallback(() => {
    if (commitTimer.current) {
      clearTimeout(commitTimer.current);
      commitTimer.current = null;
    }
    commitRange();
  }, [commitRange]);

  function onMinChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newMin = clamp(parseInt(e.target.value, 10));
    if (newMin >= range[1]) return; // maintain gap of at least 1 day
    setRange([newMin, range[1]]);
    scheduleCommit();
  }
  function onMaxChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newMax = clamp(parseInt(e.target.value, 10));
    if (newMax <= range[0]) return;
    setRange([range[0], newMax]);
    scheduleCommit();
  }

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      const day = posToDay(e.clientX);
      setRange(([minDay, maxDay]) => {
        if (dragging === 'min') {
          if (day >= maxDay) return [minDay, maxDay];
          return [day, maxDay];
        } else {
          if (day <= minDay) return [minDay, maxDay];
          return [minDay, day];
        }
      });
      scheduleCommit();
    };
    const up = () => {
      setDragging(null);
      onRelease();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [dragging, posToDay, scheduleCommit, onRelease]);

  const initializedFromUrl = useRef(false);
  useEffect(() => {
    if (initializedFromUrl.current) return;
    if (!initialMinDate && !initialMaxDate) return; // nothing to init
    const startDate = initialMinDate && !isNaN(initialMinDate.getTime()) ? initialMinDate : toDate(range[0]);
    const endDate = initialMaxDate && !isNaN(initialMaxDate.getTime()) ? initialMaxDate : toDate(range[1]);
    // Clamp inside bounds
    const startOffset = clamp(Math.floor((startDate.getTime() - min.getTime()) / (24 * 3600 * 1000)));
    const endOffset = clamp(Math.floor((endDate.getTime() - min.getTime()) / (24 * 3600 * 1000)));
    if (startOffset < endOffset) {
      setRange([startOffset, endOffset]);
      initializedFromUrl.current = true;
      // Do not call filterByDate here, URL already reflects state
    }
  }, [initialMinDate, initialMaxDate, min, toDate, clamp, range]);

  return (
    <div className="pb-8">
      <div className="flex justify-between text-sm mb-2">
        <span>{toDate(range[0]).toLocaleDateString("fi-FI")}</span>
        <span>{toDate(range[1]).toLocaleDateString("fi-FI")}</span>
      </div>
      <div ref={trackRef} className="relative h-8 select-none">
        <div className="absolute top-1/2 -translate-y-1/2 w-full h-1 rounded bg-gray-300" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1 bg-green-500 rounded"
          style={{ left: pct(range[0]) + "%", width: pct(range[1] - range[0]) + "%" }}
        />
        <button
          type="button"
          role="slider"
          aria-label="Start date"
            aria-valuemin={0}
            aria-valuemax={range[1]-1}
            aria-valuenow={range[0]}
            aria-valuetext={toDate(range[0]).toLocaleDateString("fi-FI")}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border border-gray-500 shadow focus:outline-none focus:ring-2 focus:ring-green-500"
          style={{ left: pct(range[0]) + "%" }}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") { setRange(([a,b]) => [clamp(a-1), b]); scheduleCommit(); }
            if (e.key === "ArrowRight") { setRange(([a,b]) => (a+1 < b ? [clamp(a+1), b] : [a,b])); scheduleCommit(); }
          }}
          onKeyUp={onRelease}
          onPointerDown={(e) => { e.preventDefault(); setDragging('min'); }}
        />
        <button
          type="button"
          role="slider"
          aria-label="End date"
            aria-valuemin={range[0]+1}
            aria-valuemax={totalDays}
            aria-valuenow={range[1]}
            aria-valuetext={toDate(range[1]).toLocaleDateString("fi-FI")}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border border-gray-500 shadow focus:outline-none focus:ring-2 focus:ring-green-500"
          style={{ left: pct(range[1]) + "%" }}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") { setRange(([a,b]) => (b-1 > a ? [a, clamp(b-1)] : [a,b])); scheduleCommit(); }
            if (e.key === "ArrowRight") { setRange(([a,b]) => [a, clamp(b+1)]); scheduleCommit(); }
          }}
          onKeyUp={onRelease}
          onPointerDown={(e) => { e.preventDefault(); setDragging('max'); }}
        />
      </div>
      <div className="flex justify-between text-xs mt-1 text-gray-400">
        <span>{min.toLocaleDateString("fi-FI")}</span>
        <span>{max.toLocaleDateString("fi-FI")}</span>
      </div>
    </div>
  );
};

export default Slider;
