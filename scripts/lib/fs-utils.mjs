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
  const entries = await readdir(dir, { withFileTypes: true });
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

  return files;
}

export async function fileExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

export async function writeText(filePath, content) {
  await ensureDir(path.dirname(filePath));
  await writeFile(filePath, content, "utf8");
}
