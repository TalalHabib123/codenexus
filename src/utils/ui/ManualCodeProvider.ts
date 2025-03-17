import * as vscode from 'vscode';
import {triggerCodeSmellDetection} from '../../extension'
import { showCodeSmellsInProblemsTab } from './problemsTab';


export class ManualCodeProvider implements vscode.TreeDataProvider<ManualCodeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ManualCodeItem | undefined | void> = new vscode.EventEmitter<ManualCodeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<ManualCodeItem | undefined | void> = this._onDidChangeTreeData.event;
    private context: vscode.ExtensionContext;
    private items: ManualCodeItem[];

    constructor(context: vscode.ExtensionContext) {
        this.items = [
            new ManualCodeItem('long_function', false),
            new ManualCodeItem('god_object', false),
            new ManualCodeItem('feature_envy', false),
            new ManualCodeItem('inappropriate_intimacy', false),
            new ManualCodeItem('middle_man', false),
            new ManualCodeItem('switch_statement_abuser', false),
            new ManualCodeItem('excessive_flags', false),
        ];
        this.context = context;
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
        // Toggle the ticked state and update the icon
        item.ticked = !item.ticked;
        item.iconPath = new vscode.ThemeIcon(item.ticked ? 'check' : 'close');
        this.refresh();
    
        if (item.ticked) {
            // Trigger code smell detection if the item is ticked
            triggerCodeSmellDetection(item.label, this.context);

        } else {
            // Handle unticking by fetching FileDetectionData
            const FileDetectionData = this.context.workspaceState.get('FileDetectionData', {});
         
            if (FileDetectionData) {
                const diagnosticCollection = this.context.subscriptions.find(
                    (sub): sub is vscode.DiagnosticCollection => 'set' in sub && 'delete' in sub && 'clear' in sub
                );
    
                if (diagnosticCollection) {
                    showCodeSmellsInProblemsTab(FileDetectionData, diagnosticCollection);
                } else {
                    console.warn("No diagnostic collection found.");
                }
            } else {
                console.warn("No FileDetectionData found in workspace state.");
            }
        }
    
        // Log the item label for debugging
        console.log(item.label);
    }
    
}


export class ManualCodeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public ticked: boolean
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon(ticked ? 'check' : 'close');
        this.contextValue = 'manualCodeItem';
    }
}
