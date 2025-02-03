import * as vscode from 'vscode';
import * as path from 'path';

class RelatedFilesProvider implements vscode.TreeDataProvider<RelatedFile> {
    private _onDidChangeTreeData = new vscode.EventEmitter<RelatedFile | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: RelatedFile): vscode.TreeItem {
        return element;
    }

    async getChildren(): Promise<RelatedFile[]> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return Promise.resolve([]);
        }

        const currentFile = editor.document.uri;
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(currentFile);
        if (!workspaceFolder) {
            return Promise.resolve([]);
        }

        const fileName = path.parse(currentFile.fsPath).name;
        const relatedFiles = await this.findRelatedFiles(workspaceFolder, fileName);
        
        return relatedFiles;
    }

    private async findRelatedFiles(workspaceFolder: vscode.WorkspaceFolder, baseName: string): Promise<RelatedFile[]> {
        const pattern = new vscode.RelativePattern(workspaceFolder, `**/${baseName}.*`);
        const files = await vscode.workspace.findFiles(pattern);
        
        return files
            .filter(file => file.fsPath !== vscode.window.activeTextEditor?.document.uri.fsPath)
            .filter(file => !file.fsPath.endsWith('.js') && !file.fsPath.endsWith('.js.map'))
            .filter(file => !file.fsPath.endsWith('.d.ts'))
            .filter(file => !file.fsPath.includes('node_modules'))
            .map(file => new RelatedFile(file));
    }
}

class RelatedFile extends vscode.TreeItem {
    constructor(public readonly uri: vscode.Uri) {
        super(path.basename(uri.fsPath));
        this.command = {
            command: 'relatedFiles.openFile',
            title: 'Open File',
            arguments: [uri]
        };
    }
}

export function activate(context: vscode.ExtensionContext) {
    const relatedFilesProvider = new RelatedFilesProvider();
    const treeView = vscode.window.createTreeView('relatedFiles', {
        treeDataProvider: relatedFilesProvider
    });

    context.subscriptions.push(
        vscode.commands.registerCommand('relatedFiles.openFile', (uri: vscode.Uri) => {
            vscode.workspace.openTextDocument(uri).then(doc => {
                vscode.window.showTextDocument(doc);
            });
        }),
        vscode.window.onDidChangeActiveTextEditor(() => {
            relatedFilesProvider.refresh();
        })
    );
}

export function deactivate() {}