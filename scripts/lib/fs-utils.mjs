import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

export async function cleanDir(dir) {
  await rm(dir, { recursive: true, force: true });
  await ensureDir(dir);
}

export async function listFiles(dir, extension) {
  const entries = (await readdir(dir, { withFileTypes: true })).sort((left, right) =>
    left.name.localeCompare(right.name)
  );
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listFiles(fullPath, extension)));
      continue;
    }

    if (!extension || entry.name.endsWith(extension)) {
      files.push(fullPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

export async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

export async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

export async function writeText(filePath, content) {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, content, "utf8");
}
