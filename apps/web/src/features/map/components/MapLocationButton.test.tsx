import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MapLocationButton } from "./MapLocationButton";

describe("MapLocationButton", () => {
  it("requests the current location from an accessible map control", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<MapLocationButton isRequesting={false} onClick={onClick} />);

    await user.click(screen.getByRole("button", { name: "현재 위치로 이동" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("prevents duplicate requests while the location is being resolved", () => {
    render(<MapLocationButton isRequesting onClick={vi.fn()} />);

    const button = screen.getByRole("button", { name: "현재 위치 확인 중" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });
});
