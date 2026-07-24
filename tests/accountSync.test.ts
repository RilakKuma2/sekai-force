import assert from 'node:assert/strict';
import test from 'node:test';
import {
    ACCURACY_DIRTY_KEY,
    RESULT_DIRTY_KEY,
    SETTINGS_DIRTY_KEY,
    encodeUserResults,
    initializeLegacyAccountDirtyFlags,
    isSettingsSnapshot,
    mergeAccuracySnapshots,
    mergeResultsSnapshots,
    mergeSettingsSnapshots,
    normalizeSettingsSnapshot,
} from '../src/utils/accountSync.ts';

class MemoryStorage {
    private values = new Map<string, string>();

    get length() {
        return this.values.size;
    }

    clear() {
        this.values.clear();
    }

    getItem(key: string) {
        return this.values.get(key) ?? null;
    }

    key(index: number) {
        return [...this.values.keys()][index] ?? null;
    }

    removeItem(key: string) {
        this.values.delete(key);
    }

    setItem(key: string, value: string) {
        this.values.set(key, String(value));
    }
}

test('성과 병합은 같은 곡·난이도에서 더 최근 수정 기록을 유지한다', () => {
    const merged = mergeResultsSnapshots(
        {
            schemaVersion: 1,
            records: [
                ['001', 4, 1, 0, 10, 30],
                ['002', 3, 0, 0, 10, 20],
            ],
            lastModified: '2026-07-24T10:00:00.000Z',
        },
        {
            schemaVersion: 1,
            records: [
                ['001', 4, 2, 0, 10, 40],
                ['003', 5, 0, 0, 10, 20],
            ],
            lastModified: '2026-07-24T11:00:00.000Z',
        },
    );

    assert.equal(merged.records.length, 3);
    assert.deepEqual(
        merged.records.find(record => record[0] === '001'),
        ['001', 4, 2, 0, 10, 40],
    );
    assert.equal(merged.lastModified, '2026-07-24T11:00:00.000Z');
});

test('정확도 병합은 같은 항목에서 더 높은 정확도를 유지한다', () => {
    const merged = mergeAccuracySnapshots(
        {
            schemaVersion: 1,
            records: [['001_master', 990, 10, 0, 0, 0]],
        },
        {
            schemaVersion: 1,
            records: [
                ['001_master', 980, 20, 0, 0, 0],
                ['002_expert', 900, 50, 30, 10, 10],
            ],
        },
    );

    assert.deepEqual(
        merged.records.find(record => record[0] === '001_master'),
        ['001_master', 990, 10, 0, 0, 0],
    );
    assert.equal(merged.records.length, 2);
});

test('설정 병합은 로컬에서 실제로 선택한 항목만 원격 설정보다 우선한다', () => {
    const merged = mergeSettingsSnapshots(
        {
            schemaVersion: 1,
            profile: null,
            preferences: {
                showUnreleased: null,
                showAccuracy: true,
                showLimited: null,
                dimCleared: null,
                tierSource: null,
                theme: null,
            },
        },
        {
            schemaVersion: 1,
            profile: null,
            preferences: {
                showUnreleased: true,
                showAccuracy: false,
                showLimited: false,
                dimCleared: true,
                tierSource: 'gallery',
                theme: 'light',
            },
        },
    );

    assert.deepEqual(merged.preferences, {
        showUnreleased: true,
        showAccuracy: true,
        showLimited: false,
        dimCleared: true,
        tierSource: 'gallery',
        theme: 'light',
    });
});

test('정리 사이트가 저장한 테마와 구형 부분 설정을 모두 불러온다', () => {
    const remote = {
        preferences: {
            theme: 'dark',
            tierSource: 'gallery',
            showAccuracy: true,
        },
        profile: {
            playerName: '동기화 사용자',
            language: 'ko',
            playerId: '123456789',
        },
        schemaVersion: 1,
    };

    assert.equal(isSettingsSnapshot(remote), true);
    assert.equal(normalizeSettingsSnapshot(remote).preferences.theme, 'dark');
    assert.equal(isSettingsSnapshot({
        schemaVersion: 1,
        profile: null,
        preferences: { theme: 'sepia' },
    }), false);
});

test('기존 브라우저 기록은 첫 로그인 전에 dirty로 표시해 원격 덮어쓰기를 막는다', () => {
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const localStorage = new MemoryStorage();
    Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: { localStorage },
    });

    try {
        localStorage.setItem('sekai_user_results', JSON.stringify([{
            musicId: '001',
            musicDifficulty: 'master',
            playResult: 'full_combo',
            score: 0,
            createdAt: 10,
            updatedAt: 20,
        }]));
        localStorage.setItem('sekai_accuracy_data', JSON.stringify({
            '001_master': { perfect: 990, great: 10, good: 0, bad: 0, miss: 0 },
        }));
        localStorage.setItem('tierSource', 'gallery');

        initializeLegacyAccountDirtyFlags();

        assert.equal(localStorage.getItem(RESULT_DIRTY_KEY), '1');
        assert.equal(localStorage.getItem(ACCURACY_DIRTY_KEY), '1');
        assert.equal(localStorage.getItem(SETTINGS_DIRTY_KEY), '1');
    } finally {
        if (originalWindow) {
            Object.defineProperty(globalThis, 'window', originalWindow);
        } else {
            Reflect.deleteProperty(globalThis, 'window');
        }
    }
});

test('전곡·전난이도 성과도 Worker의 namespace별 저장 한도 안에 들어간다', () => {
    const difficulties = ['easy', 'normal', 'hard', 'expert', 'master', 'append'] as const;
    const results = Array.from({ length: 700 }, (_, songIndex) => (
        difficulties.map((musicDifficulty, difficultyIndex) => ({
            musicId: String(songIndex + 1).padStart(3, '0'),
            musicDifficulty,
            playResult: difficultyIndex % 2 === 0
                ? 'full_perfect' as const
                : 'full_combo' as const,
            score: 1000,
            createdAt: 1_753_350_000_000,
            updatedAt: 1_753_350_000_000,
        }))
    )).flat();
    const encoded = encodeUserResults(results, '2026-07-24T12:00:00.000Z');

    assert.ok(Buffer.byteLength(JSON.stringify(encoded)) < 262_144);
});
