"use client";

import { getDefinitions } from "@/lib/bungie-api/d2-definitions";
import {
  DestinyAccount,
  getCharacterInvetoryItems,
  getDestinyAccountsForBungieAccount,
  getMembershipData,
} from "@/lib/bungie-api/destiny2";
import { deleteManifestFile } from "@/lib/bungie-api/manifest-service";
import { bungieNetPath } from "@/lib/utils";
import { DestinyInventoryItemDefinition } from "bungie-api-ts-no-const-enum/destiny2";
import { useEffect, useState } from "react";

export default function ManifestPlayground() {
  const [inventoryItemDefinitions, setInventoryItemDefinitions] = useState<
    DestinyInventoryItemDefinition[]
  >([]);
  const handleClearManifestCache = async () => {
    await deleteManifestFile();
    window.location.reload();
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [characterInventoryItemHashes, setCharacterInventoryItemHashes] =
    useState<number[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const definitions = await getDefinitions();
        const inventoryItemDefinitions = definitions.InventoryItem;
        setInventoryItemDefinitions(Object.values(inventoryItemDefinitions));
        const membershipData = await getMembershipData();
        const platformData = await getDestinyAccountsForBungieAccount(
          membershipData.membershipId
        );
        const mostRecentPlatform = platformData.find(
          (platform) => platform.membershipId === membershipData.membershipId
        );

        const characterInvetoryItems = await getCharacterInvetoryItems(
          mostRecentPlatform as DestinyAccount
        );

        const characterInventoryItemHashes = characterInvetoryItems?.map(
          (characterInvetoryItem) => characterInvetoryItem.itemHash
        ) as number[];
        setCharacterInventoryItemHashes(characterInventoryItemHashes);

        setLoading(false);
      } catch (e) {
        console.error(e);
        setError(true);
      }
    })();
  }, []);
  return (
    <div style={{ maxWidth: "600px", margin: "auto" }}>
      <div>Manifest Playground</div>
      {loading && <div style={{ marginTop: "8px" }}>Loading...</div>}
      {error && <div style={{ marginTop: "8px" }}>Manifest Error</div>}
      {!loading && !error && (
        <div style={{ marginTop: "16px" }}>
          <button onClick={handleClearManifestCache}>
            Clear Manifest Cache
          </button>
          <div
            style={{
              marginTop: "16px",
              marginBottom: "32px",
              textAlign: "left",
            }}
          >
            This is a simple example of relating manifest definitions to items
            in your inventory. The following is a list of all exotic armor
            pieces in the manifest, with items in your inventory marked as such.
          </div>
          {inventoryItemDefinitions
            .sort((a, b) => {
              if (a.displayProperties.name < b.displayProperties.name) {
                return -1;
              }
              if (a.displayProperties.name > b.displayProperties.name) {
                return 1;
              }
              return 0;
            })
            .filter((v) => v.itemType === 2) // Is armor
            .filter((v) => v.collectibleHash !== undefined) // Is in collections
            .filter((v) => v.inventory?.tierType === 6) // Is exotic
            .map((inventoryItemDefinition) => {
              return (
                <div
                  key={inventoryItemDefinition.hash}
                  style={{ display: "flex" }}
                >
                  <div style={{ marginRight: "8px" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt="icon"
                      width={32}
                      height={32}
                      src={bungieNetPath(
                        inventoryItemDefinition.displayProperties.icon
                      )}
                    />
                  </div>
                  <div>{inventoryItemDefinition.displayProperties?.name}</div>
                  {characterInventoryItemHashes.includes(
                    inventoryItemDefinition.hash
                  ) && (
                    <div style={{ marginLeft: "8px", color: "green" }}>
                      In Character Inventory
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
