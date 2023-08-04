import {
  AllDestinyManifestComponents,
  DestinyActivityDefinition,
  DestinyActivityModeDefinition,
  DestinyActivityModifierDefinition,
  DestinyBreakerTypeDefinition,
  DestinyClassDefinition,
  DestinyCollectibleDefinition,
  DestinyDamageTypeDefinition,
  DestinyDestinationDefinition,
  DestinyEnergyTypeDefinition,
  DestinyEventCardDefinition,
  DestinyFactionDefinition,
  DestinyGenderDefinition,
  DestinyInventoryBucketDefinition,
  DestinyInventoryItemDefinition,
  DestinyItemCategoryDefinition,
  DestinyItemTierTypeDefinition,
  DestinyMaterialRequirementSetDefinition,
  DestinyMetricDefinition,
  DestinyMilestoneDefinition,
  DestinyObjectiveDefinition,
  DestinyPlaceDefinition,
  DestinyPlugSetDefinition,
  DestinyPowerCapDefinition,
  DestinyPresentationNodeDefinition,
  DestinyProgressionDefinition,
  DestinyRaceDefinition,
  DestinyRecordDefinition,
  DestinySandboxPerkDefinition,
  DestinySeasonDefinition,
  DestinySeasonPassDefinition,
  DestinySocketCategoryDefinition,
  DestinySocketTypeDefinition,
  DestinyStatDefinition,
  DestinyStatGroupDefinition,
  DestinyTraitDefinition,
  DestinyVendorDefinition,
  DestinyVendorGroupDefinition,
} from "bungie-api-ts-no-const-enum/destiny2";
import { getManifest } from "./manifest-service";

export const allTables = [
  "InventoryItem",
  "Objective",
  "SandboxPerk",
  "Stat",
  "StatGroup",
  "DamageType",
  "Progression",
  "ItemCategory",
  "Activity",
  "ActivityModifier",
  "Vendor",
  "SocketCategory",
  "SocketType",
  "MaterialRequirementSet",
  "Season",
  "SeasonPass",
  "Milestone",
  "Destination",
  "Place",
  "VendorGroup",
  "PlugSet",
  "Collectible",
  "PresentationNode",
  "Record",
  "Metric",
  // "Trait",
  "PowerCap",
  "BreakerType",
  "EventCard",
  "LoadoutName",
  "LoadoutIcon",
  "LoadoutColor",
  "InventoryBucket",
  // "Class",
  "Gender",
  "Race",
  "Faction",
  "ItemTierType",
  "ActivityMode",
  "LoadoutConstants",
];

export interface DefinitionTable<T> {
  /**
   * for troubleshooting/questionable lookups, include second arg
   * and sentry can gather info about the source of the invalid hash.
   * `requestor` ideally a string/number, or a definition including a "hash" key
   */
  get(hash: number, requestor?: { hash: number } | string | number): T;
  getAll(): { [hash: number]: T };
}

export interface D2ManifestDefinitions {
  InventoryItem: DefinitionTable<DestinyInventoryItemDefinition>;
  Objective: DefinitionTable<DestinyObjectiveDefinition>;
  SandboxPerk: DefinitionTable<DestinySandboxPerkDefinition>;
  Stat: DefinitionTable<DestinyStatDefinition>;
  StatGroup: DefinitionTable<DestinyStatGroupDefinition>;
  EnergyType: DefinitionTable<DestinyEnergyTypeDefinition>;
  Progression: DefinitionTable<DestinyProgressionDefinition>;
  ItemCategory: DefinitionTable<DestinyItemCategoryDefinition>;
  Activity: DefinitionTable<DestinyActivityDefinition>;
  ActivityModifier: DefinitionTable<DestinyActivityModifierDefinition>;
  Vendor: DefinitionTable<DestinyVendorDefinition>;
  SocketCategory: DefinitionTable<DestinySocketCategoryDefinition>;
  SocketType: DefinitionTable<DestinySocketTypeDefinition>;
  MaterialRequirementSet: DefinitionTable<DestinyMaterialRequirementSetDefinition>;
  Season: DefinitionTable<DestinySeasonDefinition>;
  SeasonPass: DefinitionTable<DestinySeasonPassDefinition>;
  Milestone: DefinitionTable<DestinyMilestoneDefinition>;
  Destination: DefinitionTable<DestinyDestinationDefinition>;
  Place: DefinitionTable<DestinyPlaceDefinition>;
  VendorGroup: DefinitionTable<DestinyVendorGroupDefinition>;
  PlugSet: DefinitionTable<DestinyPlugSetDefinition>;
  PresentationNode: DefinitionTable<DestinyPresentationNodeDefinition>;
  Record: DefinitionTable<DestinyRecordDefinition>;
  Metric: DefinitionTable<DestinyMetricDefinition>;
  Trait: DefinitionTable<DestinyTraitDefinition>;
  PowerCap: DefinitionTable<DestinyPowerCapDefinition>;
  BreakerType: DefinitionTable<DestinyBreakerTypeDefinition>;
  DamageType: DefinitionTable<DestinyDamageTypeDefinition>;
  Collectible: DefinitionTable<DestinyCollectibleDefinition>;
  EventCard: DefinitionTable<DestinyEventCardDefinition>;

  InventoryBucket: { [hash: number]: DestinyInventoryBucketDefinition };
  Class: { [hash: number]: DestinyClassDefinition };
  Gender: { [hash: number]: DestinyGenderDefinition };
  Race: { [hash: number]: DestinyRaceDefinition };
  Faction: { [hash: number]: DestinyFactionDefinition };
  ItemTierType: { [hash: number]: DestinyItemTierTypeDefinition };
  ActivityMode: { [hash: number]: DestinyActivityModeDefinition };
}

export class HashLookupFailure extends Error {
  table: string;
  id: number;

  constructor(table: string, id: number) {
    super(`hashLookupFailure: ${table}[${id}]`);
    this.table = table;
    this.id = id;
    this.name = "HashLookupFailure";
  }
}

/**
 * Manifest database definitions. This returns a promise for an
 * object that has a property named after each of the tables listed
 * above (defs.TalentGrid, etc.).
 */
export async function getDefinitions(): Promise<D2ManifestDefinitions> {
  const manifest = await getManifest(allTables);
  const defs = buildDefinitionsFromManifest(manifest);
  return defs;
}

export function buildDefinitionsFromManifest(db: AllDestinyManifestComponents) {
  const defs: Partial<D2ManifestDefinitions> = {};
  // Resources that need to be fully loaded (because they're iterated over)
  allTables.forEach((tableShort) => {
    const table = `Destiny${tableShort}Definition`;
    defs[tableShort as keyof D2ManifestDefinitions] = db[
      table as keyof AllDestinyManifestComponents
    ] as any;
  });

  return defs as D2ManifestDefinitions;
}
