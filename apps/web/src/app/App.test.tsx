import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUseAuth = vi.fn();
const originalMatchMedia = window.matchMedia;

vi.mock("../features/auth/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../features/auth/AuthScreen", () => ({
  AuthScreen: () => <div>MockAuthScreen</div>,
}));

vi.mock("../features/auth/AuthBootstrapGate", () => ({
  AuthBootstrapGate: () => <div>MockAuthBootstrapGate</div>,
}));

vi.mock("./shell/ConnectedAppShell", () => ({
  ConnectedAppShell: ({
    activeDestination,
    children,
  }: {
    activeDestination?: string | null;
    children: ReactNode;
  }) => (
    <div
      data-active-destination={activeDestination ?? "none"}
      data-testid="mock-app-shell"
    >
      {children}
    </div>
  ),
}));

vi.mock("../pages/ChatPage", () => ({
  ChatPage: () => <div>MockChatPage</div>,
}));

vi.mock("../pages/NotificationsPage", () => ({
  NotificationsPage: () => <div>MockNotificationsPage</div>,
}));

vi.mock("../pages/ProfilePage", () => ({
  ProfilePage: () => <div>MockProfilePage</div>,
}));

vi.mock("../pages/ProfileSubPage", () => ({
  ProfileSubPage: () => <div>MockProfileSubPage</div>,
}));

vi.mock("../pages/ProfileSettingsIndex", () => ({
  ProfileSettingsIndex: () => <div>MockProfileSettingsIndex</div>,
}));

vi.mock("../pages/PublicSupportPage", () => ({
  PublicSupportPage: () => <div>MockPublicSupportPage</div>,
}));

vi.mock("../pages/AccountDeletionPage", () => ({
  AccountDeletionPage: () => <div>MockAccountDeletionPage</div>,
}));

vi.mock("../pages/ReportPage", () => ({
  ReportPage: () => <div>MockReportPage</div>,
}));

vi.mock("../pages/SupportInboxPage", () => ({
  SupportInboxPage: ({ mode, ticketId }: { mode: string; ticketId?: string }) => (
    <div>{`MockSupportInboxPage:${mode}:${ticketId ?? "none"}`}</div>
  ),
}));

vi.mock("../pages/LandingPage", () => ({
  LandingPage: () => (
    <>
      <a href="/app">MockLoginLink</a>
      <a href="#workflow">MockWorkflowLink</a>
      <section id="workflow">MockWorkflowSection</section>
    </>
  ),
}));

import { App } from "./App";

