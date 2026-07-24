import type { AccuracyInput } from '../components/AccuracyModal';
import type { Difficulty, UserMusicResult } from './calculator';

const RESULT_STORAGE_KEY = 'sekai_user_results';
const LAST_MODIFIED_STORAGE_KEY = 'sekai_last_modified';
const ACCURACY_STORAGE_KEY = 'sekai_accuracy_data';
const PROFILE_STORAGE_KEY = 'userProfile';
const LEGACY_MIGRATION_KEY = 'sekai-force-account-sync-initialized-v1';
const MAX_SYNCED_PROFILE_IMAGE_LENGTH = 180_000;

export const RESULT_DIRTY_KEY = 'sekai-force-results:account-dirty';
export const ACCURACY_DIRTY_KEY = 'sekai-force-accuracy:account-dirty';
export const SETTINGS_DIRTY_KEY = 'sekai-force-settings:account-dirty';

const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard', 'expert', 'master', 'append'];
const PLAY_RESULTS: UserMusicResult['playResult'][] = ['clear', 'full_combo', 'full_perfect'];

type ResultTuple = [
    musicId: string,
    difficultyIndex: number,
    resultIndex: number,
    score: number,
    createdAt: number,
    updatedAt: number,
];

type AccuracyTuple = [
    key: string,
    perfect: number,
    great: number,
    good: number,
    bad: number,
    miss: number,
];

export type ResultsSnapshot = {
    schemaVersion: 1;
    records: ResultTuple[];
    lastModified: string | null;
};

export type AccuracySnapshot = {
    schemaVersion: 1;
    records: AccuracyTuple[];
};

export type ForceProfile = {
    sekaiRank: string;
    playerId: string;
    twitterId: string;
    registrationDate: string;
    playerName: string;
    language: 'ko' | 'jp';
    profileImage?: string | null;
    displayDateType: 'registration' | 'lastModified';
};

type OptionalPreferences = {
    showUnreleased: boolean | null;
    showAccuracy: boolean | null;
    showLimited: boolean | null;
    dimCleared: boolean | null;
    tierSource: 'jp' | 'gallery' | null;
    theme: 'dark' | 'light' | null;
};

export type SettingsSnapshot = {
    schemaVersion: 1;
    profile: ForceProfile | null;
    preferences: OptionalPreferences;
};

export const DEFAULT_FORCE_PROFILE: ForceProfile = {
    sekaiRank: '399',
    playerId: '6393939393939393',
    twitterId: '',
    registrationDate: '2020-10-03T15:39:39',
    playerName: '셐붕이',
    language: 'ko',
    profileImage: 'https://asset.rilaksekai.com/face/res021_no008_normal.webp',
    displayDateType: 'lastModified',
};

const EMPTY_RESULTS: ResultsSnapshot = {
    schemaVersion: 1,
    records: [],
    lastModified: null,
};

const EMPTY_ACCURACY: AccuracySnapshot = {
    schemaVersion: 1,
    records: [],
};

const EMPTY_SETTINGS: SettingsSnapshot = {
    schemaVersion: 1,
    profile: null,
    preferences: {
        showUnreleased: null,
        showAccuracy: null,
        showLimited: null,
        dimCleared: null,
        tierSource: null,
        theme: null,
    },
};

const isObject = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isFiniteNumber = (value: unknown): value is number => (
    typeof value === 'number' && Number.isFinite(value)
);

const parseStoredJson = (key: string): unknown => {
    if (typeof window === 'undefined') return null;
    try {
        return JSON.parse(window.localStorage.getItem(key) || 'null');
    } catch {
        return null;
    }
};

const normalizeResultTuple = (value: unknown): ResultTuple | null => {
    if (!Array.isArray(value) || value.length !== 6) return null;
    const [musicId, difficultyIndex, resultIndex, score, createdAt, updatedAt] = value;
    if (
        typeof musicId !== 'string'
        || musicId.length === 0
        || musicId.length > 24
        || !Number.isInteger(difficultyIndex)
        || Number(difficultyIndex) < 0
        || Number(difficultyIndex) >= DIFFICULTIES.length
        || !Number.isInteger(resultIndex)
        || Number(resultIndex) < 0
        || Number(resultIndex) >= PLAY_RESULTS.length
        || !isFiniteNumber(score)
        || !isFiniteNumber(createdAt)
        || !isFiniteNumber(updatedAt)
    ) return null;
    return [
        musicId,
        Number(difficultyIndex),
        Number(resultIndex),
        score,
        createdAt,
        updatedAt,
    ];
};

