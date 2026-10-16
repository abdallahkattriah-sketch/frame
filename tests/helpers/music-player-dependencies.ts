import { readFileSync } from "node:fs";
import ts from "typescript";
import * as explicitPreference from "../../src/lib/music/explicit-preference.ts";
import { MusicQueueOrder, queueTrackKey } from "../../src/lib/music/queue-order.ts";
import * as queueSource from "../../src/lib/music/queue-source.ts";
import * as sourceVersion from "../../src/lib/music/source-version.ts";

type Preferences = {
  readMusicPreference: (key: string) => string | null;
  writeMusicPreference: (key: string, value: string) => void;
};

function compile(file: string, mocks: Record<string, unknown>) {
  const source = readFileSync(new URL(`../../src/lib/music/${file}.ts`, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  const module = { exports: {} };
  new Function("require", "module", "exports", outputText)(
    (name: string) => {
      if (!Object.hasOwn(mocks, name)) throw new Error(`Unexpected dependency: ${name}`);
      return mocks[name];
    },
    module,
    module.exports,
  );
  return module.exports;
}

// Player imports that the playback harnesses keep real (pure or per-fixture state) or stub (profile stores).
export function musicPlayerDependencies(
  preferences: Preferences = { readMusicPreference: () => null, writeMusicPreference: () => {} },
): Record<string, unknown> {
  return {
    "./source-version": sourceVersion,
    "./queue-source": queueSource,
    "./explicit-preference": explicitPreference,
    "./queue-automation": compile("queue-automation", {}),
    "./transport": compile("transport", {
      react: { useSyncExternalStore: () => undefined },
      "./queue-order": { MusicQueueOrder, queueTrackKey },
      "./preferences": preferences,
    }),
    "./pinned-sources": {
      loadPinnedSources: async () => {},
      peekPinnedSource: () => null,
      pinSourceFor: () => {},
      unpinSourceFor: () => {},
    },
    "@/lib/active-profile-id": {
      activeProfileId: () => "default",
      activeProfileIsPrimary: () => true,
    },
    "@/lib/platform": { isWindowsDesktop: () => false },
    "./listening-affinity": {
      hydrateListeningAffinity: async () => {},
      observeMusicListening: () => {},
    },
    "./artist-blocks": {
      filterBlockedTracks: <T>(tracks: readonly T[]) => [...tracks],
      hydrateArtistBlockStore: async () => {},
    },
    "./liked-artists": { hydrateLikedArtistStore: async () => {} },
    "./recent-context": {
      hydrateMusicContextTracks: async () => {},
      hydrateMusicRecentContexts: async () => {},
    },
    "./recent-destinations": { hydrateMusicDestinations: async () => {} },
  };
}
