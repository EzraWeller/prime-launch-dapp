/* eslint-disable linebreak-style */
import { autoinject } from "aurelia-framework";
import { EventAggregator } from "aurelia-event-aggregator";
import { EventConfigException } from "services/GeneralEvents";
import { Router, RouterConfiguration, NavigationInstruction, Next } from "aurelia-router";
import { PLATFORM } from "aurelia-pal";
import "./styles/styles.scss";
import "./app.scss";
import tippy from "tippy.js";
import { BindingSignaler } from "aurelia-templating-resources";
import { EthereumService } from "services/EthereumService";
import { ConsoleLogService } from "services/ConsoleLogService";

@autoinject
export class App {
  constructor (
    private signaler: BindingSignaler,
    private ethereumService: EthereumService,
    private eventAggregator: EventAggregator,
    private consoleLogService: ConsoleLogService) { }

  router: Router;
  onOff = false;
  onOffStack = 0;
  modalMessage: string;
  initializing = true;
  showingMobileMenu = false;
  intervalId: any;

  errorHandler = (ex: unknown): boolean => {
    this.eventAggregator.publish("handleException", new EventConfigException("Sorry, an unexpected error occurred", ex));
    return false;
  }

  public attached(): void {
    // so all elements with data-tippy-content will automatically have a tooltip
    tippy("[data-tippy-content]");

    window.addEventListener("error", this.errorHandler);

    document.addEventListener("scroll", (_e) => {
      this.handleScrollEvent();
    });

    this.eventAggregator.subscribe("seeds.loading", async (onOff: boolean) => {
      this.modalMessage = "Thank you for your patience while we initialize for a few moments...";
      this.handleOnOff(onOff);
    });

    this.eventAggregator.subscribe("seed.creating", async (onOff: boolean) => {
      this.modalMessage = "Thank you for your patience while we initiate the creation of a new seed...";
      this.handleOnOff(onOff);
    });


    this.eventAggregator.subscribe("transaction.sent", async () => {
      this.modalMessage = "Awaiting confirmation...";
      this.handleOnOff(true);
    });

    this.eventAggregator.subscribe("transaction.confirmed", async () => {
      this.handleOnOff(false);
    });

    this.eventAggregator.subscribe("transaction.failed", async () => {
      this.handleOnOff(false);
    });

    this.intervalId = setInterval(async () => {
      this.signaler.signal("secondPassed");
      const blockDate = this.ethereumService.lastBlockDate;
      this.eventAggregator.publish("secondPassed", {blockDate, now: new Date()});
    }, 1000);

    window.addEventListener("resize", () => { this.showingMobileMenu = false; });
  }

  private handleOnOff(onOff: boolean): void {
    this.onOffStack += onOff ? 1 : -1;
    if (this.onOffStack < 0) {
      this.onOffStack = 0;
      this.consoleLogService.logMessage("underflow in onOffStack", "warn");
    }
    if (this.onOffStack && !this.onOff) {
      this.onOff = true;
    } else if ((this.onOffStack === 0) && this.onOff) {
      this.onOff = false;
    }
  }

  private configureRouter(config: RouterConfiguration, router: Router) {

    config.title = "PrimeLaunch";
    config.options.pushState = true;
    // const isIpfs = (window as any).IS_IPFS;
    // if (isIpfs) {
    //   this.consoleLogService.handleMessage(`Routing for IPFS: ${window.location.pathname}`);
    // }
    config.options.root = "/"; // window.location.pathname; // to account for IPFS
    /**
     * first set the landing page.
     * it is possible to be connected but have the wrong chain.
     */
    config.map([
      {
        moduleId: PLATFORM.moduleName("./home/home"),
        nav: true,
        name: "home",
        route: ["", "/", "home"],
        title: "Home",
      },
      {
        moduleId: PLATFORM.moduleName("./contribute/contribute"),
        nav: true,
        name: "contribute",
        route: ["contribute"],
        title: "Contribute",
      },
      {
        moduleId: PLATFORM.moduleName("./launch/launch"),
        nav: false,
        name: "launch",
        route: ["launch"],
        title: "Host a Launch",
      },
      {
        moduleId: PLATFORM.moduleName("./launches/launches"),
        nav: false,
        name: "launches",
        route: ["launches"],
        title: "Launches",
      },
      {
        moduleId: PLATFORM.moduleName("./documentation/documentation"),
        nav: false,
        name: "documentation",
        route: ["documentation"],
        title: "Documentation",
      },
      {
        moduleId: PLATFORM.moduleName("./seedDashboard/seedDashboard"),
        nav: false,
        name: "seedDashboard",
        route: ["seed/:address"],
        title: "SEED Dashboard",
      },
      {
        moduleId: PLATFORM.moduleName("./newSeed/newSeed"),
        nav: false,
        name: "newSeed",
        route: ["newSeed"],
        title: "Register New SEED",
      },
      {
        moduleId: PLATFORM.moduleName("./selectPackage/selectPackage"),
        nav: false,
        name: "selectPackage",
        route: ["selectPackage"],
        title: "Select Your Package",
      },

    ]);

    config.fallbackRoute("home");

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const _this = this;
    /**
     * obtain and store the scroll position per each page as we leave
     */
    config.addPreActivateStep({
      run(navigationInstruction: NavigationInstruction, next: Next) {
        if (navigationInstruction.previousInstruction) {
          let position = sessionStorage.getItem(_this.getScrollStateKey(navigationInstruction.previousInstruction.fragment));
          if (!position) {
            position = `${window.scrollX},${window.scrollY}`;
            sessionStorage.setItem(_this.getScrollStateKey(navigationInstruction.previousInstruction.fragment), position);
          }
        }
        return next();
      },
    });

    /**
     * restore the scroll position per each page as we arrive
     */
    config.addPostRenderStep({
      run(navigationInstruction: NavigationInstruction, next: Next) {
        let position = sessionStorage.getItem(_this.getScrollStateKey(navigationInstruction.fragment));
        if (!position) {
          position = "0,0";
        }
        const scrollArgs = position.split(",");
        setTimeout(() => window.scrollTo(Number(scrollArgs[0]), Number(scrollArgs[1])), 100);
        return next();
      },
    });

    this.router = router;
  }
  /**
   * store the scroll position per each page
   */
  handleScrollEvent(): void {
    sessionStorage.setItem(this.getScrollStateKey(this.router.currentInstruction.fragment),
      `${window.scrollX},${window.scrollY}`);
  }

  getScrollStateKey(fragment: string): string {
    switch (fragment) {
      case "":
      case "/":
      case "/home":
        return "scroll-/home";
      default:
        return `scroll-${fragment}`;
    }
  }

  onNavigate(): void {
    this.showingMobileMenu = false;
  }

  toggleMobileMenu(): void {
    this.showingMobileMenu = !this.showingMobileMenu;
  }

  navigate(href: string): void {
    this.onNavigate();
    this.router.navigate(href);
  }
}
