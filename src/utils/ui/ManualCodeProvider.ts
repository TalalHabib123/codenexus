import * as vscode from 'vscode';
import {triggerCodeSmellDetection} from '../../extension'
import { showCodeSmellsInProblemsTab } from './problemsTab';
import { Rules } from '../../types/rulesets';

export class ManualCodeProvider implements vscode.TreeDataProvider<ManualCodeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ManualCodeItem | undefined | void> = new vscode.EventEmitter<ManualCodeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<ManualCodeItem | undefined | void> = this._onDidChangeTreeData.event;
    private context: vscode.ExtensionContext;
    private items: ManualCodeItem[];

    constructor(context: vscode.ExtensionContext, rulesetsData?: Rules) {
        this.context = context;
        this.items = this.createCodeSmellItems(rulesetsData);
    }

    private createCodeSmellItems(rulesetsData?: Rules): ManualCodeItem[] {
        // If no ruleset data is provided or it contains wildcard "*", use default code smells
        if (!rulesetsData || !rulesetsData.detectSmells || rulesetsData.detectSmells.includes("*")) {
            return [
                new ManualCodeItem('long_function', false),
                new ManualCodeItem('god_object', false),
                new ManualCodeItem('feature_envy', false),
                new ManualCodeItem('inappropriate_intimacy', false),
                new ManualCodeItem('middle_man', false),
                new ManualCodeItem('switch_statement_abuser', false),
                new ManualCodeItem('excessive_flags', false),
            ];
        }

        // Otherwise, create items based on the ruleset data
        const items: ManualCodeItem[] = [];
        
        // Map ruleset smell names to code smell identifiers
        const smellMap: { [key: string]: string } = {
            'long functions': 'long_function',
            'god object': 'god_object',
            'feature envy': 'feature_envy',
            'inappropriate intimacy': 'inappropriate_intimacy',
            'middle man': 'middle_man',
            'switch statement abuser': 'switch_statement_abuser',
            'excessive use of flags': 'excessive_flags',
            'dead code': 'dead_code',
            'unreachable code': 'unreachable_code',
            'duplicated code': 'duplicated_code',
            'unused variables': 'unused_variables',
            'naming convention': 'naming_convention',
            'magic numbers': 'magic_numbers',
            'global variables conflict': 'global_variables_conflict',
            'temporary field': 'temporary_field',
            'overly complex conditional statements': 'complex_conditional',
            'long parameter list': 'long_parameter_list'
        };

        // Create items for each smell in the ruleset
        for (const smell of rulesetsData.detectSmells) {
            const smellIdentifier = smellMap[smell.toLowerCase()];
            if (smellIdentifier) {
                items.push(new ManualCodeItem(smellIdentifier, false));
            }
        }

        return items;
    }

    // Method to update items when ruleset changes
    updateItems(rulesetsData: Rules): void {
        this.items = this.createCodeSmellItems(rulesetsData);
        this.refresh();
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