const encodeResult = (value: UserMusicResult): ResultTuple | null => normalizeResultTuple([
    value.musicId,
    DIFFICULTIES.indexOf(value.musicDifficulty),
    PLAY_RESULTS.indexOf(value.playResult),
    value.score,
    value.createdAt,
    value.updatedAt,
]);

export const normalizeResultsSnapshot = (value: unknown): ResultsSnapshot => {
    if (!isObject(value)) return EMPTY_RESULTS;
    const records = Array.isArray(value.records) ? value.records : [];
    const deduplicated = new Map<string, ResultTuple>();
    records.forEach((record) => {
        const normalized = normalizeResultTuple(record);
        if (!normalized) return;
        const key = `${normalized[0]}:${normalized[1]}`;
        const existing = deduplicated.get(key);
        if (!existing || normalized[5] >= existing[5]) deduplicated.set(key, normalized);
    });
    return {
        schemaVersion: 1,
        records: [...deduplicated.values()].sort((left, right) => (
            `${left[0]}:${left[1]}`.localeCompare(`${right[0]}:${right[1]}`)
        )),
        lastModified: typeof value.lastModified === 'string' ? value.lastModified : null,
    };
};

export const isResultsSnapshot = (value: unknown): value is ResultsSnapshot => (
    isObject(value)
    && value.schemaVersion === 1
    && Array.isArray(value.records)
    && value.records.every(record => normalizeResultTuple(record) !== null)
    && (value.lastModified === null || typeof value.lastModified === 'string')
);

export const encodeUserResults = (
    results: UserMusicResult[],
    lastModified: string | null,
): ResultsSnapshot => normalizeResultsSnapshot({
    schemaVersion: 1,
    records: results.map(encodeResult).filter((value): value is ResultTuple => value !== null),
    lastModified,
});

export const decodeUserResults = (snapshot: ResultsSnapshot): UserMusicResult[] => (
    normalizeResultsSnapshot(snapshot).records.map(record => ({
        musicId: record[0],
        musicDifficulty: DIFFICULTIES[record[1]],
        playResult: PLAY_RESULTS[record[2]],
        score: record[3],
        createdAt: record[4],
        updatedAt: record[5],
    }))
);

export const mergeResultsSnapshots = (
    local: ResultsSnapshot,
    remote: ResultsSnapshot,
): ResultsSnapshot => {
    const localValue = normalizeResultsSnapshot(local);
    const remoteValue = normalizeResultsSnapshot(remote);
    return normalizeResultsSnapshot({
        schemaVersion: 1,
        records: [...remoteValue.records, ...localValue.records],
        lastModified: [localValue.lastModified, remoteValue.lastModified]
            .filter((date): date is string => Boolean(date))
            .sort()
            .at(-1) || null,
    });
};

const normalizeAccuracyTuple = (value: unknown): AccuracyTuple | null => {
    if (!Array.isArray(value) || value.length !== 6) return null;
    const [key, perfect, great, good, bad, miss] = value;
    const values = [perfect, great, good, bad, miss];
    if (
        typeof key !== 'string'
        || key.length === 0
        || key.length > 96
        || !values.every(item => Number.isInteger(item) && Number(item) >= 0)
    ) return null;
    return [key, Number(perfect), Number(great), Number(good), Number(bad), Number(miss)];
};

export const normalizeAccuracySnapshot = (value: unknown): AccuracySnapshot => {
    if (!isObject(value)) return EMPTY_ACCURACY;
    const records = Array.isArray(value.records) ? value.records : [];
    const deduplicated = new Map<string, AccuracyTuple>();
    records.forEach((record) => {
        const normalized = normalizeAccuracyTuple(record);
        if (normalized) deduplicated.set(normalized[0], normalized);
    });
    return {
        schemaVersion: 1,
        records: [...deduplicated.values()].sort((left, right) => left[0].localeCompare(right[0])),
    };
};

export const isAccuracySnapshot = (value: unknown): value is AccuracySnapshot => (
    isObject(value)
    && value.schemaVersion === 1
    && Array.isArray(value.records)
    && value.records.every(record => normalizeAccuracyTuple(record) !== null)
);

const accuracyTupleScore = (record: AccuracyTuple) => {
    const total = record[1] + record[2] + record[3] + record[4] + record[5];
    return total > 0 ? (record[1] * 3 + record[2] * 2 + record[3]) / (total * 3) : 0;
};

