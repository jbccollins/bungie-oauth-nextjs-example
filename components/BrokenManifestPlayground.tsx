"use client";
import { unauthenticatedHttpClient } from "@/lib/bungie-api/http-client";
import {
  getDestinyManifest,
  getDestinyManifestSlice,
} from "bungie-api-ts-no-const-enum/destiny2";
import { useEffect } from "react";

async function getDestinyInvetoryItemDefinitions() {
  const destinyManifest = await getDestinyManifest(unauthenticatedHttpClient);
  return await getDestinyManifestSlice(unauthenticatedHttpClient, {
    destinyManifest: destinyManifest.Response,
    tableNames: ["DestinyInventoryItemDefinition"],
    language: "en",
  });
}
export default function BrokenManifestPlayground() {
  useEffect(() => {
    (async () => {
      try {
        await getDestinyInvetoryItemDefinitions();
      } catch (e) {}
    })();
  }, []);
  return (
    <div>
      <div>Manifest Playground</div>
      <div style={{ marginTop: "8px" }}>hello</div>
    </div>
  );
}
