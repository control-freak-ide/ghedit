import 'vs/css!./media/quickopen';
import { TPromise } from 'vs/base/common/winjs.base';
import { Dimension } from 'vs/base/browser/builder';
import URI from 'vs/base/common/uri';
import { Mode, IEntryRunContext, IQuickNavigateConfiguration } from 'vs/base/parts/quickopen/common/quickOpen';
import { EditorInput } from 'vs/workbench/common/editor';
import { WorkbenchComponent } from 'vs/workbench/common/component';
import Event from 'vs/base/common/event';
import { EditorQuickOpenEntry } from 'vs/workbench/browser/quickopen';
import { IWorkbenchEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IPickOpenEntry, IInputOptions, IQuickOpenService, IPickOptions, IShowOptions } from 'vs/workbench/services/quickopen/common/quickOpenService';
import { IViewletService } from 'vs/workbench/services/viewlet/common/viewletService';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IEventService } from 'vs/platform/event/common/event';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IMessageService } from 'vs/platform/message/common/message';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IWorkspaceContextService } from 'vs/workbench/services/workspace/common/contextService';
import { IKeybindingService } from 'vs/platform/keybinding/common/keybinding';
import { IHistoryService } from 'vs/workbench/services/history/common/history';
export declare class QuickOpenController extends WorkbenchComponent implements IQuickOpenService {
    private eventService;
    private storageService;
    private editorService;
    private viewletService;
    private messageService;
    private telemetryService;
    private contextService;
    private historyService;
    private instantiationService;
    _serviceBrand: any;
    private static ID;
    private _onShow;
    private _onHide;
    private quickOpenWidget;
    private pickOpenWidget;
    private layoutDimensions;
    private mapResolvedHandlersToPrefix;
    private currentResultToken;
    private currentPickerToken;
    private inQuickOpenMode;
    private promisesToCompleteOnHide;
    private previousActiveHandlerDescriptor;
    private actionProvider;
    private previousValue;
    private visibilityChangeTimeoutHandle;
    constructor(eventService: IEventService, storageService: IStorageService, editorService: IWorkbenchEditorService, viewletService: IViewletService, messageService: IMessageService, telemetryService: ITelemetryService, contextService: IWorkspaceContextService, keybindingService: IKeybindingService, historyService: IHistoryService, instantiationService: IInstantiationService);
    onShow: Event<void>;
    onHide: Event<void>;
    quickNavigate(configuration: IQuickNavigateConfiguration, next: boolean): void;
    input(options?: IInputOptions): TPromise<string>;
    pick(picks: TPromise<string[]>, options?: IPickOptions): TPromise<string>;
    pick<T extends IPickOpenEntry>(picks: TPromise<T[]>, options?: IPickOptions): TPromise<string>;
    pick(picks: string[], options?: IPickOptions): TPromise<string>;
    pick<T extends IPickOpenEntry>(picks: T[], options?: IPickOptions): TPromise<T>;
    private doPick(picksPromise, options);
    private emitQuickOpenVisibilityChange(isVisible);
    refresh(input?: string): TPromise<void>;
    show(prefix?: string, options?: IShowOptions): TPromise<void>;
    private hasHandler(prefix);
    private getEditorHistoryWithGroupLabel();
    private onCancel(notifyHandlers?);
    private onClose(canceled);
    private restoreFocus();
    private onType(value);
    private handleDefaultHandlers(defaultHandlers, value, currentResultToken);
    private getEditorHistoryEntries(searchValue?);
    private mergeResults(quickOpenModel, handlerResults, groupLabel);
    private handleSpecificHandler(handlerDescriptor, value, currentResultToken);
    private showModel(model, autoFocus?, ariaLabel?);
    private clearModel();
    private mapEntriesToResource(model);
    private resolveHandler(handler);
    layout(dimension: Dimension): void;
    dispose(): void;
}
export declare class EditorHistoryEntry extends EditorQuickOpenEntry {
    private instantiationService;
    private configurationService;
    private contextService;
    private input;
    private resource;
    constructor(input: EditorInput, editorService: IWorkbenchEditorService, instantiationService: IInstantiationService, configurationService: IConfigurationService, contextService: IWorkspaceContextService);
    getIcon(): string;
    getLabel(): string;
    getAriaLabel(): string;
    getDescription(): string;
    getResource(): URI;
    getInput(): EditorInput;
    matches(input: EditorInput): boolean;
    run(mode: Mode, context: IEntryRunContext): boolean;
}