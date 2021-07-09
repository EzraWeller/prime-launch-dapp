import { SeedService } from "services/SeedService";
import { autoinject, singleton } from "aurelia-framework";
import { Router } from "aurelia-router";
import "./home.scss";
import { Seed } from "entities/Seed";

@singleton(false)
@autoinject
export class Home {

  featuredSeeds: Array<Seed> = null;

  constructor(
    private router: Router,
    private seedService: SeedService,
  ) {
  }

  attached(): void {
    this.seedService.getFeaturedSeeds().then((seeds) => {
      this.featuredSeeds = seeds;
    });
  }

  navigate(href: string): void {
    this.router.navigate(href);
  }
}
