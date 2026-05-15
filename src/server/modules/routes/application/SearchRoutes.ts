import { IRouteRepository, RouteEntity } from "../domain/IRouteRepository";

export interface SearchRoutesInput {
  origin?: string;
  destination?: string;
}

export class SearchRoutesUseCase {
  constructor(private routeRepository: IRouteRepository) {}

  async execute(input: SearchRoutesInput): Promise<RouteEntity[]> {
    if (!input.origin && !input.destination) {
      return await this.routeRepository.findAll({ status: undefined });
    }

    return await this.routeRepository.search(
      input.origin || "",
      input.destination || ""
    );
  }
}
