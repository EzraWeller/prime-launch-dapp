import { autoinject } from "aurelia-framework";
import { Router } from "aurelia-router";
import { DateService } from "./../services/DateService";
import { BaseStage } from "newSeed/baseStage";
import Litepicker from "litepicker";
import { Utils } from "services/utils";
import { EventAggregator } from "aurelia-event-aggregator";
import { NumberService } from "services/NumberService";
import { DisclaimerService } from "services/DisclaimerService";
import { BigNumber } from "ethers";
import { EthereumService, fromWei } from "services/EthereumService";

@autoinject
export class Stage4 extends BaseStage {
  startDateRef: HTMLElement | HTMLInputElement;
  endDateRef: HTMLElement | HTMLInputElement;
  startDate: Date;
  startTime = "00:00"
  endDate: Date;
  endTime = "00:00";
  dateService = new DateService();
  startDatePicker: Litepicker;
  endDatePicker: Litepicker;

  constructor(
    eventAggregator: EventAggregator,
    private numberService: NumberService,
    private ethereumService: EthereumService,
    router: Router,
    private disclaimerService: DisclaimerService,
  ) {
    super(router, eventAggregator);
    this.eventAggregator.subscribe("seed.clearState", () => {
      this.startDate = undefined;
      this.endDate = undefined;
      this.startTime = undefined;
      this.endTime = undefined;
    });
  }

  attached(): void {
    this.startDatePicker = new Litepicker({
      element: this.startDateRef,
      minDate: Date.now(),
    });

    this.startDatePicker.on("selected", (date: { toJSDate(): Date }) => {
      this.startDate = date.toJSDate();
    });

    this.endDatePicker = new Litepicker({
      element: this.endDateRef,
      minDate: Date.now(),
    });

    this.endDatePicker.on("selected", (date: { toJSDate(): Date }) => {
      this.endDate = date.toJSDate();
    });
  }

  toggleGeoBlocking(): void {
    this.seedConfig.seedDetails.geoBlock = !this.seedConfig.seedDetails.geoBlock;
  }

  setSeedConfigStartDate(): Date {
    // Set the ISO time
    // Get the start and end time
    const startTimes = this.startTime.split(":");
    const temp = this.startDate;
    temp.setHours(Number.parseInt(startTimes[0]), Number.parseInt(startTimes[1]));
    this.seedConfig.seedDetails.startDate = this.dateService.toISOString(this.dateService.translateLocalToUtc(temp));
    return new Date(this.seedConfig.seedDetails.startDate);
  }

  setSeedConfigEndDate(): Date {
    // Set the ISO time
    // Get the start and end time
    const endTimes = this.endTime.split(":");
    const temp = this.endDate;
    temp.setHours(Number.parseInt(endTimes[0]), Number.parseInt(endTimes[1]));
    this.seedConfig.seedDetails.endDate = this.dateService.toISOString(this.dateService.translateLocalToUtc(temp));
    return new Date(this.seedConfig.seedDetails.endDate);
  }

  persistData(): void {
    this.setSeedConfigStartDate();
    this.setSeedConfigEndDate();
    // Save the seed admin address to wizard state in order to persist it after seedConfig state is cleared in stage7
    this.wizardState.seedAdminAddress = this.seedConfig.seedDetails.adminAddress;
    this.wizardState.whiteList = this.seedConfig.seedDetails.whitelist;
  }

