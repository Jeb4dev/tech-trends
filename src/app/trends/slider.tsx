import ReactSlider from "react-slider";
import { Results } from "@/types";

export const Slider = (props: { min: Date; filteredData: Results[]; filterByDate: any }) => {
  const min = props.min;
  const max = new Date();

  // how many days between min and max
  const diff = (max.getTime() - min.getTime()) / (1000 * 3600 * 24);

  return (
    <>
      <div className={"pb-8"}>
        <div className={"flex justify-between"}>
          <label id="first-slider-label">{min.toLocaleDateString("fi-FI")}</label>
          <label id="second-slider-label">{max.toLocaleDateString("fi-FI")}</label>
        </div>
        <ReactSlider
          className="horizontal-slider"
          thumbClassName="active:outline-none focus:outline-none"
          trackClassName="example-track bg-white"
          defaultValue={[0, parseInt(diff.toString())]}
          ariaLabelledby={["first-slider-label", "second-slider-label"]}
          ariaValuetext={(state) => `Thumb value ${state.valueNow}`}
          renderThumb={(props, state) => (
            <div {...props}>
              {
                // add min date to state.valueNow and return it as a date
                new Date(min.getTime() + state.valueNow * 1000 * 3600 * 24).toLocaleDateString("fi-FI")
              }
            </div>
          )}
          pearling
          minDistance={1}
          max={parseInt(diff.toString())}
          renderTrack={Track}
          onChange={(value) => {
            const minDate = new Date(min.getTime() + value[0] * 1000 * 3600 * 24);
            const maxDate = new Date(min.getTime() + value[1] * 1000 * 3600 * 24);
            props.filterByDate(minDate, maxDate);
          }}
        />
      </div>
    </>
  );
};

const Track = (props: any, state: any) => {
  return <div {...props} className={`h-1 rounded-full ${state.index === 1 ? "bg-green-500" : "bg-gray-300"}`}></div>;
};
