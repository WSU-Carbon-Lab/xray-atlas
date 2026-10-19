"use client";

import { LinkIcon } from "@heroicons/react/24/outline";
import { Button, ScrollShadow, Table } from "@heroui/react";
import Link from "next/link";
import {
  type ReactElement,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import { openApiV1Spec } from "~/app/api/v1/openapi/spec";

/**
 * Wiki visualization of the X-ray Atlas HTTP API v1 contract.
 *
 * Reads `openApiV1Spec` for paths, parameters, and response schemas. Does not
 * fetch the network. Catalog GETs stay anonymous. GET and DELETE /me require
 * the xatlas read credential.
 */

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"] as const;

const FIELD_DEPTH_LIMIT = 8;

type HttpMethod = (typeof HTTP_METHODS)[number];

type JsonSchemaNode = JsonSchemaObject | boolean;

interface JsonSchemaObject {
  readonly $ref?: string;
  readonly type?: string | readonly string[];
  readonly format?: string;
  readonly enum?: readonly (string | number | boolean | null)[];
  readonly const?: string | number | boolean | null;
  readonly default?: string | number | boolean | null;
  readonly description?: string;
  readonly minimum?: number;
  readonly maximum?: number;
  readonly exclusiveMinimum?: number | boolean;
  readonly exclusiveMaximum?: number | boolean;
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly minItems?: number;
  readonly maxItems?: number;
  readonly pattern?: string;
  readonly nullable?: boolean;
  readonly required?: readonly string[];
  readonly properties?: Readonly<Record<string, JsonSchemaNode>>;
  readonly items?: JsonSchemaNode | readonly JsonSchemaNode[];
  readonly additionalProperties?: JsonSchemaNode;
  readonly allOf?: readonly JsonSchemaNode[];
  readonly oneOf?: readonly JsonSchemaNode[];
  readonly anyOf?: readonly JsonSchemaNode[];
}

interface OpenApiParameterView {
  readonly $ref?: string;
  readonly name?: string;
  readonly in?: string;
  readonly required?: boolean;
  readonly description?: string;
  readonly schema?: JsonSchemaNode;
}

interface OpenApiMediaTypeView {
  readonly schema?: JsonSchemaNode;
}

interface OpenApiResponseView {
  readonly $ref?: string;
  readonly description?: string;
  readonly content?: Readonly<Record<string, OpenApiMediaTypeView>>;
}

interface OpenApiOperationView {
  readonly tags?: readonly string[];
  readonly summary?: string;
  readonly description?: string;
  readonly parameters?: readonly OpenApiParameterView[];
  readonly responses?: Readonly<Record<string, OpenApiResponseView>>;
  readonly security?: readonly Readonly<Record<string, readonly string[]>>[];
}

interface OpenApiPathItemView {
  readonly parameters?: readonly OpenApiParameterView[];
  readonly get?: OpenApiOperationView;
  readonly post?: OpenApiOperationView;
  readonly put?: OpenApiOperationView;
  readonly patch?: OpenApiOperationView;
  readonly delete?: OpenApiOperationView;
}

interface OpenApiDocumentView {
  readonly info: {
    readonly title: string;
    readonly version: string;
    readonly summary?: string;
    readonly description?: string;
  };
  readonly servers?: readonly {
    readonly url: string;
    readonly description?: string;
  }[];
  readonly tags?: readonly {
    readonly name: string;
    readonly description?: string;
  }[];
  readonly security?: readonly Readonly<Record<string, readonly string[]>>[];
  readonly paths: Readonly<Record<string, OpenApiPathItemView>>;
  readonly components?: {
    readonly schemas?: Readonly<Record<string, JsonSchemaNode>>;
    readonly parameters?: Readonly<Record<string, OpenApiParameterView>>;
    readonly responses?: Readonly<Record<string, OpenApiResponseView>>;
  };
}

export interface ResolvedParameter {
  readonly name: string;
  readonly location: string;
  readonly required: boolean;
  readonly description: string;
  readonly constraints: string;
}

export interface ResponseFieldGroup {
  readonly mediaType: string;
  readonly names: readonly string[];
}

export interface ParsedResponse {
  readonly status: string;
  readonly description: string;
  readonly fieldGroups: readonly ResponseFieldGroup[];
  readonly labelMediaTypes: boolean;
}

export interface ParsedOperation {
  readonly key: string;
  readonly method: HttpMethod;
  readonly methodLabel: string;
  readonly summary: string;
  readonly description: string;
  readonly authentication: string;
  readonly pathTemplate: string;
  readonly displayPath: string;
  readonly catalogTag: string | null;
  readonly contract: boolean;
  readonly parameters: readonly ResolvedParameter[];
  readonly responses: readonly ParsedResponse[];
}

interface ParameterRow {
  readonly id: string;
  readonly name: string;
  readonly location: string;
  readonly requirement: "required" | "optional";
  readonly constraints: string;
  readonly description: string;
}

interface ResponseRow {
  readonly id: string;
  readonly status: string;
  readonly description: string;
  readonly fieldGroups: readonly ResponseFieldGroup[];
  readonly labelMediaTypes: boolean;
}

function isHttpMethod(value: string): value is HttpMethod {
  return (HTTP_METHODS as readonly string[]).includes(value);
}

function httpMethodLabel(method: HttpMethod): string {
  switch (method) {
    case "get":
      return "GET";
    case "post":
      return "POST";
    case "put":
      return "PUT";
    case "patch":
      return "PATCH";
    case "delete":
      return "DELETE";
    default: {
      const unreachable: never = method;
      return unreachable;
    }
  }
}

function isJsonSchemaList(
  value: JsonSchemaNode | readonly JsonSchemaNode[],
): value is readonly JsonSchemaNode[] {
  return Array.isArray(value);
}

function schemaItems(
  items: JsonSchemaNode | readonly JsonSchemaNode[] | undefined,
): readonly JsonSchemaNode[] {
  if (items === undefined || typeof items === "boolean") {
    return [];
  }
  if (isJsonSchemaList(items)) {
    return items;
  }
  return [items];
}

function dedupeStrings(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    unique.push(value);
  }
  return unique;
}

