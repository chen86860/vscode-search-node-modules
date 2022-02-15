import * as fs from "fs";
import * as path from "path";
// eslint-disable-next-line import/no-unresolved
import * as vscode from "vscode";
import findChildPackages from "./utils/find-child-packages";
import findChildrenModules from "./utils/find-parent-modules";
import sortFiles from "./utils/sort-files";
import { showError } from "./utils";

const NODE_MODULES_PATHNAME = "node_modules";

const preferences = vscode.workspace.getConfiguration("search-node-modules");

const nodeModulesPath = preferences.get("path", NODE_MODULES_PATHNAME);
const searchChildrenModules = preferences.get("searchChildrenModules", true);
const orderPriority = preferences.get("orderPriority", []);

const getSearchPaths = (folderFullPath: string) => {
  fs.readdir(folderFullPath, async (readErr, files) => {
    if (readErr) {
      if (folderPath === nodeModulesPath) {
        return showError("No node_modules folder in this workspace.");
      }
      return showError(`Unable to open folder ${folderPath}`);
    }
    const options = sortFiles(files, orderPriority);
    const isParentFolder = folderPath.includes("..");
    // If current folder is not outside of the workspace, also add option to move a step back
    if (!isParentFolder) {
      options.push({ label: `$(reply) ..`, path: ".." });
    }

    // TODO file icon
    const listOptions: vscode.QuickPickItem[] = options.map((option) => {
      const filePath = path.join(folderFullPath, option?.path || option);
      const icon =
        fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory()
          ? "folder"
          : "file";
      return {
        label: option?.label || `$(${icon}) ${option}`,
        path: option?.path || option,
      };
    });

    return listOptions;
  });
};

const searchPath = (
  workspaceName: string,
  workspaceRoot: string,
  folderPath: string
) => {
  try {
    // Path to node_modules in this workspace folder
    const workspaceNodeModules = path.join(workspaceName, nodeModulesPath);

    // Path to current folder
    const folderFullPath = path.join(workspaceRoot, folderPath);

    // Read folder, built quick pick with files/folder (and shortcuts)
    fs.readdir(folderFullPath, async (readErr, files) => {
      const isParentFolder = folderPath.includes("..");
      const options = sortFiles(files, orderPriority);

      // If searching in root node_modules, also include modules from parent folders, that are outside of the workspace
      if (folderPath === nodeModulesPath) {
        if (searchChildrenModules) {
          const parentModules = await findChildrenModules(workspaceRoot);
          options.push(...parentModules);
        }
      } else {
        // If current folder is not outside of the workspace, also add option to move a step back
        if (!isParentFolder) {
          options.push({ label: `$(reply) ..`, path: ".." });
        }
      }

      // TODO file icon
      const listOptions: vscode.QuickPickItem[] = options.map((option) => {
        const filePath = path.join(folderFullPath, option?.path || option);
        const icon =
          fs.existsSync(filePath) && fs.lstatSync(filePath).isDirectory()
            ? "folder"
            : "file";

        return {
          label: option?.label || `$(${icon}) ${option}`,
          path: option?.path || option,
        };
      });

      const selected = await vscode.window.showQuickPick(listOptions, {
        placeHolder: path.format({
          dir: workspaceName,
          base: folderPath,
        }),
      });
      if (!selected) return;

      // @ts-ignore
      const selectPath = selected?.path || "";
      if (selectPath === workspaceNodeModules) {
        searchPath(workspaceName, workspaceRoot, nodeModulesPath);
      } else {
        const selectedPath = path.join(folderPath, selectPath);
        const selectedFullPath = path.join(workspaceRoot, selectedPath);

        // If selected is a folder, traverse it,
        // otherwise open file.
        fs.stat(selectedFullPath, (statErr, stats) => {
          if (stats.isDirectory()) {
            searchPath(workspaceName, workspaceRoot, selectedPath);
          } else {
            vscode.workspace
              .openTextDocument(selectedFullPath)
              .then(vscode.window.showTextDocument);
          }
        });
      }
    });
  } catch (error) {
    if (error instanceof Error) {
      showError(error.message);
      return;
    }

    showError("Error in files searching...");
  }
};

const getProjectFolder = async (workspaceFolder: vscode.WorkspaceFolder) => {
  const packages = await findChildPackages(workspaceFolder.uri.fsPath);
  // If in a lerna/yarn monorepo, prompt user to select which project to traverse
  if (packages.length > 0) {
    const selected = await vscode.window.showQuickPick(
      [
        { label: workspaceFolder.name, packageDir: "" }, // First option is the root dir
        ...packages.map((packageDir) => ({
          label: path.join(workspaceFolder.name, packageDir),
          packageDir,
        })),
      ],
      { placeHolder: "Select Project" }
    );
    if (!selected) {
      return;
    }

    return {
      name: selected.label,
      path: path.join(workspaceFolder.uri.fsPath, selected.packageDir),
    };
  }

  // Otherwise, use the root folder
  return {
    name: workspaceFolder.name,
    path: workspaceFolder.uri.fsPath,
  };
};

const getWorkspaceFolder = async () => {
  // Must have at least one workspace folder
  if (!vscode.workspace.workspaceFolders) {
    showError("You must have a workspace opened.");

    return Promise.reject(new Error("No workspace opened"));
  }

  // If in a multifolder workspace, prompt user to select which one to traverse.
  if (vscode.workspace.workspaceFolders.length > 1) {
    const selected = await vscode.window.showQuickPick(
      vscode.workspace.workspaceFolders.map((folder) => ({
        label: folder.name,
        folder,
      })),
      {
        placeHolder: "Select workspace folder",
      }
    );

    if (!selected) {
      return;
    }

    return selected.folder;
  }

  // Otherwise, use the first one
  const folder =
    vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
  return folder;
};

const searchNodeModules = () => {
  getWorkspaceFolder()
    .then((folder) => folder && getProjectFolder(folder))
    .then((folder) => {
      if (folder) {
        searchPath(folder.name, folder.path, nodeModulesPath);
      }
    });
};

export default searchNodeModules;
