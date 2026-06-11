"use client";

import { useCallback, useState, type Key, type ReactNode } from "react";
import {
  Button,
  ErrorMessage,
  Input,
  Separator,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Tooltip,
} from "@heroui/react";
import { buttonVariants, cn } from "@heroui/styles";
import {
  Braces,
  ChevronDown,
  Circle,
  Eraser,
  Globe,
  Hand,
  Hexagon,
  MousePointer2,
  Move,
  Pencil,
  Redo2,
  RefreshCw,
  RotateCw,
  Scissors,
  Sparkles,
  Trash2,
  Undo2,
  X,
} from "lucide-react";

import { PopoverMenu, PopoverMenuContent } from "~/components/ui/popover-menu";

import {
  CAGE_TEMPLATE_PRESETS,
  DRAW_BOND_KIND_OPTIONS,
  MACROCYCLE_TEMPLATE_PRESETS,
  SMALL_RING_TEMPLATE_PRESETS,
  type CageDepictionMode,
  type DrawBondKind,
  type DrawTool,
  type LayoutTool,
  type RingTemplatePreset,
} from "../molecule-draw-types";
import {
  parseCageCarbonCountFromInput,
  SUPPORTED_CAGE_CARBON_COUNTS,
} from "../utils/cage-smiles";
import type { CageSmilesResult } from "../utils/cage-smiles";
import { AlignAxesIcon } from "./align-axes-icon";
import { BondKindGlyph } from "./bond-kind-glyph";
import { HeteroatomToolIcon } from "./heteroatom-tool-icon";
import { PivotAngleIcon } from "./pivot-angle-icon";
import { RingTemplateThumbnail } from "./ring-template-thumbnail";

const PIVOT_ROTATE_STEP_DEG = 15;

const TOOL_ITEMS: Array<{
  id: DrawTool;
  label: string;
  hint: string;
  icon: ReactNode;
}> = [
  {
    id: "select",
    label: "Select",
    hint: "Marquee-select on empty canvas; Shift+click toggles atoms. Delete or Backspace removes the selection. R rotates +15°; Shift+R rotates -15°.",
    icon: <MousePointer2 className="h-4 w-4" aria-hidden />,
  },
  {
    id: "pan",
    label: "Pan",
    hint: "Drag to pan the view. Hold Space for temporary pan while using other tools. Middle- or right-mouse drag also pans.",
    icon: <Hand className="h-4 w-4" aria-hidden />,
  },
  {
    id: "draw",
    label: "Draw",
    hint: "Click empty canvas to add an atom; drag from an atom or empty space to sprout a bond. Click a bond to retype or cycle double-bond offset.",
    icon: <Pencil className="h-4 w-4" aria-hidden />,
  },
  {
    id: "element",
    label: "Heteroatom",
    hint: "Click an atom to open the heteroatom palette (N, O, S, halogens, and custom symbols).",
    icon: <HeteroatomToolIcon />,
  },
  {
    id: "erase",
    label: "Erase",
    hint: "Click an atom or bond to delete it.",
    icon: <Eraser className="h-4 w-4" aria-hidden />,
  },
  {
    id: "bookend",
    label: "Repeat unit",
    hint: "Click acyclic single bonds to place opening [ and closing ] repeat-unit brackets.",
    icon: <Braces className="h-4 w-4" aria-hidden />,
  },
  {
    id: "chunk",
    label: "Blocks",
    hint: "Toggle block cuts on acyclic single bonds to emit block fragment SMILES.",
    icon: <Scissors className="h-4 w-4" aria-hidden />,
  },
];

const LAYOUT_ITEMS: Array<{
  id: LayoutTool;
  label: string;
  hint: string;
  icon: ReactNode;
}> = [
  {
    id: "translate",
    label: "Move",
    hint: "Drag on the canvas to move the selection, or the whole structure when nothing is selected.",
    icon: <Move className="h-4 w-4" aria-hidden />,
  },
  {
    id: "rotate",
    label: "Rotate",
    hint: "Drag around the canvas center to rotate the selection or whole structure.",
    icon: <RotateCw className="h-4 w-4" aria-hidden />,
  },
  {
    id: "align",
    label: "Align",
    hint: "Click two atoms, then align their bond vector along the X or Y axis.",
    icon: <AlignAxesIcon />,
  },
  {
    id: "pivot",
    label: "Pivot",
    hint: "Pick a pivot bond, then flip or rotate the smaller fragment by 15° steps.",
    icon: <PivotAngleIcon />,
  },
];

