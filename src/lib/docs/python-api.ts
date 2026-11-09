/**
 * Typed access to the generated Python API document.
 *
 * `docs/generate_api.py` in the `atlas-python` submodule reads the client
 * source and writes `python-api.generated.json`. This module gives the docs
 * pages a typed view of that file, canonical ordering, anchors, and the
 * GitHub source URL for each member. Regenerate with `bun run docs:python-api`;
 * `bun run docs:python-api:check` fails when the committed file is stale.
 */

import rawApi from "~/lib/docs/python-api.generated.json";

/** One argument of a function or constructor, as written in the source. */
export interface PythonParameter {
  name: string;
  annotation: string | null;
  default: string | null;
  kind: "positional" | "vararg" | "keyword" | "kwarg" | "attribute" | "typeAlias";
  index: number;
}

/** A module constant or type alias. */
export interface PythonAttribute {
  name: string;
  qualname: string;
  kind: "attribute" | "typeAlias" | "constant";
  annotation: string | null;
  value: string | null;
  line: number;
}

/** One `Args:`, `Returns:`, `Raises:`, or `Attributes:` entry. */
export interface PythonDocEntry {
  name: string;
  type: string;
  description: string;
}

/** One parsed docstring section. */
export interface PythonDocSection {
  name: string;
  kind:
    | "parameters"
    | "returns"
    | "yields"
    | "raises"
    | "attributes"
    | "note"
    | "example";
  text: string;
  entries: PythonDocEntry[];
}

/** Summary, prose, and structured sections of a docstring. */
export interface PythonDoc {
  summary: string;
  description: string;
  sections: PythonDocSection[];
}

/** A method on a documented class. */
export interface PythonMethod {
  name: string;
  qualname: string;
  module: string;
  importPath: null;
  kind: "method";
  owner: string;
  isAsync: boolean;
  isClassMethod: boolean;
  isStaticMethod: boolean;
  isProperty: boolean;
  decorators: string[];
  signature: string;
  parameters: PythonParameter[];
  returns: { annotation: string | null };
  doc: PythonDoc;
  line: number;
  endLine: number;
}

/** A module-level function. */
export interface PythonFunction {
  name: string;
  qualname: string;
  module: string;
  importPath: string;
  kind: "function";
  owner: null;
  isAsync: boolean;
  isClassMethod: boolean;
  isStaticMethod: boolean;
  isProperty: boolean;
  decorators: string[];
  signature: string;
  parameters: PythonParameter[];
  returns: { annotation: string | null };
  doc: PythonDoc;
  line: number;
  endLine: number;
}

/** A class, dataclass, pydantic model, enum, or exception. */
export interface PythonClass {
  name: string;
  qualname: string;
  module: string;
  importPath: string;
  kind: "class" | "pydantic" | "dataclass" | "exception" | "enum";
  bases: string[];
  decorators: string[];
  doc: PythonDoc;
  constructor: PythonDoc | null;
  signature: string;
  parameters: PythonParameter[];
  fields: PythonAttribute[];
  attributes: PythonAttribute[];
  methods: PythonMethod[];
  line: number;
  endLine: number;
}

/** One source module of the package. */
export interface PythonModule {
  name: string;
  shortName: string;
  public: boolean;
  source: string;
  sourceSha256: string;
  line: number;
  doc: PythonDoc;
  classes: PythonClass[];
  functions: PythonFunction[];
  attributes: PythonAttribute[];
  usage: string[];
}

/** One name on the package's `__all__` surface. */
export interface PythonExport {
  name: string;
  importPath: string;
  objectPath: string;
  module: string;
  kind: string;
}

/** One documentation snippet shipped beside the client source. */
export interface PythonSnippet {
  name: string;
  file: string;
}

/** The generated document as a whole. */
export interface PythonApiDocument {
  schemaVersion: number;
  package: string;
  version: string | null;
  pythonRequires: string | null;
  sourceRoot: string;
  modules: PythonModule[];
  exports: PythonExport[];
  snippets: PythonSnippet[];
}

/** The generated document. */
export const pythonApi = rawApi as unknown as PythonApiDocument;

/** Repository that owns the documented source. */
export const pythonSourceRepo =
  "https://github.com/WSU-Carbon-Lab/atlas-python/blob/main";

/** Modules in display order: the package, public modules, then internals. */
export const pythonApiModules: readonly PythonModule[] = [
  ...pythonApi.modules.filter((item) => item.name === pythonApi.package),
  ...pythonApi.modules
    .filter((item) => item.public && item.name !== pythonApi.package)
    .sort((a, b) => a.name.localeCompare(b.name)),
  ...pythonApi.modules
    .filter((item) => !item.public)
    .sort((a, b) => a.name.localeCompare(b.name)),
];

/** Maps a Python dotted name to an anchor-safe id. */
export function pythonAnchor(...parts: readonly string[]): string {
  return parts
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Module anchor id. */
export function pythonModuleAnchor(module: PythonModule): string {
  return pythonAnchor("module", module.name);
}

/** Class or function anchor id. */
export function pythonMemberAnchor(
  module: PythonModule,
  member: { name: string },
): string {
  return pythonAnchor("member", module.name, member.name);
}

/** Method anchor id. */
export function pythonMethodAnchor(
  module: PythonModule,
  owner: string,
  method: { name: string },
): string {
  return pythonAnchor("method", module.name, owner, method.name);
}

/** GitHub URL for a line in the documented source. */
export function pythonSourceUrl(source: string, line: number): string {
  return `${pythonSourceRepo}/${source}#L${line}`;
}

/** Human label for a member kind badge. */
export function pythonKindLabel(kind: string): string {
  switch (kind) {
    case "pydantic":
      return "model";
    case "typeAlias":
      return "type";
    case "attribute":
      return "constant";
    default:
      return kind;
  }
}