  async validateInputs(): Promise<string> {
    let message: string;
    // Split the start and endt time
    let startTimes = [];
    let endTimes = [];
    const re = /^[-+]?(\d+)$/;
    if (this.startTime) {
      startTimes = this.startTime.split(":");
    }
    if (this.endTime) {
      endTimes = this.endTime.split(":");
    }
    if (!this.seedConfig.seedDetails.pricePerToken || this.seedConfig.seedDetails.pricePerToken === "0") {
      message = "Please enter a value for Funding Tokens per Seed Token";
    } else if (!this.seedConfig.seedDetails.fundingTarget || this.seedConfig.seedDetails.fundingTarget === "0") {
      message = "Please enter a number greater than zero for the Funding Target";
    } else if (!this.seedConfig.seedDetails.fundingMax || this.seedConfig.seedDetails.fundingMax === "0") {
      message = "Please enter a number greater than zero for the Funding Max";
    } else if (BigNumber.from(this.seedConfig.seedDetails.fundingTarget).gt(this.seedConfig.seedDetails.fundingMax)) {
      message = "Please enter a value for Funding Target less than or equal to Funding Max";
    } else if (this.seedConfig.tokenDetails.maxSeedSupply && this.numberService.fromString(fromWei(this.seedConfig.seedDetails.fundingMax)) > this.numberService.fromString(fromWei(this.seedConfig.tokenDetails.maxSeedSupply)) * this.numberService.fromString(fromWei(this.seedConfig.seedDetails.pricePerToken))) {
      message = "Funding Max cannot be greater than Maximum Seed Token Supply times the Funding Tokens per Seed Token";
    } else if (!(this.seedConfig.seedDetails.vestingPeriod >= 0)) {
      message = "Please enter a number greater than zero for  \"Seed tokens vested for\" ";
    } else if (!(this.seedConfig.seedDetails.vestingCliff >= 0)) {
      message = "Please enter a number greater than or equal to zero for \"with a cliff of\" ";
    } else if (this.seedConfig.seedDetails.vestingCliff > this.seedConfig.seedDetails.vestingPeriod) {
      message = "Please enter a value of \"with a cliff of\" less than \"Seed tokens vested for \"";
    } else if (!this.startDate) {
      message = "Please select a Start Date";
    } else if (!this.startTime) {
      message = "Please enter a value for the Start Time";
    } else if (!re.test(startTimes[0]) || !re.test(startTimes[1]) || startTimes.length > 2) {
      message = "Please enter a valid value for Start Time";
    } else if (!(Number.parseInt(startTimes[0]) >= 0)
      || !(Number.parseInt(startTimes[0]) < 24)) {
      message = "Please enter a valid value for Start Time";
    } else if (!(Number.parseInt(startTimes[1]) >= 0)
      || !(Number.parseInt(startTimes[1]) < 60)) {
      message = "Please enter a valid value for Start Time";
    } else if (!this.endDate) {
      message = "Please select an End Date";
    } else if (!this.endTime) {
      message = "Please enter a value for the End Time";
    } else if (!re.test(endTimes[0]) || !re.test(endTimes[1]) || endTimes.length > 2) {
      message = "Please enter a valid value for End Time";
    } else if (!(Number.parseInt(endTimes[0]) >= 0)
      || !(Number.parseInt(endTimes[0]) < 24)) {
      message = "Please enter a valid value for End Time";
    } else if (!(Number.parseInt(endTimes[1]) >= 0)
      || !(Number.parseInt(endTimes[1]) < 60)) {
      message = "Please enter a valid value for End Time";
    } else if (this.setSeedConfigEndDate() <= this.setSeedConfigStartDate()) {
      message = "Please select an End Date greater than the Start Date";
    } else if (!Utils.isValidUrl(this.seedConfig.seedDetails.whitelist, true)) {
      message = "Please enter a valid URL for Whitelist";
      // won't validate this for now
    // } else if (!(await this.whiteListService.getWhiteList(this.seedConfig.seedDetails.whitelist))) {
    //   message = "Please submit a whitelist that contains a list of addresses separated by commas or whitespace";
    } else if (!Utils.isValidUrl(this.seedConfig.seedDetails.legalDisclaimer, true)) {
      message = "Please enter a valid URL for Legal Disclaimer";
    } else if (this.seedConfig.seedDetails.legalDisclaimer &&
      !await this.disclaimerService.confirmMarkdown(this.seedConfig.seedDetails.legalDisclaimer)) {
      message = "The document at the URL you provided for Legal Disclaimer either does not exist or does not contain valid Markdown";
    } else if (!Utils.isAddress(this.seedConfig.seedDetails.adminAddress)) {
      message = "Please enter a valid wallet address for Seed Administrator";
    }

    this.stageState.verified = !message;
    return Promise.resolve(message);
  }

  connect(): void {
    this.ethereumService.ensureConnected();
  }

  makeMeAdmin() : void {
    this.seedConfig.seedDetails.adminAddress = this.ethereumService.defaultAccountAddress;
  }
}