function resolveSchemaRef(
  ref: string,
  schemas: Readonly<Record<string, JsonSchemaNode>> | undefined,
): JsonSchemaNode | undefined {
  const marker = "#/components/schemas/";
  if (!schemas || !ref.startsWith(marker)) {
    return undefined;
  }
  return schemas[ref.slice(marker.length)];
}

function collectFieldNames(
  schema: JsonSchemaNode | undefined,
  schemas: Readonly<Record<string, JsonSchemaNode>> | undefined,
  prefix: string,
  depth: number,
  seenRefs: ReadonlySet<string>,
): string[] {
  if (
    schema === undefined ||
    typeof schema === "boolean" ||
    depth > FIELD_DEPTH_LIMIT
  ) {
    return [];
  }
  if (schema.$ref) {
    if (seenRefs.has(schema.$ref)) {
      return [];
    }
    const resolved = resolveSchemaRef(schema.$ref, schemas);
    if (resolved === undefined) {
      return [];
    }
    const nextSeen = new Set(seenRefs);
    nextSeen.add(schema.$ref);
    return collectFieldNames(resolved, schemas, prefix, depth, nextSeen);
  }

  const names: string[] = [];
  const combiners = [
    ...(schema.allOf ?? []),
    ...(schema.anyOf ?? []),
    ...(schema.oneOf ?? []),
  ];
  for (const part of combiners) {
    names.push(...collectFieldNames(part, schemas, prefix, depth, seenRefs));
  }

  if (schema.properties) {
    for (const [key, child] of Object.entries(schema.properties)) {
      const path = prefix.length > 0 ? `${prefix}.${key}` : key;
      const nested = collectFieldNames(
        child,
        schemas,
        path,
        depth + 1,
        seenRefs,
      );
      if (nested.length === 0) {
        names.push(path);
      } else {
        names.push(...nested);
      }
    }
  }

  const items = schemaItems(schema.items);
  if (schema.properties === undefined && items.length === 1) {
    const itemPrefix = prefix.length > 0 ? `${prefix}[]` : "";
    names.push(
      ...collectFieldNames(items[0], schemas, itemPrefix, depth + 1, seenRefs),
    );
  } else if (schema.properties === undefined && items.length > 1) {
    items.forEach((item, index) => {
      const itemPrefix =
        prefix.length > 0 ? `${prefix}[${index}]` : `[${index}]`;
      const nested = collectFieldNames(
        item,
        schemas,
        itemPrefix,
        depth + 1,
        seenRefs,
      );
      if (nested.length === 0) {
        names.push(itemPrefix);
      } else {
        names.push(...nested);
      }
    });
  }

  return dedupeStrings(names);
}

