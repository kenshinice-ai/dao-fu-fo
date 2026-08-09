declare module "node:crypto" {
  export function createHash(algorithm: string): {
    update(value: unknown): ReturnType<typeof createHash>;
    digest(encoding?: string): any;
  };
}

declare module "node:fs/promises" {
  export function cp(source: string, destination: string, options?: { recursive?: boolean }): Promise<void>;
  export function mkdtemp(prefix: string): Promise<string>;
  export function readFile(path: string, encoding: "utf8"): Promise<string>;
  export function readFile(path: string): Promise<any>;
  export function writeFile(path: string, data: string, encoding: "utf8"): Promise<void>;
  export function mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  export function rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
  export function readdir(path: string, options: { withFileTypes: true }): Promise<Array<{
    name: string;
    isDirectory(): boolean;
    isFile(): boolean;
  }>>;
}

declare module "node:path" {
  export function join(...paths: string[]): string;
  export function resolve(...paths: string[]): string;
  export function relative(from: string, to: string): string;
}

declare module "node:os" {
  export function tmpdir(): string;
}

declare const process: { cwd(): string; argv: string[] };
declare const Buffer: {
  from(value: string, encoding?: string): any;
  concat(values: any[]): any;
};
type Buffer = any;