const DRAW_TOOL_IDS = new Set<string>(TOOL_ITEMS.map((item) => item.id));
const LAYOUT_TOOL_IDS = new Set<string>([
  ...LAYOUT_ITEMS.map((item) => item.id),
  "cage-orbit",
]);

interface DrawToolbarHintProps {
  label: string;
  description: string;
  children: ReactNode;
}

function DrawToolbarHint({ label, description, children }: DrawToolbarHintProps) {
  return (
    <Tooltip delay={300}>
      <Tooltip.Trigger>{children}</Tooltip.Trigger>
      <Tooltip.Content placement="bottom" className="max-w-xs">
        <p className="text-foreground text-xs font-medium">{label}</p>
        <p className="text-muted mt-0.5 text-xs">{description}</p>
      </Tooltip.Content>
    </Tooltip>
  );
}

/** Props for {@link MoleculeDrawToolbar}. */
export interface MoleculeDrawToolbarProps {
  /** Currently active tool. */
  tool: DrawTool;
  /** Switches the active tool. */
  onTool: (tool: DrawTool) => void;
  /** Active bond kind for draw sprouting and bond retyping. */
  drawBondKind: DrawBondKind;
  /** Sets the active bond kind. */
  onDrawBondKind: (kind: DrawBondKind) => void;
  /** Active layout tool, or null when layout mode is off. */
  layoutTool: LayoutTool | null;
  /** Switches layout mode. */
  onLayoutTool: (tool: LayoutTool | null) => void;
  /** Count of atoms picked for align. */
  alignAtomCount: number;
  /** Count of atoms picked for pivot. */
  pivotAtomCount: number;
  /** Aligns two picked atoms along an axis. */
  onRunAlignAxis: (axis: "x" | "y") => void;
  /** Clears align atom picks. */
  onClearAlignPicks: () => void;
  /** Clears pivot atom picks. */
  onClearPivotPicks: () => void;
  /** Flips the smaller fragment across the pivot bond. */
  onRunPivotFlip: () => void;
  /** Rotates the pivot fragment by the given degrees. */
  onRunPivotRotate: (deg: number) => void;
  /** Abbreviates alkyl tails and nitriles while preserving orientation (one undo step). */
  onPrepareForDatabase: () => void;
  /**
   * Rebuilds the canvas from canonical SMILES with fresh layout and database
   * abbreviations; clears polymer bookend marks.
   */
  onRegenerateFromSmiles: () => void;
  /** True when canonical SMILES is available to regenerate from. */
  canRegenerateFromSmiles: boolean;
  /** Runs CoordinateInventor layout on the whole drawing. */
  onStabilize: () => void;
  /** Scales the drawing about its centroid without abbreviating labels. */
  onTidySpacing: () => void;
  /** Undoes the last structural edit. */
  onUndo: () => void;
  /** Redoes the last undone edit. */
  onRedo: () => void;
  /** Clears the canvas. */
  onClear: () => void;
  /** True when undo is available. */
  canUndo: boolean;
  /** True when redo is available. */
  canRedo: boolean;
  /** True when the canvas holds at least one atom. */
  hasStructure: boolean;
  /** Active ring template preset. */
  selectedRingTemplate: RingTemplatePreset;
  /** Selects a ring template and switches to template placement mode. */
  onSelectRingTemplate: (templateId: string) => void;
  /**
   * Selects a tabulated cage by carbon count and switches to template placement
   * mode; returns an error result when N is unsupported.
   */
  onSelectCageByCarbonCount: (carbonCount: number) => CageSmilesResult;
  /** Fullerene cage depiction mode for new placements and re-projection. */
  cageDepictionMode: CageDepictionMode;
  /** Switches between flat 2D and perspective 3D cage depiction. */
  onCageDepictionMode: (mode: CageDepictionMode) => void;
  /** When true, shows the cage 3D orbit layout tool. */
  showCageOrbitTool: boolean;
  /** Resets cage orbit to the default face-on view. */
  onResetCageView: () => void;
}

