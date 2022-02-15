import path from "path";
import { sync } from "glob";

// Looks for node_modules in child folders of the workspace recursively. Max depth is 3.
const findChildrenModules = async (workspaceRoot: string) => {
  console.log({ workspaceRoot });
  const files = sync("**/node_modules", {
    ignore: "node_modules/**",
    cwd: workspaceRoot,
  });

  const pattern = /node_modules.*node_modules/i;
  return files
    .filter((file) => !file.match(pattern))
    .map((files) => path.join(workspaceRoot, files));
};

export default findChildrenModules;
