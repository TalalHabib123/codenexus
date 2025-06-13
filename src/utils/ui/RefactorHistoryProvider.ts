import * as vscode from 'vscode';
import * as path from 'path';
import { RefactoringData } from '../../types/refactor_models';


class RefactorTreeItem extends vscode.TreeItem {
    constructor(
        label: string,
        collapsible: vscode.TreeItemCollapsibleState,
        command?: vscode.Command,
        contextValue?: string
    ) {
        super(label, collapsible);
        this.command = command;
        this.contextValue = contextValue;
    }
}

export class RefactorHistoryProvider
    implements vscode.TreeDataProvider<RefactorTreeItem>
{
    private readonly _emitter = new vscode.EventEmitter<
        RefactorTreeItem | undefined | null | void
    >();
    readonly onDidChangeTreeData = this._emitter.event;

    constructor(
        /** Pass the *shared* refactor cache to keep UI in-sync */
        private readonly refactorData: { [filePath: string]: RefactoringData[] }
    ) {}

    refresh() {
        this._emitter.fire();
    }

    /** Collapsed file nodes → single-line version nodes */
    getChildren(
        element?: RefactorTreeItem
    ): vscode.ProviderResult<RefactorTreeItem[]> {
        if (!element) {
            // root level = file names
            return Object.keys(this.refactorData).map(fp => {
                return new RefactorTreeItem(
                    path.basename(fp),
                    vscode.TreeItemCollapsibleState.Collapsed,
                    undefined,
                    'fileNode'
                );
            });
        }

        if (element.contextValue === 'fileNode') {
            const fp = Object.keys(this.refactorData).find(
                f => path.basename(f) === element.label
            );
            if (!fp) {
                return [];
            }

            return (
                this.refactorData[fp]
                    // only successful refactors
                    .filter(r => r.success)
                    // newest first
                    .sort(
                        (a, b) => b.time.getTime() - a.time.getTime()
                    )
                    .map(r => {
                        const label = `${
                            r.refactoring_type ?? 'Refactor'
                        }  •  ${r.time.toLocaleString()}`;
                        const item = new RefactorTreeItem(
                            label,
                            vscode.TreeItemCollapsibleState.None,
                            {
                                command: 'refactorHistory.revert',
                                title: 'Revert',
                                arguments: [fp, r],
                            },
                            'refactorNode'
                        );

                        if (!r.outdated) {
                            item.description = 'current';
                            item.iconPath = new vscode.ThemeIcon(
                                'check',
                                new vscode.ThemeColor('testing.iconPassed')
                            );
                        }

                        return item;
                    })
            );
        }

        return [];
    }

    getTreeItem(element: RefactorTreeItem): vscode.TreeItem {
        return element;
    }

    /* ---------- Command handler ---------- */
    async revert(filePath: string, target: RefactoringData) {
        const choice = await vscode.window.showWarningMessage(
            `Revert “${path.basename(
                filePath
            )}” to ${target.time.toLocaleString()}?\nThis cannot be undone.`,
            { modal: true },
            'Yes',
            'No'
        );
        if (choice !== 'Yes') {
            return;
        }

        try {
            await vscode.workspace.fs.writeFile(
                vscode.Uri.file(filePath),
                new TextEncoder().encode(target.orginal_code ?? '')
            );

            /* Strip later versions & update flags */
            const list = this.refactorData[filePath]
                .filter(r => r.success)
                .sort((a, b) => b.time.getTime() - a.time.getTime());

            const idx = list.indexOf(target);
            if (idx !== -1) {
                list.splice(0, idx); // remove newer items
                list.forEach(r => (r.outdated = true));
                list[0].outdated = false;
                this.refactorData[filePath] = list;
            }

            this.refresh();
            vscode.window.showInformationMessage(
                `Reverted “${path.basename(filePath)}”.`
            );
        } catch (err: any) {
            vscode.window.showErrorMessage(
                `Revert failed: ${err?.message ?? err}`
            );
        }
    }
}
