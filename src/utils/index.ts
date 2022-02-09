// eslint-disable-next-line import/no-unresolved
import * as vscode from "vscode";

const formatMsg = (message: string) => `Search node_modules: ${message}`;
const showError = (message: string) =>
  vscode.window.showErrorMessage(formatMsg(message));
const showWarning = (message: string) =>
  vscode.window.showWarningMessage(formatMsg(message));

export { showError, showWarning };