function schemaTypeText(type: string | readonly string[] | undefined): string {
  if (type === undefined) {
    return "";
  }
  const parts = typeof type === "string" ? [type] : [...type];
  return parts.join(" | ");
}

function schemaLiteral(value: string | number | boolean | null): string {
  return value === null ? "null" : String(value);
}

function schemaConstraintText(schema: JsonSchemaNode | undefined): string {
  if (schema === undefined) {
    return "unspecified";
  }
  if (typeof schema === "boolean") {
    return schema ? "any" : "not allowed";
  }
  if (schema.$ref) {
    const name = schema.$ref.split("/").pop();
    return name && name.length > 0 ? name : "ref";
  }

  const parts: string[] = [];
  const typeText = schemaTypeText(schema.type);
  if (typeText.length > 0) {
    parts.push(typeText);
  }
  if (schema.format) {
    parts.push(schema.format);
  }
  if (schema.enum && schema.enum.length > 0) {
    parts.push(
      `enum ${schema.enum.map((value) => schemaLiteral(value)).join(" | ")}`,
    );
  }
  if (schema.const !== undefined) {
    parts.push(`const ${schemaLiteral(schema.const)}`);
  }
  if (schema.minLength !== undefined) {
    parts.push(`minLength ${schema.minLength}`);
  }
  if (schema.maxLength !== undefined) {
    parts.push(`maxLength ${schema.maxLength}`);
  }
  if (schema.minimum !== undefined) {
    parts.push(`minimum ${schema.minimum}`);
  }
  if (schema.maximum !== undefined) {
    parts.push(`maximum ${schema.maximum}`);
  }
  if (typeof schema.exclusiveMinimum === "number") {
    parts.push(`exclusiveMinimum ${schema.exclusiveMinimum}`);
  }
  if (typeof schema.exclusiveMaximum === "number") {
    parts.push(`exclusiveMaximum ${schema.exclusiveMaximum}`);
  }
  if (schema.minItems !== undefined) {
    parts.push(`minItems ${schema.minItems}`);
  }
  if (schema.maxItems !== undefined) {
    parts.push(`maxItems ${schema.maxItems}`);
  }
  if (schema.pattern) {
    parts.push(`pattern ${schema.pattern}`);
  }
  if (schema.default !== undefined) {
    parts.push(`default ${schemaLiteral(schema.default)}`);
  }
  if (schema.nullable) {
    parts.push("nullable");
  }
  if (parts.length === 0 && schema.properties) {
    parts.push("object");
  }
  if (parts.length === 0 && schema.items !== undefined) {
    parts.push("array");
  }
  if (parts.length === 0 && (schema.allOf || schema.anyOf || schema.oneOf)) {
    parts.push("composition");
  }
  if (parts.length === 0) {
    parts.push("unspecified");
  }
  return parts.join(", ");
}

function resolveParameter(
  parameter: OpenApiParameterView,
  spec: OpenApiDocumentView,
): OpenApiParameterView | undefined {
  if (!parameter.$ref) {
    return parameter;
  }
  const marker = "#/components/parameters/";
  if (!parameter.$ref.startsWith(marker)) {
    return undefined;
  }
  return spec.components?.parameters?.[parameter.$ref.slice(marker.length)];
}

function mergeParameters(
  pathParameters: readonly OpenApiParameterView[] | undefined,
  operationParameters: readonly OpenApiParameterView[] | undefined,
  spec: OpenApiDocumentView,
): ResolvedParameter[] {
  const merged = new Map<string, ResolvedParameter>();
  const sources = [...(pathParameters ?? []), ...(operationParameters ?? [])];
  for (const source of sources) {
    const parameter = resolveParameter(source, spec);
    if (!parameter?.name || !parameter.in) {
      continue;
    }
    merged.set(`${parameter.in}:${parameter.name}`, {
      name: parameter.name,
      location: parameter.in,
      required: parameter.in === "path" || parameter.required === true,
      description: parameter.description ?? "",
      constraints: schemaConstraintText(parameter.schema),
    });
  }
  return [...merged.values()];
}

