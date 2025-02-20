import { EventAggregator } from "aurelia-event-aggregator";
import { autoinject } from "aurelia-framework";
import { EventConfig, EventConfigException } from "./GeneralEvents";
import { DialogCloseResult, DialogService } from "./DialogService";
import { DisposableCollection } from "./DisposableCollection";
import { Alert } from "../resources/dialogs/alert/alert";

@autoinject
export class AlertService {

  // probably doesn't really need to be a disposable collection since this is a singleton service
  private subscriptions: DisposableCollection = new DisposableCollection();

  constructor(
    eventAggregator: EventAggregator,
    private dialogService: DialogService,
  ) {
    this.subscriptions.push(eventAggregator
      .subscribe("handleException",
        (config: EventConfigException | any) => this.handleException(config)));
    this.subscriptions.push(eventAggregator
      .subscribe("handleFailure", (config: EventConfig | string) => this.handleFailure(config)));
  }

  /* shouldn't actually ever happen */
  public dispose(): void {
    this.subscriptions.dispose();
  }

  private handleException(config: EventConfigException | any) {
    let ex: any;
    let message: string;
    if (!(config instanceof EventConfigException)) {
      // then config is the exception itself
      ex = config as any;
    } else {
      ex = config.exception;
      message = config.message;
    }

    this.showAlert(`${message ? `${message}: ` : ""}${ex?.reason ?? ex?.message ?? ex}`);
  }

  private handleFailure(config: EventConfig | string) {
    this.showAlert(this.getMessage(config));
  }

  private getMessage(config: EventConfig | string): string {
    return (typeof config === "string") ? config : config.message;
  }

  public showAlert(message: string): Promise<DialogCloseResult> {
    return this.dialogService.open(Alert, { message }, { keyboard: true })
      .whenClosed(
        (result: DialogCloseResult) => result,
        // not sure if this works for alert
        (error: string) => { return { output: error, wasCancelled: false }; });
  }
}
