import * as vscode from "vscode";
import searchNodeModules from "./search";

export const activate = (context: { subscriptions: vscode.Disposable[] }) => {
  const search = vscode.commands.registerCommand(
    "extension.search",
    searchNodeModules
  );

  context.subscriptions.push(search);
};

export const deactivate = () => {};
