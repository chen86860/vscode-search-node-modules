import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";
import { showWarning } from ".";

const PACKAGE_JSON_FILE = "package.json";
const LERNA_CONFIG_FILE = "lerna.json";
const DOUBLE_STAR = "**"; // globstar

const flat = (arrays: any[]) => [].concat.apply([], arrays);

const distinct = (array: Iterable<unknown> | null | undefined) => [
  ...new Set(array),
];

const findPatternMatches = (root: string, pattern: unknown) => {
  if (typeof pattern !== "string") return [];
  // patterns with double star e.g. '/src/**/' are not supported at the moment, because they are too general and may match nested node_modules
  if (pattern.includes(DOUBLE_STAR)) return [];

  const matches = glob.sync(path.join(pattern, PACKAGE_JSON_FILE), {
    cwd: root,
  });

  return matches.map((match: string) => path.join(match, ".."));
};

const getLernaPackagesConfig = async (root: string) => {
  const lernaConfigFile = path.join(root, LERNA_CONFIG_FILE);
  if (!(await fs.existsSync(lernaConfigFile))) {
    return [];
  }

  const config = await import(lernaConfigFile).catch(() =>
    showWarning(
      `Ignoring invalid ${LERNA_CONFIG_FILE} file at: ${lernaConfigFile}`
    )
  );
  return config && Array.isArray(config.packages) ? config.packages : [];
};

const getYarnWorkspacesConfig = async (root: string) => {
  const packageJsonFile = path.join(root, PACKAGE_JSON_FILE);
  if (!(await fs.existsSync(packageJsonFile))) {
    return [];
  }

  const config = await import(packageJsonFile).catch(() =>
    showWarning(
      `Ignoring invalid ${PACKAGE_JSON_FILE} file at: ${packageJsonFile}`
    )
  );
  return config && Array.isArray(config.workspaces) ? config.workspaces : [];
};

const findChildPackages = async (root: string) => {
  const patterns = distinct([
    ...(await getLernaPackagesConfig(root)),
    ...(await getYarnWorkspacesConfig(root)),
  ]);

  const matchesArr = await Promise.all(
    patterns.map((pattern) => findPatternMatches(root, pattern))
  );

  return flat(matchesArr);
};

export default findChildPackages;