function resolveResponse(
  response: OpenApiResponseView,
  spec: OpenApiDocumentView,
  seen: ReadonlySet<string>,
): OpenApiResponseView {
  if (!response.$ref || seen.has(response.$ref)) {
    return response;
  }
  const marker = "#/components/responses/";
  if (!response.$ref.startsWith(marker)) {
    return response;
  }
  const target =
    spec.components?.responses?.[response.$ref.slice(marker.length)];
  if (!target) {
    return response;
  }
  const nextSeen = new Set(seen);
  nextSeen.add(response.$ref);
  return resolveResponse(target, spec, nextSeen);
}

function responseFieldGroups(
  response: OpenApiResponseView,
  schemas: Readonly<Record<string, JsonSchemaNode>> | undefined,
): ResponseFieldGroup[] {
  if (!response.content) {
    return [];
  }
  const groups: ResponseFieldGroup[] = [];
  for (const [mediaType, body] of Object.entries(response.content)) {
    if (body?.schema === undefined) {
      continue;
    }
    const names = collectFieldNames(body.schema, schemas, "", 0, new Set());
    if (names.length === 0) {
      continue;
    }
    groups.push({ mediaType, names });
  }
  return groups;
}

function compareStatusCodes(left: string, right: string): number {
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  const leftNumeric = Number.isFinite(leftNumber);
  const rightNumeric = Number.isFinite(rightNumber);
  if (leftNumeric && rightNumeric) {
    return leftNumber - rightNumber;
  }
  if (leftNumeric) {
    return -1;
  }
  if (rightNumeric) {
    return 1;
  }
  return left.localeCompare(right);
}

function parseResponses(
  operation: OpenApiOperationView,
  spec: OpenApiDocumentView,
): ParsedResponse[] {
  const entries = Object.entries(operation.responses ?? {});
  entries.sort(([left], [right]) => compareStatusCodes(left, right));
  return entries.map(([status, response]) => {
    const resolved = resolveResponse(response, spec, new Set());
    const contentCount = Object.keys(resolved.content ?? {}).length;
    const description =
      resolved.description && resolved.description.length > 0
        ? resolved.description
        : (response.$ref ?? "");
    return {
      status,
      description,
      fieldGroups: responseFieldGroups(resolved, spec.components?.schemas),
      labelMediaTypes: contentCount > 1,
    };
  });
}

function securityIsActive(
  requirements:
    | readonly Readonly<Record<string, readonly string[]>>[]
    | undefined,
): boolean | undefined {
  if (!requirements) {
    return undefined;
  }
  return requirements.some(
    (requirement) => Object.keys(requirement).length > 0,
  );
}

function operationIsSecured(
  operation: OpenApiOperationView,
  spec: OpenApiDocumentView,
): boolean {
  const local = securityIsActive(operation.security);
  if (local !== undefined) {
    return local;
  }
  return securityIsActive(spec.security) ?? false;
}

function authenticationLabel(method: HttpMethod, secured: boolean): string {
  if (!secured && method === "get") {
    return "None. Catalog reads are public.";
  }
  if (!secured) {
    return "None.";
  }
  return "Bearer account API key.";
}

function exampleQueryValue(
  parameter: ResolvedParameter,
  schema: JsonSchemaNode | undefined,
): string {
  if (parameter.name === "doi") {
    return "10.1000/example";
  }
  if (parameter.name === "atom") {
    return "C";
  }
  if (schema === undefined || typeof schema === "boolean") {
    return "example";
  }
  if (schema.default !== undefined && schema.default !== null) {
    return schemaLiteral(schema.default);
  }
  const enumValue = schema.enum?.find((value) => value !== null);
  if (enumValue !== undefined) {
    return schemaLiteral(enumValue);
  }
  if (schema.const !== undefined && schema.const !== null) {
    return schemaLiteral(schema.const);
  }
  if (schema.format === "uuid") {
    return "00000000-0000-4000-8000-000000000000";
  }
  const typeName = Array.isArray(schema.type)
    ? schema.type.find((entry) => entry !== "null")
    : schema.type;
  if (typeName === "integer" || typeName === "number") {
    if (typeof schema.minimum === "number" && schema.minimum > 0) {
      return String(schema.minimum);
    }
    return "1";
  }
  if (typeName === "boolean") {
    return "true";
  }
  return "example";
}

