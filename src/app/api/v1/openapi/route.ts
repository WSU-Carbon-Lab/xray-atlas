import { NextResponse } from "next/server";
import { z } from "zod";
import { openApiV1Spec } from "~/app/api/v1/openapi/spec";

const formatSchema = z.object({
  format: z.enum(["json", "yaml"]).default("json"),
});

function asYamlValue(value: unknown, indent = 0): string {
  const pad = " ".repeat(indent);
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return value
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          const nested = asYamlValue(item, indent + 2);
          return `${pad}-\n${nested}`;
        }
        return `${pad}- ${asYamlValue(item, 0)}`;
      })
      .join("\n");
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    return entries
      .map(([key, entryValue]) => {
        if (typeof entryValue === "object" && entryValue !== null) {
          const nested = asYamlValue(entryValue, indent + 2);
          return `${pad}${key}:\n${nested}`;
        }
        return `${pad}${key}: ${asYamlValue(entryValue, 0)}`;
      })
      .join("\n");
  }
  return JSON.stringify(value);
}

export async function GET(request: Request): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const parsed = formatSchema.safeParse(Object.fromEntries(requestUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid format parameter." }, { status: 400 });
  }

  if (parsed.data.format === "yaml") {
    return new NextResponse(`${asYamlValue(openApiV1Spec)}\n`, {
      status: 200,
      headers: {
        "Content-Type": "application/yaml; charset=utf-8",
      },
    });
  }

  return NextResponse.json(openApiV1Spec);
}