export const mergeAccuracySnapshots = (
    local: AccuracySnapshot,
    remote: AccuracySnapshot,
): AccuracySnapshot => {
    const merged = new Map<string, AccuracyTuple>();
    normalizeAccuracySnapshot(remote).records.forEach(record => merged.set(record[0], record));
    normalizeAccuracySnapshot(local).records.forEach((record) => {
        const existing = merged.get(record[0]);
        if (!existing || accuracyTupleScore(record) >= accuracyTupleScore(existing)) {
            merged.set(record[0], record);
        }
    });
    return normalizeAccuracySnapshot({ schemaVersion: 1, records: [...merged.values()] });
};

const normalizeProfile = (value: unknown): ForceProfile | null => {
    if (!isObject(value)) return null;
    const text = (key: string, fallback: string, maxLength: number) => (
        typeof value[key] === 'string' ? String(value[key]).slice(0, maxLength) : fallback
    );
    const normalized: ForceProfile = {
        sekaiRank: text('sekaiRank', DEFAULT_FORCE_PROFILE.sekaiRank, 12),
        playerId: text('playerId', DEFAULT_FORCE_PROFILE.playerId, 32),
        twitterId: text('twitterId', '', 64),
        registrationDate: text('registrationDate', DEFAULT_FORCE_PROFILE.registrationDate, 32),
        playerName: text('playerName', DEFAULT_FORCE_PROFILE.playerName, 80),
        language: value.language === 'jp' ? 'jp' : 'ko',
        displayDateType: value.displayDateType === 'registration' ? 'registration' : 'lastModified',
    };
    if (value.profileImage === null) {
        normalized.profileImage = null;
    } else if (typeof value.profileImage === 'string') {
        const image = value.profileImage;
        const isRemoteImage = image.length <= 2048 && /^https?:\/\//i.test(image);
        const isInlineImage = image.length <= MAX_SYNCED_PROFILE_IMAGE_LENGTH
            && /^data:image\/(?:png|jpe?g|webp);base64,/i.test(image);
        if (isRemoteImage || isInlineImage) normalized.profileImage = image;
    }
    return normalized;
};

const normalizeOptionalBoolean = (value: unknown) => (
    typeof value === 'boolean' ? value : null
);

const isOptionalBoundedString = (value: unknown, maxLength: number) => (
    value === undefined || (typeof value === 'string' && value.length <= maxLength)
);

