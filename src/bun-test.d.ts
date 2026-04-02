declare module "bun:test" {
  export const describe: (...args: unknown[]) => unknown;
  export const it: (...args: unknown[]) => unknown;
  export const expect: (...args: unknown[]) => unknown;
}

