import * as vscode from 'vscode';
import * as path from 'path';
import { RefactoringData } from '../../types/refactor_models';

export class RefactorHistoryProvider implements vscode.TreeDataProvider<HistoryTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<HistoryTreeItem | undefined | void> = new vscode.EventEmitter();
    readonly onDidChangeTreeData: vscode.Event<HistoryTreeItem | undefined | void> = this._onDidChangeTreeData.event;

    constructor(private context: vscode.ExtensionContext) { }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: HistoryTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: HistoryTreeItem): Thenable<HistoryTreeItem[]> {
        const data = this.context.workspaceState.get<{ [key: string]: RefactoringData[] }>('refactorData', {});
        if (!element) {
            return Promise.resolve(Object.keys(data).map(filePath => {
                return new HistoryTreeItem(path.basename(filePath), vscode.TreeItemCollapsibleState.Collapsed, 'file', filePath);
            }));
        }

        if (element.type === 'file' && element.filePath) {
            const list = (data[element.filePath] || [])
                .filter(d => d.success)
                .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
            return Promise.resolve(list.map(refactor => {
                const label = `${refactor.refactoring_type ?? 'Refactor'} - ${new Date(refactor.time).toLocaleString()}`;
                const item = new HistoryTreeItem(label, vscode.TreeItemCollapsibleState.None, 'entry', element.filePath, refactor);
                if (!refactor.outdated) {
                    item.description = 'current';
                    item.iconPath = new vscode.ThemeIcon('star-full');
                }
                item.command = {
                    command: 'codenexus.revertHistory',
                    title: 'Revert',
                    arguments: [element.filePath, refactor]
                };
                return item;
            }));
        }
        return Promise.resolve([]);
    }
}

export class HistoryTreeItem extends vscode.TreeItem {
    constructor(
        label: string,
        collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly type: 'file' | 'entry',
        public readonly filePath?: string,
        public readonly data?: RefactoringData
    ) {
        super(label, collapsibleState);
        this.contextValue = type;
    }
}