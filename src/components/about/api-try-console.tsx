"use client";

import {
  Button,
  Input,
  Label,
  ListBox,
  Select,
  TextField,
} from "@heroui/react";
import { usePathname } from "next/navigation";
import { type ReactElement, useMemo, useState } from "react";
import {
  readApiV1Operations,
  type ParsedOperation,
  type ResolvedParameter,
} from "~/components/about/api-v1-reference";

const RESPONSE_CHAR_LIMIT = 4000;
const TRY_LIMIT_MAX = 2;

/**
 * Runs a documented v1 GET from the browser, or shows a template of the
 * success body, so a caller can see the contract without leaving the docs.
 *
 * Only paths from `openApiV1Spec` are requested. `limit` is clamped to 2.
 * Gzip archives report status and byte length. Redirects report the final URL.
 *
 * @returns The operation picker, parameter fields, and the latest result.
 */
export function ApiTryConsole(): ReactElement {
  const pathname = usePathname();
  const operations = useMemo(() => readApiV1Operations(), []);
  const [operationKey, setOperationKey] = useState(() =>
    defaultOperationKey(pathname, operations),
  );
  const operation =
    operations.find((entry) => entry.key === operationKey) ?? operations[0];
  const defaults = useMemo(() => defaultValuesFor(operation), [operation]);
  const [draft, setDraft] = useState<{
    key: string;
    values: Record<string, string>;
  } | null>(null);
  const values =
    draft !== null && draft.key === operation?.key ? draft.values : defaults;
  const [resultState, setResultState] = useState({ key: "", text: "" });
  const result = resultState.key === operation?.key ? resultState.text : "";
  const [pending, setPending] = useState(false);

  if (!operation) {
    return <p className="text-muted text-sm">No operations are published.</p>;
  }

  const requestPath = buildRequestPath(operation, values);

  return (
    <section className="border-border bg-surface w-full min-w-0 space-y-4 rounded-xl border p-4">
      <div className="space-y-1">
        <h2 className="text-foreground text-base font-medium">Try a request</h2>
        <p className="text-muted text-sm leading-relaxed">
          Run sends a public GET on this site. Template shows the success body
          shape without calling the server. Archives report size only.
        </p>
      </div>
      <Select
        aria-label="Operation"
        fullWidth
        selectedKey={operation.key}
        variant="secondary"
        onSelectionChange={(key) => {
          if (key != null) {
            setOperationKey(String(key));
          }
        }}
      >
        <Label>Operation</Label>
        <Select.Trigger className="border-border bg-background w-full rounded-lg border">
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {operations.map((entry) => (
              <ListBox.Item
                key={entry.key}
                id={entry.key}
                textValue={`${entry.methodLabel} ${entry.pathTemplate}`}
              >
                {entry.methodLabel} {entry.pathTemplate}
                <span className="text-muted"> {entry.summary}</span>
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
      {operation.parameters.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {operation.parameters.map((parameter) => (
            <TextField
              key={`${operation.key}-${parameter.location}-${parameter.name}`}
              value={values[parameter.name] ?? ""}
              onChange={(value) => {
                setDraft({
                  key: operation.key,
                  values: {
                    ...values,
                    [parameter.name]: value,
                  },
                });
              }}
            >
              <Label>
                {parameter.name}
                <span className="text-muted font-normal">
                  {" "}
                  {parameter.location}
                  {parameter.required ? "" : ", optional"}
                </span>
              </Label>
              <Input
                className="border-border bg-background font-mono"
                placeholder={parameter.required ? "Required" : "Optional"}
              />
            </TextField>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="primary"
          isDisabled={requestPath === null || pending}
          isPending={pending}
          onPress={() => {
            if (requestPath === null) {
              return;
            }
            const key = operation.key;
            setPending(true);
            void runRequest(requestPath)
              .then((text) => setResultState({ key, text }))
              .finally(() => setPending(false));
          }}
        >
          Run
        </Button>
        <Button
          size="sm"
          variant="outline"
          onPress={() =>
            setResultState({
              key: operation.key,
              text: templateFor(operation),
            })
          }
        >
          Template
        </Button>
      </div>
      {requestPath === null ? (
        <p className="text-muted text-sm">
          Fill every path parameter before running.
        </p>
      ) : (
        <p className="text-muted font-mono text-xs break-all">{requestPath}</p>
      )}
      {result.length > 0 ? (
        <pre className="border-border bg-background max-h-80 overflow-auto rounded-lg border p-3">
          <code className="text-foreground font-mono text-xs break-words whitespace-pre-wrap">
            {result}
          </code>
        </pre>
      ) : null}
    </section>
  );
}

function defaultOperationKey(
  pathname: string,
  operations: readonly ParsedOperation[],
): string {
  const preferred = pathname.startsWith("/wiki/api/v1/datasets")
    ? "/datasets"
    : pathname.startsWith("/wiki/api/v1/physics")
      ? "/physics/atomic-form-factor"
      : "/molecules";
  return (
    operations.find((operation) => operation.pathTemplate === preferred)?.key ??
    operations[0]?.key ??
    ""
  );
}

function defaultValuesFor(
  operation: ParsedOperation | undefined,
): Record<string, string> {
  if (!operation) {
    return {};
  }
  const next: Record<string, string> = {};
  for (const parameter of operation.parameters) {
    next[parameter.name] = defaultParameterValue(parameter);
  }
  return next;
}

function defaultParameterValue(parameter: ResolvedParameter): string {
  if (parameter.location === "path") {
    return "";
  }
  if (parameter.name === "atom") {
    return "C";
  }
  if (parameter.name === "q") {
    return "benzene";
  }
  if (parameter.name === "limit") {
    return "1";
  }
  if (parameter.name === "offset") {
    return "0";
  }
  if (parameter.name === "format") {
    return "json";
  }
  return "";
}

function buildRequestPath(
  operation: ParsedOperation,
  values: Readonly<Record<string, string>>,
): string | null {
  if (operation.method !== "get") {
    return null;
  }
  let path = operation.pathTemplate;
  if (!path.startsWith("/")) {
    return null;
  }
  for (const parameter of operation.parameters) {
    if (parameter.location !== "path") {
      continue;
    }
    const value = values[parameter.name]?.trim() ?? "";
    if (!/^[A-Za-z0-9._~-]+$/.test(value)) {
      return null;
    }
    path = path.replaceAll(`{${parameter.name}}`, encodeURIComponent(value));
  }
  if (path.includes("{") || path.includes("..")) {
    return null;
  }
  const query = new URLSearchParams();
  for (const parameter of operation.parameters) {
    if (parameter.location !== "query") {
      continue;
    }
    let value = values[parameter.name]?.trim() ?? "";
    if (value.length === 0) {
      continue;
    }
    if (parameter.name === "limit") {
      const parsed = Number(value);
      const clamped = Number.isFinite(parsed)
        ? Math.min(TRY_LIMIT_MAX, Math.max(1, Math.floor(parsed)))
        : 1;
      value = String(clamped);
    }
    query.set(parameter.name, value);
  }
  const search = query.toString();
  return `/api/v1${path}${search.length > 0 ? `?${search}` : ""}`;
}

async function runRequest(path: string): Promise<string> {
  if (!path.startsWith("/api/v1/") && path !== "/api/v1") {
    return "That path is not part of v1.";
  }
  try {
    const response = await fetch(path, {
      headers: { Accept: "application/json, text/plain, */*" },
    });
    const type = response.headers.get("content-type") ?? "";
    if (response.redirected || type.includes("text/html")) {
      return `${response.status} ${response.url}`;
    }
    if (
      type.includes("gzip") ||
      type.includes("octet-stream") ||
      path.includes("/bundle")
    ) {
      const blob = await response.blob();
      return `${response.status} ${type}\n${blob.size} bytes`;
    }
    const text = await response.text();
    const body =
      text.length > RESPONSE_CHAR_LIMIT
        ? `${text.slice(0, RESPONSE_CHAR_LIMIT)}\n...`
        : text;
    return `${response.status} ${type}\n${body}`;
  } catch {
    return "The request failed before a response arrived.";
  }
}

function templateFor(operation: ParsedOperation): string {
  const success = operation.responses.find(
    (response) => response.status === "200" || response.status === "307",
  );
  if (!success) {
    return "No success response is documented.";
  }
  const names = success.fieldGroups[0]?.names ?? [];
  if (names.length === 0) {
    return `${success.status}\n${success.description}`;
  }
  return `${success.status} ${success.fieldGroups[0]?.mediaType ?? ""}\n${JSON.stringify(templateValue(names), null, 2)}`;
}

function templateValue(names: readonly string[]): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  for (const name of names) {
    assignTemplatePath(root, name);
  }
  return root;
}

function assignTemplatePath(root: Record<string, unknown>, path: string): void {
  const tokens = path
    .split(".")
    .flatMap((part) =>
      part.endsWith("[]") ? [part.slice(0, -2), "[]"] : [part],
    );
  let cursor: unknown = root;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === undefined || token.length === 0 || token === "[]") {
      continue;
    }
    const nextIsArray = tokens[index + 1] === "[]";
    if (Array.isArray(cursor)) {
      if (cursor.length === 0) {
        cursor.push({});
      }
      cursor = cursor[0];
    }
    if (typeof cursor !== "object" || cursor === null) {
      return;
    }
    const record = cursor as Record<string, unknown>;
    if (nextIsArray) {
      if (!Array.isArray(record[token])) {
        record[token] = [{}];
      }
      cursor = record[token];
      index += 1;
      continue;
    }
    if (index === tokens.length - 1) {
      if (!(token in record)) {
        record[token] = placeholderFor(token);
      }
      return;
    }
    if (typeof record[token] !== "object" || record[token] === null) {
      record[token] = {};
    }
    cursor = record[token];
  }
}

function placeholderFor(key: string): unknown {
  if (
    key === "limit" ||
    key === "offset" ||
    key === "year" ||
    key.endsWith("Count") ||
    key.endsWith("count")
  ) {
    return 0;
  }
  if (key.endsWith("At") || key === "nextOffset" || key.endsWith("Doi")) {
    return null;
  }
  return "";
}
