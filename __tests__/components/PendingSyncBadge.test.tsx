import React from "react";
import { PendingSyncBadge } from "@/components/organisms/attendance/PendingSyncBadge";

describe("PendingSyncBadge", () => {
  it("renders pending queue information", () => {
    const element = PendingSyncBadge({ pendingCount: 3 }) as React.ReactElement;

    expect(element).toBeTruthy();
    expect(JSON.stringify(element)).toContain("Pending Sync");
    expect(JSON.stringify(element)).toContain("3");
  });

  it("does not render when queue is empty", () => {
    const element = PendingSyncBadge({ pendingCount: 0 });

    expect(element).toBeNull();
  });
});
