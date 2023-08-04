import {
  BungieMembershipType,
  DestinyComponentType,
  DestinyGameVersions,
  DestinyItemComponent,
  DestinyLinkedProfilesResponse,
  DestinyProfileResponse,
  DestinyProfileUserInfoCard,
  getLinkedProfiles,
  getProfile as getProfileApi,
} from "bungie-api-ts-no-const-enum/destiny2";
import {
  ServerResponse,
  UserInfoCard,
  getMembershipDataForCurrentUser,
} from "bungie-api-ts-no-const-enum/user";
import compact from "lodash.compact";
import { authenticatedHttpClient } from "./http-client";

export async function getMembershipData() {
  const response = await getMembershipDataForCurrentUser(
    authenticatedHttpClient
  );
  const res = response?.Response.destinyMemberships;

  const memberships = res.filter(
    (m) => m.crossSaveOverride == 0 || m.crossSaveOverride == m.membershipType
  );

  let result: UserInfoCard | null = null;
  if (memberships?.length == 1) {
    // This guardian only has one account linked, so we can proceed as normal
    result = memberships?.[0];
  } else {
    // This guardian has multiple accounts linked.
    // Fetch the last login time for each account, and use the one that was most recently used.
    let lastLoggedInProfileIndex: any = 0;
    let lastPlayed = 0;
    for (const id in memberships) {
      const membership = memberships?.[id];
      let profile: ServerResponse<DestinyProfileResponse> | null = null;
      try {
        profile = await getProfileApi(authenticatedHttpClient, {
          components: [DestinyComponentType.Profiles],
          membershipType: membership.membershipType,
          destinyMembershipId: membership.membershipId,
        });
      } catch (error) {
        console.warn(
          "Failed to load profile. This could be an issue where the profile is linked but has no characters."
        );
        continue;
      }
      if (!!profile && profile.Response?.profile.data?.dateLastPlayed) {
        const date = Date.parse(profile.Response?.profile.data?.dateLastPlayed);
        if (date > lastPlayed) {
          lastPlayed = date;
          lastLoggedInProfileIndex = id;
        }
      }
    }
    result = memberships?.[lastLoggedInProfileIndex];
  }
  return result;
}

export async function getDestinyAccountsForBungieAccount(
  bungieMembershipId: string
): Promise<DestinyAccount[]> {
  try {
    const linkedAccounts = await getLinkedAccounts(bungieMembershipId);
    const platforms = await generatePlatforms(linkedAccounts);
    if (platforms.length === 0) {
      console.error("No platforms");
    }
    return platforms;
  } catch (e) {
    throw e;
  }
}

export async function getLinkedAccounts(
  bungieMembershipId: string
): Promise<DestinyLinkedProfilesResponse> {
  const response = await getLinkedProfiles(authenticatedHttpClient, {
    membershipId: bungieMembershipId,
    membershipType: BungieMembershipType.BungieNext,
    getAllMemberships: true,
  });
  return response.Response;
}

/**
 * @param accounts raw Bungie API accounts response
 */
async function generatePlatforms(
  accounts: DestinyLinkedProfilesResponse
): Promise<DestinyAccount[]> {
  // accounts with errors could have had D1 characters!

  const accountPromises = accounts.profiles
    .flatMap((destinyAccount) => {
      const account: DestinyAccount = {
        displayName: formatBungieName(destinyAccount),
        originalPlatformType: destinyAccount.membershipType,
        membershipId: destinyAccount.membershipId,
        platformLabel: PLATFORM_LABELS[destinyAccount.membershipType],

        platforms: destinyAccount.applicableMembershipTypes,
        lastPlayed: new Date(destinyAccount.dateLastPlayed),
      };

      return [account];
    })
    .concat(
      // Profiles with errors could be D1 accounts
      // Consider both D1 and D2 accounts with errors, save profile errors and show on page
      // unless it's a specific error like DestinyAccountNotFound
      accounts.profilesWithErrors.flatMap((errorProfile) => {
        const destinyAccount = errorProfile.infoCard;
        const account: DestinyAccount = {
          displayName: formatBungieName(destinyAccount),
          originalPlatformType: destinyAccount.membershipType,
          membershipId: destinyAccount.membershipId,
          platformLabel: PLATFORM_LABELS[destinyAccount.membershipType],

          platforms: [destinyAccount.membershipType],
          lastPlayed: new Date(),
        };

        return [account];
      })
    );

  const allPromise = Promise.all(accountPromises);
  return compact(await allPromise);
}

