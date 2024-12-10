import * as vscode from 'vscode';

export class ManualCodeProvider implements vscode.TreeDataProvider<ManualCodeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ManualCodeItem | undefined | void> = new vscode.EventEmitter<ManualCodeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<ManualCodeItem | undefined | void> = this._onDidChangeTreeData.event;

    private items: ManualCodeItem[];

    constructor() {
        this.items = [
            new ManualCodeItem('long_function', false),
            new ManualCodeItem('god_object', false),
            new ManualCodeItem('feature_envy', false),
            new ManualCodeItem('nappropriate_intimacy', false),
            new ManualCodeItem('middle_man', false),
            new ManualCodeItem('switch_statement_abuser', false),
            new ManualCodeItem('excessive_flags', false),
        ];
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ManualCodeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ManualCodeItem): Thenable<ManualCodeItem[]> {
        if (element) {
            return Promise.resolve([]);
        } else {
            return Promise.resolve(this.items);
        }
    }

    toggleCodeSmell(item: ManualCodeItem): void {
        // Toggle the "ticked" state
        item.ticked = !item.ticked;
        item.iconPath = new vscode.ThemeIcon(item.ticked ? 'check' : 'close');
        this.refresh();

        // Trigger detection for the specific code smell
        this.triggerCodeSmellDetection(item.label);
    }

    private triggerCodeSmellDetection(codeSmell: string): void {
        
        const diagnosticCollection = vscode.languages.createDiagnosticCollection('codeSmells');
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (!workspaceFolders) {
            vscode.window.showWarningMessage('No workspace folders detected.');
            return;
        }

        // Simulate detection logic
        const exampleUri = vscode.Uri.file(`${workspaceFolders[0].uri.fsPath}/example.ts`);
        const diagnostics: vscode.Diagnostic[] = [];

        if (codeSmell === 'Code Smell 1') {
            diagnostics.push(
                new vscode.Diagnostic(
                    new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 10)),
                    'Example issue for Code Smell 1',
                    vscode.DiagnosticSeverity.Warning
                )
            );
        } else if (codeSmell === 'Code Smell 2') {
            diagnostics.push(
                new vscode.Diagnostic(
                    new vscode.Range(new vscode.Position(1, 0), new vscode.Position(1, 10)),
                    'Example issue for Code Smell 2',
                    vscode.DiagnosticSeverity.Error
                )
            );
        }

        // Update the Problems tab
        diagnosticCollection.set(exampleUri, diagnostics);
        vscode.window.showInformationMessage(`Problems updated for: ${codeSmell}`);
    }
}

export class ManualCodeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public ticked: boolean
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon(ticked ? 'check' : 'close');
        this.contextValue = 'manualCodeItem'; // Enables context-specific commands
    }
}
