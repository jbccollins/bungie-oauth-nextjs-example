import { emptyArray, emptyObject } from "@/lib/utils";
import {
  AllDestinyManifestComponents,
  DestinyInventoryItemDefinition,
  DestinyItemActionBlockDefinition,
  DestinyItemTalentGridBlockDefinition,
  DestinyItemTranslationBlockDefinition,
  getDestinyManifest,
} from "bungie-api-ts-no-const-enum/destiny2";
import { unauthenticatedHttpClient } from "./http-client";

type Mutable<T> = { -readonly [P in keyof T]: Mutable<T[P]> };
/** Functions that can reduce the size of a table after it's downloaded but before it's saved to cache. */
const tableTrimmers = {
  DestinyInventoryItemDefinition(table: {
    [hash: number]: DestinyInventoryItemDefinition;
  }) {
    for (const key in table) {
      const def = table[key] as Mutable<DestinyInventoryItemDefinition>;

      // Deleting properties can actually make memory usage go up as V8 replaces some efficient
      // structures from JSON parsing. Only replace objects with empties, and always test with the
      // memory profiler. Don't assume that deleting something makes this smaller.

      def.action = emptyObject<Mutable<DestinyItemActionBlockDefinition>>();
      def.backgroundColor = emptyObject();
      def.translationBlock =
        emptyObject<Mutable<DestinyItemTranslationBlockDefinition>>();
      if (def.equippingBlock?.displayStrings?.length) {
        def.equippingBlock.displayStrings = emptyArray();
      }
      if (def.preview?.derivedItemCategories?.length) {
        def.preview.derivedItemCategories = emptyArray();
      }
      def.talentGrid =
        emptyObject<Mutable<DestinyItemTalentGridBlockDefinition>>();

      if (def.sockets) {
        def.sockets.intrinsicSockets = emptyArray();
        for (const socket of def.sockets.socketEntries) {
          if (
            socket.reusablePlugSetHash &&
            socket.reusablePlugItems.length > 0
          ) {
            socket.reusablePlugItems = emptyArray();
          }
        }
      }
    }

    return table;
  },
};

export const getManifest = async (tableAllowList: string[]) => {
  let components: {
    [key: string]: string;
  } | null = null;
  const { Response } = await getDestinyManifest(unauthenticatedHttpClient);
  components = Response.jsonWorldComponentContentPaths.en;
  return await loadManifestRemote(components, tableAllowList);
};

/**
 * Returns a promise for the manifest data as a Uint8Array. Will cache it on success.
 */
async function loadManifestRemote(
  // version: string,
  components: {
    [key: string]: string;
  },
  tableAllowList: string[]
): Promise<AllDestinyManifestComponents> {
  const manifest = await downloadManifestComponents(components, tableAllowList);

  // We intentionally don't wait on this promise
  // saveManifestToIndexedDB(manifest, version, tableAllowList);
  return manifest;
}

export async function downloadManifestComponents(
  components: {
    [key: string]: string;
  },
  tableAllowList: string[]
) {
  // Adding a cache buster to work around bad cached CloudFlare data: https://github.com/DestinyItemManager/DIM/issues/5101
  // try canonical component URL which should likely be already cached,
  // then fall back to appending "?bust" then "?bust-[random numbers]",
  // in case cloudflare has inappropriately cached another domain's CORS headers or a 404 that's no longer a 404
  const cacheBusterStrings = [
    "",
    "?bust",
    `?bust-${Math.random().toString().split(".")[1] ?? "cacheBust"}`,
  ];

  const manifest: Partial<AllDestinyManifestComponents> = {};

  // Load the manifest tables we want table-by-table, in parallel. This is
  // faster and downloads less data than the single huge file.
  const futures = tableAllowList
    .map((t) => `Destiny${t}Definition`)
    .map(async (table) => {
      let response: Response | null = null;
      let error = null;
      let body = null;

      for (const query of cacheBusterStrings) {
        try {
          response = await fetch(
            `https://www.bungie.net${components[table]}${query}`
          );
          if (response.ok) {
            // Sometimes the file is found, but isn't parseable as JSON
            body = await response.json();
            break;
          }
          error ??= response;
        } catch (e) {
          error ??= e;
        }
      }
      if (!body && error) {
        throw error;
      }

      // I couldn't figure out how to make these types work...
      //@ts-ignore
      manifest[table] =
        //@ts-ignore
        table in tableTrimmers ? tableTrimmers[table]!(body) : body;
    });

  await Promise.all(futures);

  return manifest as AllDestinyManifestComponents;
}
