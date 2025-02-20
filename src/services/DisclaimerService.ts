import { EventAggregator } from "aurelia-event-aggregator";
import { autoinject, computedFrom } from "aurelia-framework";
import { DialogCloseResult, DialogService } from "services/DialogService";
import { Disclaimer } from "../resources/dialogs/disclaimer/disclaimer";
import axios from "axios";
const marked = require("marked");

@autoinject
export class DisclaimerService {

  disclaimed = false;
  accountAddress: string;
  waiting = false;

  constructor(
    private dialogService: DialogService,
    private eventAggregator: EventAggregator,
  ) {
  }

  @computedFrom("accountAddress")
  private get primeDisclaimerStatusKey() {
    return `disclaimer-${this.accountAddress}`;
  }

  @computedFrom("primeDisclaimerStatusKey")
  private get primeDisclaimed(): boolean {
    return this.accountAddress && (localStorage.getItem(this.primeDisclaimerStatusKey) === "true");
  }

  private async disclaimPrime(): Promise<boolean> {

    let disclaimed = false;

    if (this.primeDisclaimed) {
      disclaimed = true;
    } else {
      const response = await this.showDisclaimer(
        "https://raw.githubusercontent.com/PrimeDAO/prime-launch-dapp/master/README.md",
        "PrimeLAUNCH Disclaimer",
      );

      if (typeof response.output === "string") {
        // then an error occurred
        this.eventAggregator.publish("handleFailure", response.output);
        disclaimed = false;
      } else if (response.wasCancelled) {
        disclaimed = false;
      } else {
        disclaimed = response.output as boolean;
      }
    }
    return disclaimed;
  }

  public async confirmCanConnect(account: string): Promise<boolean> {
    this.accountAddress = account;
    if (this.primeDisclaimed) {
      return true;
    } else {
      const accepted = await this.disclaimPrime();
      if (accepted) {
        localStorage.setItem(this.primeDisclaimerStatusKey, "true");
        return true;
      }
    }
    return false;
  }

  public async confirmMarkdown(url: string): Promise<boolean> {

    const disclaimer = await axios.get(url)
      .then((response) => {
        if (response.data) {
          return response.data;
        } else {
          return null;
        }
      })
      .catch((err) => {
        this.dialogService.axiosErrorHandler(err);
        return null;
      });

    let result = false;

    if (disclaimer) {
      try {
        marked(disclaimer);
        result = true;
      }
      // eslint-disable-next-line no-empty
      catch { }
    }
    return result;
  }

  public showDisclaimer(disclaimerUrl: string, title: string): Promise<DialogCloseResult> {
    return this.dialogService.open(Disclaimer, { disclaimerUrl, title }, { keyboard: true })
      .whenClosed(
        (result: DialogCloseResult) => result,
        (error: string) => { return { output: error, wasCancelled: false }; });
  }
}