interface RingTemplateMenuRowProps {
  preset: RingTemplatePreset;
  isSelected: boolean;
  onSelect: () => void;
}

function RingTemplateMenuRow({ preset, isSelected, onSelect }: RingTemplateMenuRowProps) {
  return (
    <button
      type="button"
      className={cn(
        "hover:bg-default text-foreground flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
        isSelected && "bg-accent-soft text-accent",
      )}
      onClick={onSelect}
    >
      <RingTemplateThumbnail templateId={preset.id} />
      <span className="min-w-0 flex-1 truncate">{preset.name}</span>
    </button>
  );
}

type RingTemplateMenuTab = "rings" | "macrocycles" | "cages";

interface RingTemplateMenuSectionsProps {
  selectedRingTemplate: RingTemplatePreset;
  onSelectRingTemplate: (templateId: string) => void;
  onSelectCageByCarbonCount: (carbonCount: number) => CageSmilesResult;
  onClose: () => void;
}

function RingTemplateMenuSections({
  selectedRingTemplate,
  onSelectRingTemplate,
  onSelectCageByCarbonCount,
  onClose,
}: RingTemplateMenuSectionsProps) {
  const [activeTab, setActiveTab] = useState<RingTemplateMenuTab>("rings");
  const [cageCarbonInput, setCageCarbonInput] = useState("");
  const [cageInputError, setCageInputError] = useState<string | null>(null);

  const handleTabSelectionChange = useCallback((key: Key | null) => {
    if (key === "rings" || key === "macrocycles" || key === "cages") {
      queueMicrotask(() => setActiveTab(key));
    }
  }, []);

  const handleSelectPreset = useCallback(
    (templateId: string) => {
      onSelectRingTemplate(templateId);
      setCageInputError(null);
      onClose();
    },
    [onClose, onSelectRingTemplate],
  );

  const handlePlaceCage = useCallback(() => {
    const carbonCount = parseCageCarbonCountFromInput(cageCarbonInput);
    if (carbonCount === null) {
      setCageInputError("Enter a positive whole number of carbons.");
      return;
    }
    const result = onSelectCageByCarbonCount(carbonCount);
    if (!result.ok) {
      setCageInputError(result.error);
      return;
    }
    setCageInputError(null);
    onClose();
  }, [cageCarbonInput, onClose, onSelectCageByCarbonCount]);

  return (
    <Tabs
      selectedKey={activeTab}
      onSelectionChange={handleTabSelectionChange}
      className="w-full"
    >
      <Tabs.ListContainer className="w-full">
        <Tabs.List
          aria-label="Ring template categories"
          className="w-full px-0.5 [&_.tabs__tab]:min-w-0 [&_.tabs__tab]:flex-1 [&_.tabs__tab]:justify-center [&_.tabs__tab]:px-0.5 [&_.tabs__tab]:text-xs"
        >
          <Tabs.Tab id="rings">
            <span className="inline-flex min-w-0 items-center gap-0.5">
              <Hexagon className="h-3 w-3 shrink-0" aria-hidden />
              <span>Rings</span>
            </span>
            <Tabs.Indicator />
          </Tabs.Tab>
          <Tabs.Tab id="macrocycles" aria-label="Macrocycles">
            <span className="inline-flex min-w-0 items-center gap-0.5">
              <Circle className="h-3 w-3 shrink-0" aria-hidden />
              <span>Macro.</span>
            </span>
            <Tabs.Indicator />
          </Tabs.Tab>
          <Tabs.Tab id="cages">
            <span className="inline-flex min-w-0 items-center gap-0.5">
              <Globe className="h-3 w-3 shrink-0" aria-hidden />
              <span>Cages</span>
            </span>
            <Tabs.Indicator />
          </Tabs.Tab>
        </Tabs.List>
      </Tabs.ListContainer>

      <Tabs.Panel id="rings" className="pt-1">
        <div className="popover-menu-scroll max-h-64 overflow-y-auto">
          {SMALL_RING_TEMPLATE_PRESETS.map((preset) => (
            <RingTemplateMenuRow
              key={preset.id}
              preset={preset}
              isSelected={preset.id === selectedRingTemplate.id}
              onSelect={() => handleSelectPreset(preset.id)}
            />
          ))}
        </div>
      </Tabs.Panel>

      <Tabs.Panel id="macrocycles" className="pt-1">
        <div className="popover-menu-scroll max-h-64 overflow-y-auto">
          {MACROCYCLE_TEMPLATE_PRESETS.map((preset) => (
            <RingTemplateMenuRow
              key={preset.id}
              preset={preset}
              isSelected={preset.id === selectedRingTemplate.id}
              onSelect={() => handleSelectPreset(preset.id)}
            />
          ))}
        </div>
      </Tabs.Panel>

      <Tabs.Panel id="cages" className="space-y-1 pt-1">
        <div className="popover-menu-scroll max-h-48 overflow-y-auto">
          {CAGE_TEMPLATE_PRESETS.map((preset) => (
            <RingTemplateMenuRow
              key={preset.id}
              preset={preset}
              isSelected={preset.id === selectedRingTemplate.id}
              onSelect={() => handleSelectPreset(preset.id)}
            />
          ))}
        </div>

        <Separator className="bg-border my-1" />

        <div className="space-y-1.5 px-2 py-1">
          <p className="text-muted text-xs">
            Custom fullerene ({SUPPORTED_CAGE_CARBON_COUNTS.join(", ")} C)
          </p>
          <div className="flex items-start gap-1.5">
            <Input
              aria-label="Fullerene carbon count"
              placeholder="N carbons"
              variant="secondary"
              className="h-8 min-w-0 flex-1 text-xs"
              value={cageCarbonInput}
              onChange={(event) => {
                setCageCarbonInput(event.target.value);
                if (cageInputError !== null) {
                  setCageInputError(null);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handlePlaceCage();
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onPress={handlePlaceCage}
              className="shrink-0 text-xs"
            >
              Place
            </Button>
          </div>
          {cageInputError !== null ? (
            <ErrorMessage>{cageInputError}</ErrorMessage>
          ) : null}
        </div>
      </Tabs.Panel>
    </Tabs>
  );
}

/**
 * Tool selector plus layout and history actions for the molecule draw lab.
 * Primary row: icon draw tools, bond/ring pickers, tidy layout, and history.
 * Secondary row: layout modes with contextual align/pivot actions.
 */
export function MoleculeDrawToolbar({
  tool,
  onTool,
  drawBondKind,
  onDrawBondKind,
  layoutTool,
  onLayoutTool,
  alignAtomCount,
  pivotAtomCount,
  onRunAlignAxis,
  onClearAlignPicks,
  onClearPivotPicks,
  onRunPivotFlip,
  onRunPivotRotate,
  onPrepareForDatabase,
  onRegenerateFromSmiles,
  canRegenerateFromSmiles,
  onStabilize,
  onTidySpacing,
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo,
  hasStructure,
  selectedRingTemplate,
  onSelectRingTemplate,
  onSelectCageByCarbonCount,
  cageDepictionMode,
  onCageDepictionMode,
  showCageOrbitTool,
  onResetCageView,
}: MoleculeDrawToolbarProps) {
  const handleSelectionChange = useCallback(
    (keys: "all" | Iterable<string | number>) => {
      if (keys === "all") {
        return;
      }
      for (const key of keys) {
        const id = String(key);
        if (DRAW_TOOL_IDS.has(id)) {
          onTool(id as DrawTool);
        }
        return;
      }
    },
    [onTool],
  );

  const handleLayoutSelectionChange = useCallback(
    (keys: "all" | Iterable<string | number>) => {
      if (keys === "all") {
        return;
      }
      for (const key of keys) {
        const id = String(key);
        if (LAYOUT_TOOL_IDS.has(id)) {
          onLayoutTool(layoutTool === id ? null : (id as LayoutTool));
        }
        return;
      }
    },
    [layoutTool, onLayoutTool],
  );

  const handleCageDepictionModeChange = useCallback(
    (keys: "all" | Iterable<string | number>) => {
      if (keys === "all") {
        return;
      }
      for (const key of keys) {
        const id = String(key);
        if (id === "2d" || id === "3d") {
          onCageDepictionMode(id);
        }
        return;
      }
    },
    [onCageDepictionMode],
  );

  return (
    <div className="border-border space-y-2 rounded-lg border p-3">
      <Toolbar className="flex flex-wrap items-center gap-1" aria-label="Draw tools">
        <ToggleButtonGroup
          aria-label="Draw canvas tools"
          selectionMode="single"
          disallowEmptySelection={DRAW_TOOL_IDS.has(tool)}
          selectedKeys={DRAW_TOOL_IDS.has(tool) ? new Set([tool]) : new Set<string>()}
          onSelectionChange={handleSelectionChange}
          className="gap-0.5"
        >
          {TOOL_ITEMS.map((item) => (
            <DrawToolbarHint key={item.id} label={item.label} description={item.hint}>
              <ToggleButton
                id={item.id}
                size="sm"
                aria-label={item.label}
                className="min-w-9 px-2"
              >
                {item.icon}
              </ToggleButton>
            </DrawToolbarHint>
          ))}
        </ToggleButtonGroup>

        <Separator className="bg-border mx-1 h-6" orientation="vertical" />

        <PopoverMenu
          placement="bottom-start"
          renderTrigger={({ triggerProps, isOpen }) => (
            <DrawToolbarHint
              label="Bond type"
              description="Bond order used when sprouting or retyping bonds."
            >
              <button
                type="button"
                {...triggerProps}
                className={cn(
                  buttonVariants({
                    variant: tool === "draw" ? "primary" : "secondary",
                    size: "sm",
                  }),
                  "inline-flex min-w-9 items-center gap-1 px-2",
                )}
                aria-label="Bond type"
              >
                <BondKindGlyph kind={drawBondKind} />
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")}
                  aria-hidden
                />
              </button>
            </DrawToolbarHint>
          )}
          renderContent={({ close, contentProps, contentPositionClassName }) => (
            <PopoverMenuContent
              {...contentProps}
              className={cn(contentPositionClassName, "w-44 p-1")}
            >
              <p className="text-muted px-2 py-1 text-xs font-medium">Bond type</p>
              <div className="grid grid-cols-2 gap-1">
                {DRAW_BOND_KIND_OPTIONS.map((option) => (
                  <button
                    key={option.kind}
                    type="button"
                    className={cn(
                      "hover:bg-default text-foreground flex flex-col items-center gap-1 rounded-md px-2 py-2 text-center text-xs",
                      drawBondKind === option.kind && "bg-accent-soft text-accent",
                    )}
                    onClick={() => {
                      onDrawBondKind(option.kind);
                      onTool("draw");
                      close();
                    }}
                  >
                    <BondKindGlyph kind={option.kind} />
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </PopoverMenuContent>
          )}
        />

        <PopoverMenu
          placement="bottom-start"
          renderTrigger={({ triggerProps, isOpen }) => (
            <DrawToolbarHint
              label="Ring templates"
              description="Place or fuse rings. Click canvas to place; pick two bonded atoms to fuse."
            >
              <button
                type="button"
                {...triggerProps}
                className={cn(
                  buttonVariants({
                    variant: tool === "template" ? "primary" : "secondary",
                    size: "sm",
                  }),
                  "inline-flex min-w-9 items-center gap-1 px-2",
                )}
                aria-label="Ring templates"
              >
                <Hexagon className="h-4 w-4" aria-hidden />
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")}
                  aria-hidden
                />
              </button>
            </DrawToolbarHint>
          )}
          renderContent={({ close, contentProps, contentPositionClassName }) => (
            <PopoverMenuContent
              {...contentProps}
              className={cn(contentPositionClassName, "w-72 p-1")}
            >
              <RingTemplateMenuSections
                selectedRingTemplate={selectedRingTemplate}
                onSelectRingTemplate={onSelectRingTemplate}
                onSelectCageByCarbonCount={onSelectCageByCarbonCount}
                onClose={close}
              />
            </PopoverMenuContent>
          )}
        />

        <Separator className="bg-border mx-1 h-6" orientation="vertical" />

        <DrawToolbarHint
          label="Cage view"
          description="2D hides rear-hemisphere and occluded bonds for a flat soccer-ball silhouette; 3D keeps all bonds with muted depth cues."
        >
          <ToggleButtonGroup
            aria-label="Fullerene cage depiction mode"
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={new Set([cageDepictionMode])}
            onSelectionChange={handleCageDepictionModeChange}
            className="gap-0.5"
          >
            <ToggleButton id="2d" size="sm" className="min-w-9 px-2 text-xs">
              2D
            </ToggleButton>
            <ToggleButton id="3d" size="sm" className="min-w-9 px-2 text-xs">
              3D
            </ToggleButton>
          </ToggleButtonGroup>
        </DrawToolbarHint>

        <Separator className="bg-border mx-1 h-6" orientation="vertical" />

        <div className="inline-flex items-center gap-0.5">
          <DrawToolbarHint
            label="Prepare for database"
            description="Abbreviate alkyl tails and nitriles (CN) without re-orienting the drawing. Use Database prep below to include compact spacing."
          >
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onPress={onPrepareForDatabase}
              isDisabled={!hasStructure}
              aria-label="Prepare for database"
              className="min-w-9 px-2"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
            </Button>
          </DrawToolbarHint>
          <DrawToolbarHint
            label="Regenerate from SMILES"
            description="Discard manual layout and rebuild from the current canonical SMILES with default coordinates and database abbreviations. Clears repeat-unit bookends and block cuts."
          >
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onPress={onRegenerateFromSmiles}
              isDisabled={!canRegenerateFromSmiles}
              aria-label="Regenerate from SMILES"
              className="min-w-9 px-2"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
            </Button>
          </DrawToolbarHint>
          <PopoverMenu
            placement="bottom-start"
            renderTrigger={({ triggerProps, isOpen }) => (
              <DrawToolbarHint
                label="More layout options"
                description="Stabilize bond angles only, or tidy spacing without abbreviating labels."
              >
                <button
                  type="button"
                  {...triggerProps}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "min-w-7 px-1",
                  )}
                  aria-label="More layout cleanup options"
                  disabled={!hasStructure}
                >
                  <ChevronDown
                    className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")}
                    aria-hidden
                  />
                </button>
              </DrawToolbarHint>
            )}
            renderContent={({ close, contentProps, contentPositionClassName }) => (
              <PopoverMenuContent
                {...contentProps}
                className={cn(contentPositionClassName, "w-52 p-1")}
              >
                <p className="text-muted px-2 py-1 text-xs font-medium">Layout cleanup</p>
                <button
                  type="button"
                  className="hover:bg-default text-foreground w-full rounded-md px-2 py-1.5 text-left text-sm"
                  onClick={() => {
                    onStabilize();
                    close();
                  }}
                >
                  Stabilize coordinates
                </button>
                <button
                  type="button"
                  className="hover:bg-default text-foreground w-full rounded-md px-2 py-1.5 text-left text-sm"
                  onClick={() => {
                    onTidySpacing();
                    close();
                  }}
                >
                  Tidy spacing only
                </button>
              </PopoverMenuContent>
            )}
          />
        </div>

        <Separator className="bg-border mx-1 h-6" orientation="vertical" />

        <DrawToolbarHint
          label="Undo"
          description="Undo the last structural edit (toolbar button; browser undo does not apply)."
        >
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onPress={onUndo}
            isDisabled={!canUndo}
            aria-label="Undo"
            className="min-w-9 px-2"
          >
            <Undo2 className="h-4 w-4" aria-hidden />
          </Button>
        </DrawToolbarHint>
        <DrawToolbarHint
          label="Redo"
          description="Redo the last undone edit (toolbar button)."
        >
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onPress={onRedo}
            isDisabled={!canRedo}
            aria-label="Redo"
            className="min-w-9 px-2"
          >
            <Redo2 className="h-4 w-4" aria-hidden />
          </Button>
        </DrawToolbarHint>
        <DrawToolbarHint label="Clear canvas" description="Remove all atoms and polymer marks.">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onPress={onClear}
            isDisabled={!hasStructure}
            aria-label="Clear canvas"
            className="min-w-9 px-2"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        </DrawToolbarHint>
      </Toolbar>

      <Toolbar className="flex flex-wrap items-center gap-1" aria-label="Layout tools">
        <ToggleButtonGroup
          aria-label="Layout tools"
          selectionMode="single"
          selectedKeys={layoutTool !== null ? new Set([layoutTool]) : new Set()}
          onSelectionChange={handleLayoutSelectionChange}
          className="gap-0.5"
        >
          {showCageOrbitTool ? (
            <DrawToolbarHint
              label="Orbit cage"
              description="Drag on the canvas to rotate fullerene cages in 3D. Double-click the tool to reset to face-on view."
            >
              <ToggleButton
                id="cage-orbit"
                size="sm"
                aria-label="Orbit cage in 3D"
                className="min-w-9 px-2"
                onDoubleClick={(event) => {
                  event.preventDefault();
                  onResetCageView();
                }}
              >
                <Globe className="h-4 w-4" aria-hidden />
              </ToggleButton>
            </DrawToolbarHint>
          ) : null}
          {LAYOUT_ITEMS.map((item) => (
            <DrawToolbarHint key={item.id} label={item.label} description={item.hint}>
              <ToggleButton
                id={item.id}
                size="sm"
                aria-label={item.label}
                className="min-w-9 px-2"
              >
                {item.icon}
              </ToggleButton>
            </DrawToolbarHint>
          ))}
        </ToggleButtonGroup>

        {layoutTool === "align" ? (
          <>
            <Separator className="bg-border mx-1 h-6" orientation="vertical" />
            <span className="text-muted px-1 text-xs" role="status">
              {alignAtomCount}/2 atoms
            </span>
            <DrawToolbarHint label="Align along X" description="Align the picked bond vector horizontally.">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onPress={() => onRunAlignAxis("x")}
                isDisabled={alignAtomCount !== 2}
                className="text-xs"
              >
                Along X
              </Button>
            </DrawToolbarHint>
            <DrawToolbarHint label="Align along Y" description="Align the picked bond vector vertically.">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onPress={() => onRunAlignAxis("y")}
                isDisabled={alignAtomCount !== 2}
                className="text-xs"
              >
                Along Y
              </Button>
            </DrawToolbarHint>
            <DrawToolbarHint label="Clear align picks" description="Reset atom picks for align.">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onPress={onClearAlignPicks}
                isDisabled={alignAtomCount === 0}
                aria-label="Clear align picks"
                className="min-w-9 px-2"
              >
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </DrawToolbarHint>
          </>
        ) : null}

        {layoutTool === "pivot" ? (
          <>
            <Separator className="bg-border mx-1 h-6" orientation="vertical" />
            <span className="text-muted px-1 text-xs" role="status">
              {pivotAtomCount}/2 atoms
            </span>
            <DrawToolbarHint
              label="Flip across bond"
              description="Mirror the smaller fragment across the pivot bond."
            >
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onPress={onRunPivotFlip}
                isDisabled={pivotAtomCount !== 2}
                className="text-xs"
              >
                Flip
              </Button>
            </DrawToolbarHint>
            <DrawToolbarHint label={`Rotate -${PIVOT_ROTATE_STEP_DEG}°`} description="Rotate the pivot fragment counterclockwise.">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onPress={() => onRunPivotRotate(-PIVOT_ROTATE_STEP_DEG)}
                isDisabled={pivotAtomCount !== 2}
                className="text-xs"
              >
                -{PIVOT_ROTATE_STEP_DEG}°
              </Button>
            </DrawToolbarHint>
            <DrawToolbarHint label={`Rotate +${PIVOT_ROTATE_STEP_DEG}°`} description="Rotate the pivot fragment clockwise.">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onPress={() => onRunPivotRotate(PIVOT_ROTATE_STEP_DEG)}
                isDisabled={pivotAtomCount !== 2}
                className="text-xs"
              >
                +{PIVOT_ROTATE_STEP_DEG}°
              </Button>
            </DrawToolbarHint>
            <DrawToolbarHint label="Clear pivot picks" description="Reset atoms picked for pivot.">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onPress={onClearPivotPicks}
                isDisabled={pivotAtomCount === 0}
                aria-label="Clear pivot picks"
                className="min-w-9 px-2"
              >
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </DrawToolbarHint>
          </>
        ) : null}
      </Toolbar>
    </div>
  );
}
