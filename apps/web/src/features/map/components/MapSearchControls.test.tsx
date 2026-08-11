import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MapSearchControls } from "./MapSearchControls";

describe("MapSearchControls", () => {
  it("forwards query, submit, and place-selection actions", async () => {
    const user = userEvent.setup();
    const onQueryChange = vi.fn();
    const onSelectPlace = vi.fn();
    const onSubmit = vi.fn();
    const place = {
      address_name: "서울 성동구 성수동2가",
      place_name: "성수역",
      road_address_name: "서울 성동구 아차산로 100",
      x: "127.0557",
      y: "37.5447",
    };

    render(
      <MapSearchControls
        isPlaceSearching={true}
        places={[place]}
        query="성수"
        searchError="검색 결과를 다시 확인해 주세요."
        variant="mobile"
        onQueryChange={onQueryChange}
        onSelectPlace={onSelectPlace}
        onSubmit={onSubmit}
      />,
    );

    const input = screen.getByPlaceholderText("지역, 역, 학교 검색");

    fireEvent.change(input, { target: { value: "성수역" } });
    fireEvent.submit(input.closest("form") as HTMLFormElement);

    expect(onQueryChange).toHaveBeenCalledWith("성수역");
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByText("검색 결과를 다시 확인해 주세요.")).toBeInTheDocument();
    expect(screen.getByText("지역을 찾고 있어요")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /성수역/ }));
    expect(onSelectPlace).toHaveBeenCalledWith(place);
  });
});
