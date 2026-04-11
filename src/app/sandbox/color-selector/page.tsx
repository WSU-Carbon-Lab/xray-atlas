"use client";

import { useState } from "react";
import { Card } from "@heroui/react";
import { HexColorSelector } from "~/components/ui/hex-color-selector";

export default function SandboxHexColorSelectorPage() {
  const [hex, setHex] = useState("#5865F2");

  return (
    <div className="mx-auto max-w-lg px-4">
      <Card className="p-6">
        <h1 className="text-foreground text-lg font-semibold">
          Hex color selector
        </h1>
        <p className="text-muted mt-2 text-sm leading-relaxed">
          Isolated demo for{" "}
          <code className="text-foreground/90 bg-surface-2/80 rounded px-1 py-0.5 text-xs">
            HexColorSelector
          </code>
          . Uses the system color dialog, preset carousel, and no overlay popover.
        </p>
        <div className="mt-4">
          <HexColorSelector
            idPrefix="sandbox"
            value={hex}
            onChange={setHex}
            nativePickerAriaLabel="Open sandbox system color picker"
          />
        </div>
      </Card>
    </div>
  );
}