/**
 * Platform types (membership types) in the Bungie API.
 */
export const PLATFORM_LABELS = {
  [BungieMembershipType.TigerXbox]: "Xbox",
  [BungieMembershipType.TigerPsn]: "PlayStation",
  [BungieMembershipType.TigerBlizzard]: "Blizzard",
  [BungieMembershipType.TigerDemon]: "Demon",
  [BungieMembershipType.TigerSteam]: "Steam",
  [BungieMembershipType.TigerStadia]: "Stadia",
  [BungieMembershipType.TigerEgs]: "Epic",
  [BungieMembershipType.BungieNext]: "Bungie.net",
  [BungieMembershipType.None]: "None",
  [BungieMembershipType.All]: "All",
};

/** A specific Destiny account (one per platform and Destiny version) */
export interface DestinyAccount {
  /** Platform account name (gamertag or PSN ID) */
  readonly displayName: string;
  /** The platform type this account started on. It may not be exclusive to this platform anymore, but this is what gets used to call APIs. */
  readonly originalPlatformType: BungieMembershipType;
  /** readable platform name */
  readonly platformLabel: string;
  /** Destiny platform membership ID. */
  readonly membershipId: string;
  /** Which version of Destiny 2 / DLC do they own? (not reliable after Cross-Save) */
  readonly versionsOwned?: DestinyGameVersions;
  /** All the platforms this account plays on (post-Cross-Save) */
  readonly platforms: BungieMembershipType[];

  /** When was this account last used? */
  readonly lastPlayed?: Date;
}

export function formatBungieName(
  destinyAccount: DestinyProfileUserInfoCard | UserInfoCard
) {
  return (
    destinyAccount.bungieGlobalDisplayName +
    (destinyAccount.bungieGlobalDisplayNameCode
      ? `#${destinyAccount.bungieGlobalDisplayNameCode
          .toString()
          .padStart(4, "0")}`
      : "")
  );
}

/**
 * Get parameterized profile information for the whole account. Pass in components to select what
 * you want. This can handle just characters, full inventory, vendors, kiosks, activities, etc.
 */
async function getProfile(
  platform: DestinyAccount,
  ...components: DestinyComponentType[]
): Promise<DestinyProfileResponse> {
  const response = await getProfileApi(authenticatedHttpClient, {
    destinyMembershipId: platform.membershipId,
    membershipType: platform.originalPlatformType,
    components,
  });
  // TODO: what does it actually look like to not have an account?
  if (Object.keys(response.Response).length === 0) {
    throw new Error("BungieService.NoAccountForPlatform");
  }
  return response.Response;
}

/**
 * Get just character info for all a user's characters on the given platform. No inventory, just enough to refresh stats.
 */
export function getCharacters(
  platform: DestinyAccount
): Promise<DestinyProfileResponse> {
  return getProfile(platform, DestinyComponentType.Characters);
}

/**
 * Get the user's stores on this platform. This includes characters, vault, and item information.
 */
export function getStores(
  platform: DestinyAccount
): Promise<DestinyProfileResponse> {
  return getProfile(
    platform,
    DestinyComponentType.Profiles,
    DestinyComponentType.ProfileInventories,
    DestinyComponentType.ProfileCurrencies,
    DestinyComponentType.Characters,
    DestinyComponentType.CharacterInventories,
    DestinyComponentType.CharacterEquipment,
    DestinyComponentType.ItemStats,
    DestinyComponentType.ItemInstances,
    DestinyComponentType.ItemPerks,
    DestinyComponentType.ItemSockets,
    DestinyComponentType.ItemPlugStates,
    DestinyComponentType.Collectibles,
    DestinyComponentType.CharacterLoadouts
  );
}

export const getCharacterInvetoryItems = (
  account: DestinyAccount
): Promise<DestinyItemComponent[] | undefined> => {
  const promise = (async () => {
    try {
      const profileInfo = await getStores(account);
      if (!profileInfo?.characters?.data) {
        return;
      }
      let items: DestinyItemComponent[] = [];
      Object.keys(profileInfo.characters.data).forEach((characterId) => {
        const characterInventory =
          profileInfo.characterInventories.data?.[characterId]?.items || [];
        items = items.concat(characterInventory);
      });
      return items;
    } catch (e) {
      return undefined;
    }
  })();
  return promise;
};