describe("App route/auth entry handling", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        addEventListener: vi.fn(),
        matches: false,
        media: query,
        removeEventListener: vi.fn(),
      })),
    });
    mockUseAuth.mockReturnValue({
      accessToken: null,
      appUser: null,
      errorMessage: null,
      isLoading: true,
      user: null,
    });
  });

  afterEach(() => {
    cleanup();
    window.history.pushState(null, "", "/");
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: originalMatchMedia,
    });
    vi.clearAllMocks();
  });

  it("keeps the app shell around the notification center without a false active tab", async () => {
    window.history.pushState(null, "", "/notifications");
    mockUseAuth.mockReturnValue({
      accessToken: "access-token",
      appUser: { id: "user-1", role: "respondent" },
      errorMessage: null,
      isLoading: false,
      user: { id: "user-1" },
    });

    render(<App />);

    expect(await screen.findByText("MockNotificationsPage")).toBeInTheDocument();
    expect(screen.getByTestId("mock-app-shell")).toHaveAttribute(
      "data-active-destination",
      "none",
    );
  });

  it("renders the responsive Profile 2.0 entry", async () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        addEventListener: vi.fn(),
        matches: query === "(min-width: 1200px)",
        media: query,
        removeEventListener: vi.fn(),
      })),
    });
    window.history.pushState(null, "", "/profile");
    mockUseAuth.mockReturnValue({
      accessToken: "access-token",
      appUser: { id: "user-1", role: "respondent" },
      errorMessage: null,
      isLoading: false,
      user: { id: "user-1" },
    });

    render(<App />);

    expect(await screen.findByText("MockProfileSettingsIndex")).toBeInTheDocument();
    expect(screen.queryByText("MockProfilePage")).not.toBeInTheDocument();
    expect(screen.getByTestId("mock-app-shell")).toHaveAttribute(
      "data-active-destination",
      "profile",
    );
  });

  it("keeps protected routes behind the auth bootstrap gate while auth is still loading", () => {
    window.history.pushState(null, "", "/chat");

    render(<App />);

    expect(screen.getByText("MockAuthBootstrapGate")).toBeInTheDocument();
    expect(screen.queryByText("MockAuthScreen")).not.toBeInTheDocument();
  });

  it("redirects mobile web product routes to the store-focused landing page", async () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        addEventListener: vi.fn(),
        matches: query === "(max-width: 767px)",
        media: query,
        removeEventListener: vi.fn(),
      })),
    });
    window.history.pushState(null, "", "/app");
    mockUseAuth.mockReturnValue({
      accessToken: null,
      appUser: null,
      errorMessage: null,
      isLoading: false,
      user: null,
    });

    render(<App />);

    expect(await screen.findByText("MockWorkflowSection")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/");
    expect(screen.queryByText("MockAuthScreen")).not.toBeInTheDocument();
  });

  it("renders the public support hub without waiting for auth bootstrap", async () => {
    window.history.pushState(null, "", "/support");

    render(<App />);

    expect(await screen.findByText("MockPublicSupportPage")).toBeInTheDocument();
    expect(screen.queryByText("MockAuthBootstrapGate")).not.toBeInTheDocument();
  });

  it("renders public account deletion without waiting for auth bootstrap", async () => {
    window.history.pushState(null, "", "/account-deletion");

    render(<App />);

    expect(await screen.findByText("MockAccountDeletionPage")).toBeInTheDocument();
    expect(screen.queryByText("MockAuthBootstrapGate")).not.toBeInTheDocument();
  });

  it.each([
    ["/support/inquiries", "MockSupportInboxPage:list:none"],
    ["/support/inquiries/new", "MockSupportInboxPage:new:none"],
    ["/report", "MockReportPage"],
  ])("renders authenticated support route %s", async (path, expectedText) => {
    window.history.pushState(null, "", path);
    mockUseAuth.mockReturnValue({
      accessToken: "access-token",
      appUser: { id: "user-1", role: "respondent" },
      errorMessage: null,
      isLoading: false,
      user: { id: "user-1" },
    });

    render(<App />);

    expect(await screen.findByText(expectedText)).toBeInTheDocument();
  });

  it("preserves a protected support ticket deep link until authentication completes", async () => {
    window.history.pushState(null, "", "/support/inquiries/ticket-1");
    mockUseAuth.mockReturnValue({
      accessToken: null,
      appUser: null,
      errorMessage: null,
      isLoading: false,
      user: null,
    });

    const view = render(<App />);
    expect(screen.getByText("MockAuthScreen")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/support/inquiries/ticket-1");

    mockUseAuth.mockReturnValue({
      accessToken: "access-token",
      appUser: { id: "user-1", role: "respondent" },
      errorMessage: null,
      isLoading: false,
      user: { id: "user-1" },
    });
    view.rerender(<App />);

    expect(await screen.findByText("MockSupportInboxPage:detail:ticket-1")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/support/inquiries/ticket-1");
  });

  it("keeps a protected deep link intact and opens it after authentication", async () => {
    window.history.pushState(null, "", "/chat?room=room-123");
    mockUseAuth.mockReturnValue({
      accessToken: null,
      appUser: null,
      errorMessage: null,
      isLoading: false,
      user: null,
    });

    const view = render(<App />);

    expect(screen.getByText("MockAuthScreen")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/chat");
    expect(window.location.search).toBe("?room=room-123");

    mockUseAuth.mockReturnValue({
      accessToken: "access-token",
      appUser: { id: "user-1", role: "respondent" },
      errorMessage: null,
      isLoading: false,
      user: { id: "user-1" },
    });
    view.rerender(<App />);

    expect(await screen.findByText("MockChatPage")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/chat");
    expect(window.location.search).toBe("?room=room-123");
  });

  it("routes an internal landing link through the shared navigation coordinator", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/");
    mockUseAuth.mockReturnValue({
      accessToken: null,
      appUser: null,
      errorMessage: null,
      isLoading: false,
      user: null,
    });

    render(<App />);
    await user.click(await screen.findByRole("link", { name: "MockLoginLink" }));

    expect(window.location.pathname).toBe("/app");
    expect(window.location.search).toBe("");
    expect(screen.getByText("MockAuthScreen")).toBeInTheDocument();
    expect(document.title).toBe("로그인 | Hypofit");
    expect(window.history.state.__hypofit.intent).toBe("auth");
  });

  it("shows account choice instead of entering the app immediately for an existing session", () => {
    window.history.replaceState(null, "", "/app?account=choose");
    mockUseAuth.mockReturnValue({
      accessToken: "access-token",
      appUser: { id: "user-1", role: "respondent" },
      errorMessage: null,
      isLoading: false,
      user: { id: "user-1" },
    });

    render(<App />);

    expect(screen.getByText("MockAuthScreen")).toBeInTheDocument();
    expect(screen.queryByTestId("mock-app-shell")).not.toBeInTheDocument();
  });

  it("routes a same-page landing hash through anchor scrolling", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/");
    mockUseAuth.mockReturnValue({
      accessToken: null,
      appUser: null,
      errorMessage: null,
      isLoading: false,
      user: null,
    });
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    const scrollIntoView = vi.fn();

    render(<App />);
    const workflow = await screen.findByText("MockWorkflowSection");
    workflow.scrollIntoView = scrollIntoView;
    await user.click(screen.getByRole("link", { name: "MockWorkflowLink" }));

    expect(window.location.hash).toBe("#workflow");
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });
});
