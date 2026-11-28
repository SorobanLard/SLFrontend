import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  formatRangeLabel,
  rangeForPreset,
  RevenueDateRangePicker,
  type RevenueDateRange,
} from "./RevenueDateRangePicker";

const initialRange: RevenueDateRange = {
  preset: "12m",
  from: "2024-01-01",
  to: "2024-12-31",
};

describe("RevenueDateRangePicker", () => {
  it("renders the available presets and the selected custom range label", () => {
    const customRange: RevenueDateRange = {
      preset: "custom",
      from: "2024-01-01",
      to: "2024-03-31",
    };

    render(<RevenueDateRangePicker value={customRange} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Last 3M" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Last 6M" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Last 12M" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: new RegExp(formatRangeLabel(customRange)),
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("notifies the parent when a preset is selected", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RevenueDateRangePicker value={initialRange} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Last 3M" }));

    expect(onChange).toHaveBeenCalledWith(rangeForPreset("3m"));
  });

  it("applies a valid custom date range", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RevenueDateRangePicker value={initialRange} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Custom" }));
    const dialog = screen.getByRole("dialog", {
      name: "Select custom date range",
    });
    const fromInput = screen.getByLabelText("From");
    const toInput = screen.getByLabelText("To");

    expect(fromInput).toHaveValue(initialRange.from);
    expect(toInput).toHaveValue(initialRange.to);

    fireEvent.change(fromInput, { target: { value: "2024-02-01" } });
    fireEvent.change(toInput, { target: { value: "2024-04-30" } });
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(onChange).toHaveBeenCalledWith({
      preset: "custom",
      from: "2024-02-01",
      to: "2024-04-30",
    });
    expect(dialog).not.toBeInTheDocument();
  });

  it("prevents applying a range whose end precedes its start", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RevenueDateRangePicker value={initialRange} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Custom" }));
    fireEvent.change(screen.getByLabelText("To"), {
      target: { value: "2023-12-31" },
    });

    expect(
      screen.getByText("Start date must be before end date."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("closes the custom range dialog without changing the selected range when cancelled", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RevenueDateRangePicker value={initialRange} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Custom" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
