import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { MaintenanceOverlay } from "./MaintenanceOverlay";

vi.mock("./MaintenanceScreen", () => ({ MaintenanceScreen: () => <p>점검 진행 중</p> }));
afterEach(cleanup);

it("keeps an in-progress form mounted through maintenance and restores access", async () => {
  const user = userEvent.setup();
  const child = <input aria-label="작성 중인 공고" defaultValue="" />;
  const view = render(<MaintenanceOverlay active={false}>{child}</MaintenanceOverlay>);
  await user.type(screen.getByLabelText("작성 중인 공고"), "작성 중인 내용");
  const input = screen.getByLabelText("작성 중인 공고");
  view.rerender(<MaintenanceOverlay active>{child}</MaintenanceOverlay>);
  expect(screen.getByRole("dialog")).toHaveTextContent("점검 진행 중");
  await user.keyboard("{Escape}");
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(input).toHaveValue("작성 중인 내용");
  view.rerender(<MaintenanceOverlay active={false}>{child}</MaintenanceOverlay>);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByLabelText("작성 중인 공고")).toBe(input);
  expect(input).toHaveValue("작성 중인 내용");
});