function pathPlaceholder(name: string): string {
  if (name === "moleculeId") {
    return "YOUR_MOLECULE_ID";
  }
  const normalized = name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();
  return `YOUR_${normalized}`;
}

function applyPathPlaceholders(path: string): string {
  return path.replace(/\{([^}]+)\}/g, (_match: string, name: string) =>
    pathPlaceholder(name),
  );
}

function serverBasePath(spec: OpenApiDocumentView): string {
  const url = spec.servers?.[0]?.url ?? "";
  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      return new URL(url).pathname.replace(/\/$/, "");
    } catch {
      return "";
    }
  }
  return url.replace(/\/$/, "");
}

function joinBase(base: string, path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  if (base.length === 0) {
    return suffix;
  }
  if (suffix === base || suffix.startsWith(`${base}/`)) {
    return suffix;
  }
  return `${base}${suffix}`;
}

function requiredQueryString(
  parameters: readonly OpenApiParameterView[],
  spec: OpenApiDocumentView,
): string {
  const parts: string[] = [];
  for (const source of parameters) {
    const parameter = resolveParameter(source, spec);
    if (
      !parameter?.name ||
      parameter.in !== "query" ||
      parameter.required !== true
    ) {
      continue;
    }
    const value = exampleQueryValue(
      {
        name: parameter.name,
        location: parameter.in,
        required: true,
        description: parameter.description ?? "",
        constraints: "",
      },
      parameter.schema,
    );
    const encoded = encodeURIComponent(value).replaceAll("%2F", "/");
    parts.push(`${encodeURIComponent(parameter.name)}=${encoded}`);
  }
  return parts.join("&");
}

function displayPathFor(
  spec: OpenApiDocumentView,
  path: string,
  parameters: readonly OpenApiParameterView[],
): string {
  const replaced = applyPathPlaceholders(path);
  const joined = joinBase(serverBasePath(spec), replaced);
  const query = requiredQueryString(parameters, spec);
  return query.length > 0 ? `${joined}?${query}` : joined;
}

function catalogTagName(operation: OpenApiOperationView): string | null {
  for (const tag of operation.tags ?? []) {
    if (tag !== "Contract") {
      return tag;
    }
  }
  return null;
}

/**
 * Reads every HTTP operation from the v1 OpenAPI document.
 *
 * `spec` defaults to `openApiV1Spec`. Path templates stay relative to the
 * `/api/v1` server. Contract operations keep `contract` true and a null tag.
 *
 * @returns Operations in document order.
 */
export function readApiV1Operations(
  spec: OpenApiDocumentView = openApiV1Spec,
): ParsedOperation[] {
  const operations: ParsedOperation[] = [];
  for (const [path, item] of Object.entries(spec.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = item[method];
      if (!operation || !isHttpMethod(method)) {
        continue;
      }
      const parameters = [
        ...(item.parameters ?? []),
        ...(operation.parameters ?? []),
      ];
      const contract = (operation.tags ?? []).includes("Contract");
      operations.push({
        key: `${method} ${path}`,
        method,
        methodLabel: httpMethodLabel(method),
        summary: operation.summary ?? path,
        description: operation.description ?? "",
        authentication: authenticationLabel(
          method,
          operationIsSecured(operation, spec),
        ),
        pathTemplate: path,
        displayPath: displayPathFor(spec, path, parameters),
        catalogTag: contract ? null : catalogTagName(operation),
        contract,
        parameters: mergeParameters(
          item.parameters,
          operation.parameters,
          spec,
        ),
        responses: parseResponses(operation, spec),
      });
    }
  }
  return operations;
}

