import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ReferralDashboard from "./ReferralDashboard";

const baseStats = { sent: 12, enrolled: 5, rewardsEarned: 1500 };

const populatedReferrals = [
  {
    id: "r1",
    friendName: "Ada Lovelace",
    courseName: "Intro to Soroban",
    rewardAmount: 250,
    payoutStatus: "PAID" as const,
  },
  {
    id: "r2",
    friendName: "Alan Turing",
    courseName: "Advanced Rust",
    rewardAmount: 100,
    payoutStatus: "PENDING" as const,
  },
];

describe("ReferralDashboard", () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  const openSpy = vi.fn();

  beforeEach(() => {
    writeText.mockClear();
    openSpy.mockClear();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    vi.spyOn(window, "open").mockImplementation(openSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the referral link and stats", () => {
    render(
      <ReferralDashboard
        referralCode="ABC123"
        stats={baseStats}
        referrals={populatedReferrals}
      />,
    );

    expect(screen.getByText("Refer & Earn")).toBeInTheDocument();
    expect(
      screen.getByText("https://sorobanlard.com/ref/ABC123"),
    ).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("1,500 XLM")).toBeInTheDocument();
  });

  it("shows the empty state when there are no referrals", () => {
    render(
      <ReferralDashboard
        referralCode="ABC123"
        stats={{ sent: 0, enrolled: 0, rewardsEarned: 0 }}
        referrals={[]}
      />,
    );

    expect(
      screen.getByText(/haven't earned any referral rewards yet/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders the populated referral table with statuses", () => {
    render(
      <ReferralDashboard
        referralCode="ABC123"
        stats={baseStats}
        referrals={populatedReferrals}
      />,
    );

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Intro to Soroban")).toBeInTheDocument();
    expect(screen.getByText("250 XLM")).toBeInTheDocument();
    expect(screen.getByText("PAID")).toBeInTheDocument();
    expect(screen.getByText("PENDING")).toBeInTheDocument();
  });

  it("copies the referral link and shows confirmation", async () => {
    render(
      <ReferralDashboard
        referralCode="ABC123"
        stats={baseStats}
        referrals={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        "https://sorobanlard.com/ref/ABC123",
      );
    });
    expect(
      await screen.findByRole("button", { name: "Copied!" }),
    ).toBeInTheDocument();
  });

  it("opens the email share link", () => {
    render(
      <ReferralDashboard
        referralCode="ABC123"
        stats={baseStats}
        referrals={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Email" }));

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy.mock.calls[0][0]).toContain("mailto:");
  });

  it("opens the WhatsApp share link", () => {
    render(
      <ReferralDashboard
        referralCode="ABC123"
        stats={baseStats}
        referrals={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "WhatsApp" }));

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy.mock.calls[0][0]).toContain("https://wa.me/");
  });

  it("opens the LinkedIn share link", () => {
    render(
      <ReferralDashboard
        referralCode="ABC123"
        stats={baseStats}
        referrals={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "LinkedIn" }));

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy.mock.calls[0][0]).toContain(
      "https://www.linkedin.com/sharing/share-offsite/",
    );
  });
});