const isValidProfileImage = (value: unknown) => {
    if (value === undefined || value === null) return true;
    if (typeof value !== 'string') return false;
    return (
        (value.length <= 2048 && /^https?:\/\//i.test(value))
        || (
            value.length <= MAX_SYNCED_PROFILE_IMAGE_LENGTH
            && /^data:image\/(?:png|jpe?g|webp);base64,/i.test(value)
        )
    );
};

const isValidProfileSnapshot = (value: unknown) => {
    if (value === undefined || value === null) return true;
    if (!isObject(value)) return false;
    return (
        isOptionalBoundedString(value.sekaiRank, 12)
        && isOptionalBoundedString(value.playerId, 32)
        && isOptionalBoundedString(value.twitterId, 64)
        && isOptionalBoundedString(value.registrationDate, 32)
        && isOptionalBoundedString(value.playerName, 80)
        && (value.language === undefined || value.language === 'ko' || value.language === 'jp')
        && (
            value.displayDateType === undefined
            || value.displayDateType === 'registration'
            || value.displayDateType === 'lastModified'
        )
        && isValidProfileImage(value.profileImage)
    );
};

const isOptionalBooleanPreference = (value: unknown) => (
    value === undefined || value === null || typeof value === 'boolean'
);

export const normalizeSettingsSnapshot = (value: unknown): SettingsSnapshot => {
    if (!isObject(value)) return EMPTY_SETTINGS;
    const preferences = isObject(value.preferences) ? value.preferences : {};
    return {
        schemaVersion: 1,
        profile: normalizeProfile(value.profile),
        preferences: {
            showUnreleased: normalizeOptionalBoolean(preferences.showUnreleased),
            showAccuracy: normalizeOptionalBoolean(preferences.showAccuracy),
            showLimited: normalizeOptionalBoolean(preferences.showLimited),
            dimCleared: normalizeOptionalBoolean(preferences.dimCleared),
            tierSource: preferences.tierSource === 'jp' || preferences.tierSource === 'gallery'
                ? preferences.tierSource
                : null,
            theme: preferences.theme === 'dark' || preferences.theme === 'light'
                ? preferences.theme
                : null,
        },
    };
};

export const isSettingsSnapshot = (value: unknown): value is SettingsSnapshot => {
    if (!isObject(value) || value.schemaVersion !== 1 || !isObject(value.preferences)) return false;
    const preferences = value.preferences;
    return (
        isValidProfileSnapshot(value.profile)
        && isOptionalBooleanPreference(preferences.showUnreleased)
        && isOptionalBooleanPreference(preferences.showAccuracy)
        && isOptionalBooleanPreference(preferences.showLimited)
        && isOptionalBooleanPreference(preferences.dimCleared)
        && (
            preferences.tierSource === undefined
            || preferences.tierSource === null
            || preferences.tierSource === 'jp'
            || preferences.tierSource === 'gallery'
        )
        && (
            preferences.theme === undefined
            || preferences.theme === null
            || preferences.theme === 'dark'
            || preferences.theme === 'light'
        )
    );
};

const profilesMatch = (left: ForceProfile, right: ForceProfile) => (
    JSON.stringify(left) === JSON.stringify(right)
);

export const isSettingsSnapshotEmpty = (value: SettingsSnapshot) => {
    const normalized = normalizeSettingsSnapshot(value);
    const profileIsEmpty = !normalized.profile
        || profilesMatch(normalized.profile, DEFAULT_FORCE_PROFILE);
    return profileIsEmpty
        && Object.values(normalized.preferences).every(preference => preference === null);
};

export const mergeSettingsSnapshots = (
    local: SettingsSnapshot,
    remote: SettingsSnapshot,
): SettingsSnapshot => {
    const localValue = normalizeSettingsSnapshot(local);
    const remoteValue = normalizeSettingsSnapshot(remote);
    const localHasProfile = Boolean(
        localValue.profile && !profilesMatch(localValue.profile, DEFAULT_FORCE_PROFILE),
    );
    return normalizeSettingsSnapshot({
        schemaVersion: 1,
        profile: localHasProfile ? localValue.profile : remoteValue.profile,
        preferences: {
            showUnreleased: localValue.preferences.showUnreleased
                ?? remoteValue.preferences.showUnreleased,
            showAccuracy: localValue.preferences.showAccuracy
                ?? remoteValue.preferences.showAccuracy,
            showLimited: localValue.preferences.showLimited
                ?? remoteValue.preferences.showLimited,
            dimCleared: localValue.preferences.dimCleared
                ?? remoteValue.preferences.dimCleared,
            tierSource: localValue.preferences.tierSource
                ?? remoteValue.preferences.tierSource,
            theme: localValue.preferences.theme
                ?? remoteValue.preferences.theme,
        },
    });
};

const readOptionalBoolean = (key: string): boolean | null => {
    if (typeof window === 'undefined') return null;
    const value = window.localStorage.getItem(key);
    if (value === null) return null;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return null;
};

const writeOptionalValue = (key: string, value: string | null) => {
    if (typeof window === 'undefined') return;
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
};

export const resultsAccountStorage = {
    keys: [RESULT_STORAGE_KEY, LAST_MODIFIED_STORAGE_KEY],
    dirtyKey: RESULT_DIRTY_KEY,
    read: (): ResultsSnapshot => {
        const rawResults = parseStoredJson(RESULT_STORAGE_KEY);
        const results = Array.isArray(rawResults) ? rawResults : [];
        return encodeUserResults(
            results.filter(isObject).map(value => value as unknown as UserMusicResult),
            typeof window !== 'undefined'
                ? window.localStorage.getItem(LAST_MODIFIED_STORAGE_KEY)
                : null,
        );
    },
    write: (snapshot: ResultsSnapshot) => {
        if (typeof window === 'undefined') return;
        const normalized = normalizeResultsSnapshot(snapshot);
        window.localStorage.setItem(
            RESULT_STORAGE_KEY,
            JSON.stringify(decodeUserResults(normalized)),
        );
        writeOptionalValue(LAST_MODIFIED_STORAGE_KEY, normalized.lastModified);
    },
};

export const accuracyAccountStorage = {
    keys: [ACCURACY_STORAGE_KEY],
    dirtyKey: ACCURACY_DIRTY_KEY,
    read: (): AccuracySnapshot => {
        const stored = parseStoredJson(ACCURACY_STORAGE_KEY);
        const records = isObject(stored)
            ? Object.entries(stored).map(([key, input]) => {
                if (!isObject(input)) return null;
                return normalizeAccuracyTuple([
                    key,
                    input.perfect,
                    input.great,
                    input.good,
                    input.bad,
                    input.miss,
                ]);
            }).filter((record): record is AccuracyTuple => record !== null)
            : [];
        return normalizeAccuracySnapshot({ schemaVersion: 1, records });
    },
    write: (snapshot: AccuracySnapshot) => {
        if (typeof window === 'undefined') return;
        const data: Record<string, AccuracyInput> = {};
        normalizeAccuracySnapshot(snapshot).records.forEach((record) => {
            data[record[0]] = {
                perfect: record[1],
                great: record[2],
                good: record[3],
                bad: record[4],
                miss: record[5],
            };
        });
        window.localStorage.setItem(ACCURACY_STORAGE_KEY, JSON.stringify(data));
    },
};

export const settingsAccountStorage = {
    keys: [
        PROFILE_STORAGE_KEY,
        'sekai_show_unreleased',
        'sekai_show_accuracy',
        'sekai_show_limited',
        'dimCleared',
        'tierSource',
        'sekai_force_theme',
    ],
    dirtyKey: SETTINGS_DIRTY_KEY,
    read: (): SettingsSnapshot => normalizeSettingsSnapshot({
        schemaVersion: 1,
        profile: parseStoredJson(PROFILE_STORAGE_KEY),
        preferences: {
            showUnreleased: readOptionalBoolean('sekai_show_unreleased'),
            showAccuracy: readOptionalBoolean('sekai_show_accuracy'),
            showLimited: readOptionalBoolean('sekai_show_limited'),
            dimCleared: readOptionalBoolean('dimCleared'),
            tierSource: typeof window !== 'undefined'
                ? window.localStorage.getItem('tierSource')
                : null,
            theme: typeof window !== 'undefined'
                ? window.localStorage.getItem('sekai_force_theme')
                : null,
        },
    }),
    write: (snapshot: SettingsSnapshot) => {
        if (typeof window === 'undefined') return;
        const normalized = normalizeSettingsSnapshot(snapshot);
        if (!normalized.profile) {
            window.localStorage.removeItem(PROFILE_STORAGE_KEY);
        } else {
            const existing = parseStoredJson(PROFILE_STORAGE_KEY);
            const nextProfile: Record<string, unknown> = { ...normalized.profile };
            if (
                !Object.hasOwn(nextProfile, 'profileImage')
                && isObject(existing)
                && typeof existing.profileImage === 'string'
                && existing.profileImage.startsWith('data:')
            ) {
                nextProfile.profileImage = existing.profileImage;
            }
            window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
        }
        writeOptionalValue(
            'sekai_show_unreleased',
            normalized.preferences.showUnreleased === null
                ? null
                : String(normalized.preferences.showUnreleased),
        );
        writeOptionalValue(
            'sekai_show_accuracy',
            normalized.preferences.showAccuracy === null
                ? null
                : String(normalized.preferences.showAccuracy),
        );
        writeOptionalValue(
            'sekai_show_limited',
            normalized.preferences.showLimited === null
                ? null
                : JSON.stringify(normalized.preferences.showLimited),
        );
        writeOptionalValue(
            'dimCleared',
            normalized.preferences.dimCleared === null
                ? null
                : JSON.stringify(normalized.preferences.dimCleared),
        );
        writeOptionalValue('tierSource', normalized.preferences.tierSource);
        writeOptionalValue('sekai_force_theme', normalized.preferences.theme);
    },
};

export const initializeLegacyAccountDirtyFlags = () => {
    if (
        typeof window === 'undefined'
        || window.localStorage.getItem(LEGACY_MIGRATION_KEY) === '1'
    ) return;

    if (resultsAccountStorage.read().records.length > 0) {
        window.localStorage.setItem(RESULT_DIRTY_KEY, '1');
    }
    if (accuracyAccountStorage.read().records.length > 0) {
        window.localStorage.setItem(ACCURACY_DIRTY_KEY, '1');
    }
    if (!isSettingsSnapshotEmpty(settingsAccountStorage.read())) {
        window.localStorage.setItem(SETTINGS_DIRTY_KEY, '1');
    }
    window.localStorage.setItem(LEGACY_MIGRATION_KEY, '1');
};