function headingIdForTag(tag: string): string {
  if (tag === "Molecules") {
    return "molecules";
  }
  if (tag === "Datasets") {
    return "datasets";
  }
  if (tag === "Compatibility") {
    return "compatibility";
  }
  if (tag === "Physics") {
    return "physics";
  }
  const slug = tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (
    slug.length === 0 ||
    slug === "overview" ||
    slug === "api-keys" ||
    slug === "molecules" ||
    slug === "datasets" ||
    slug === "physics" ||
    slug === "compatibility" ||
    slug === "authentication"
  ) {
    return `tag-${slug || "extra"}`;
  }
  return slug;
}

function absoluteCopyUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${window.location.origin}${suffix}`;
}

function MethodBadge({ method }: { method: string }): ReactElement {
  return (
    <span className="bg-default text-foreground shrink-0 rounded-md px-1.5 py-0.5 font-mono text-xs font-medium tracking-wide">
      {method}
    </span>
  );
}

function CopyUrlButton({ path }: { path: string }): ReactElement {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = timerRef;
    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
    };
  }, []);

  return (
    <Button
      size="sm"
      variant="outline"
      aria-label={copied ? "Copied URL" : `Copy URL ${path}`}
      onPress={() => {
        void copyUrl(path, setCopied, timerRef);
      }}
    >
      <LinkIcon className="size-4" aria-hidden />
      {copied ? "Copied" : "Copy URL"}
    </Button>
  );
}

async function copyUrl(
  path: string,
  setCopied: (copied: boolean) => void,
  timerRef: RefObject<number | null>,
): Promise<void> {
  try {
    await navigator.clipboard.writeText(absoluteCopyUrl(path));
    setCopied(true);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setCopied(false);
      timerRef.current = null;
    }, 2000);
  } catch {
    setCopied(false);
  }
}

function ParameterTable({
  operationKey,
  parameters,
}: {
  operationKey: string;
  parameters: readonly ResolvedParameter[];
}): ReactElement {
  if (parameters.length === 0) {
    return <p className="text-muted text-sm">None.</p>;
  }

  const rows: ParameterRow[] = parameters.map((parameter) => ({
    id: `${operationKey}-${parameter.location}-${parameter.name}`,
    name: parameter.name,
    location: parameter.location,
    requirement: parameter.required ? "required" : "optional",
    constraints: parameter.constraints,
    description: parameter.description,
  }));

  return (
    <ScrollShadow
      orientation="horizontal"
      className="w-full min-w-0"
      tabIndex={0}
      aria-label="Parameter table"
    >
      <div className="w-max min-w-full">
        <Table
          variant="secondary"
          className="!w-max max-w-none !overflow-visible"
        >
          <Table.Content aria-label="Parameters">
            <Table.Header>
              <Table.Column id="name" isRowHeader className="text-left">
                Name
              </Table.Column>
              <Table.Column id="location" className="text-left">
                In
              </Table.Column>
              <Table.Column id="requirement" className="text-left">
                Required
              </Table.Column>
              <Table.Column id="constraints" className="text-left">
                Type and constraints
              </Table.Column>
            </Table.Header>
            <Table.Body items={rows}>
              {(row) => (
                <Table.Row id={row.id}>
                  <Table.Cell className="align-top whitespace-normal">
                    <code className="text-foreground font-mono text-xs break-all">
                      {row.name}
                    </code>
                    {row.description.length > 0 ? (
                      <p className="text-muted mt-1 text-xs break-words">
                        {row.description}
                      </p>
                    ) : null}
                  </Table.Cell>
                  <Table.Cell className="text-foreground align-top text-xs whitespace-nowrap">
                    {row.location}
                  </Table.Cell>
                  <Table.Cell className="text-foreground align-top text-xs whitespace-nowrap">
                    {row.requirement}
                  </Table.Cell>
                  <Table.Cell className="text-foreground max-w-xs align-top text-xs break-words whitespace-normal">
                    {row.constraints}
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table.Content>
        </Table>
      </div>
    </ScrollShadow>
  );
}

function ResponseFields({
  groups,
  labelMediaTypes,
}: {
  groups: readonly ResponseFieldGroup[];
  labelMediaTypes: boolean;
}): ReactElement | null {
  if (groups.length === 0) {
    return null;
  }
  return (
    <div className="space-y-2">
      {groups.map((group) => (
        <div key={group.mediaType} className="space-y-1">
          {labelMediaTypes ? (
            <p className="text-muted text-xs">{group.mediaType}</p>
          ) : null}
          <ul className="flex flex-wrap gap-x-2 gap-y-1">
            {group.names.map((name) => (
              <li key={`${group.mediaType}-${name}`}>
                <code className="text-foreground font-mono text-xs break-all">
                  {name}
                </code>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ResponseTable({
  operationKey,
  responses,
}: {
  operationKey: string;
  responses: readonly ParsedResponse[];
}): ReactElement {
  if (responses.length === 0) {
    return <p className="text-muted text-sm">None documented.</p>;
  }

  const rows: ResponseRow[] = responses.map((response) => ({
    id: `${operationKey}-${response.status}`,
    status: response.status,
    description: response.description,
    fieldGroups: response.fieldGroups,
    labelMediaTypes: response.labelMediaTypes,
  }));

  return (
    <ScrollShadow
      orientation="horizontal"
      className="w-full min-w-0"
      tabIndex={0}
      aria-label="Response table"
    >
      <div className="w-max min-w-full">
        <Table
          variant="secondary"
          className="!w-max max-w-none !overflow-visible"
        >
          <Table.Content aria-label="Responses">
            <Table.Header>
              <Table.Column id="status" isRowHeader className="text-left">
                Status
              </Table.Column>
              <Table.Column id="description" className="text-left">
                Description
              </Table.Column>
              <Table.Column id="fields" className="text-left">
                JSON fields
              </Table.Column>
            </Table.Header>
            <Table.Body items={rows}>
              {(row) => (
                <Table.Row id={row.id}>
                  <Table.Cell className="text-foreground align-top text-xs whitespace-nowrap">
                    {row.status}
                  </Table.Cell>
                  <Table.Cell className="text-foreground max-w-md align-top text-xs break-words whitespace-normal">
                    {row.description}
                  </Table.Cell>
                  <Table.Cell className="max-w-xl align-top whitespace-normal">
                    <ResponseFields
                      groups={row.fieldGroups}
                      labelMediaTypes={row.labelMediaTypes}
                    />
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table.Content>
        </Table>
      </div>
    </ScrollShadow>
  );
}

function OperationCard({
  operation,
}: {
  operation: ParsedOperation;
}): ReactElement {
  return (
    <article className="border-border space-y-4 border-b py-8 first:pt-2 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <MethodBadge method={operation.methodLabel} />
            <code className="text-foreground min-w-0 font-mono text-sm break-all">
              {operation.displayPath}
            </code>
          </div>
          <h3 className="text-foreground text-base font-medium">
            {operation.summary}
          </h3>
        </div>
        <CopyUrlButton path={operation.displayPath} />
      </div>
      {operation.description.length > 0 ? (
        <p className="text-muted text-sm leading-relaxed break-words">
          {operation.description}
        </p>
      ) : null}
      <p className="text-muted text-sm">
        <span className="text-foreground font-medium">Authentication.</span>{" "}
        {operation.authentication}
      </p>
      <div className="space-y-2">
        <h4 className="text-foreground text-sm font-medium">Parameters</h4>
        <ParameterTable
          operationKey={operation.key}
          parameters={operation.parameters}
        />
      </div>
      <div className="space-y-2">
        <h4 className="text-foreground text-sm font-medium">Responses</h4>
        <ResponseTable
          operationKey={operation.key}
          responses={operation.responses}
        />
      </div>
    </article>
  );
}

function AuthenticationSection(): ReactElement {
  return (
    <section className="space-y-4">
      <h2
        id="authentication"
        className="text-foreground text-xl font-semibold tracking-tight"
      >
        Authentication
      </h2>
      <p className="text-muted leading-relaxed">
        Catalog routes on this page are public reads. GET /me identifies the
        xatlas credential. The steps are on the{" "}
        <Link href="/docs/cli" className="text-accent hover:underline">
          CLI docs
        </Link>
        .
      </p>
      <dl className="border-border divide-border divide-y rounded-xl border">
        <div className="grid gap-1 px-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
          <dt className="text-foreground font-medium">Public reads</dt>
          <dd className="text-muted">
            Molecules, datasets, BibTeX, archives, Henke tables, and the OpenAPI
            document. A key is optional. A bad key on molecule and dataset lists
            returns 401.
          </dd>
        </div>
        <div className="grid gap-1 px-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
          <dt className="text-foreground font-medium">xatlas credential</dt>
          <dd className="text-muted">
            Required on GET /me and DELETE /me. Mint it with xatlas login, which
            confirms a passkey and stores the token in the CLI. A missing,
            malformed, unknown, or revoked key returns 401{" "}
            <code className="text-foreground">
              {'{ "error": "Unauthorized" }'}
            </code>{" "}
            and{" "}
            <code className="text-foreground">WWW-Authenticate: Bearer</code>.
            The website still writes through the signed-in session.
          </dd>
        </div>
      </dl>
      <pre className="border-border bg-surface overflow-x-auto rounded-xl border px-4 py-3">
        <code className="text-foreground font-mono text-sm">
          Authorization: Bearer xra_...
        </code>
      </pre>
    </section>
  );
}

function OverviewSection({
  spec,
}: {
  spec: OpenApiDocumentView;
}): ReactElement {
  const base = serverBasePath(spec) || "/api/v1";
  return (
    <section className="space-y-4">
      <h2
        id="overview"
        className="text-foreground text-xl font-semibold tracking-tight"
      >
        Overview
      </h2>
      <p className="text-muted leading-relaxed">{spec.info.description}</p>
      <dl className="border-border divide-border divide-y rounded-xl border">
        <div className="grid gap-1 px-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
          <dt className="text-foreground font-medium">Base path</dt>
          <dd>
            <code className="text-foreground font-mono text-sm">{base}</code>
          </dd>
        </div>
        <div className="grid gap-1 px-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
          <dt className="text-foreground font-medium">Contract</dt>
          <dd className="text-muted">
            <code className="text-foreground font-mono text-sm">
              GET {base}/openapi
            </code>{" "}
            returns this document as JSON. Add{" "}
            <code className="text-foreground font-mono text-sm">
              ?format=yaml
            </code>{" "}
            for YAML.
          </dd>
        </div>
      </dl>
    </section>
  );
}

/**
 * Renders the v1 overview and bearer contract at the same column width as the
 * route pages.
 *
 * @returns Overview and authentication sections.
 */
export function ApiV1Overview(): ReactElement {
  return (
    <div className="w-full min-w-0 space-y-12">
      <OverviewSection spec={openApiV1Spec} />
      <AuthenticationSection />
    </div>
  );
}

/**
 * Renders one v1 resource page from `openApiV1Spec`.
 *
 * `tags` selects OpenAPI tags, in that order. `title` is the page heading.
 * `lede` is the sentence under the heading. Each tag with operations gets an
 * `h2` whose id matches the wiki outline.
 *
 * @returns The operation list for those tags.
 */
export function ApiV1Resource({
  tags,
  title,
  lede,
}: {
  tags: readonly string[];
  title: string;
  lede: string;
}): ReactElement {
  const operations = readApiV1Operations();
  const groups = tags
    .map((tag) => ({
      tag,
      headingId: headingIdForTag(tag),
      operations: operations.filter(
        (operation) => operation.catalogTag === tag,
      ),
    }))
    .filter((group) => group.operations.length > 0);

  const firstHeadingId = groups[0]?.headingId;

  return (
    <section className="w-full min-w-0 space-y-8">
      <header className="space-y-2">
        <h1
          id={firstHeadingId}
          className="text-foreground text-3xl font-semibold tracking-tight"
        >
          {title}
        </h1>
        <p className="text-muted leading-relaxed">{lede}</p>
      </header>
      {groups.map((group, index) => (
        <div key={group.tag}>
          {index > 0 ? (
            <h2
              id={group.headingId}
              className="text-foreground text-xl font-semibold tracking-tight"
            >
              {group.tag === "Compatibility" ? "Search" : group.tag}
            </h2>
          ) : null}
          {group.operations.map((operation) => (
            <OperationCard key={operation.key} operation={operation} />
          ))}
        </div>
      ))}
    </section>
  );
}
