import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { fetchSongs, type Song } from './utils/api';
import { processUserBest, calculateTotalR, calculateAppendR, type MusicDifficultyStatus, type UserMusicResult } from './utils/calculator';
import Dashboard from './pages/Dashboard';
import ScoreInput from './pages/ScoreInput';
import Stats from './pages/Stats';
import AccountDock from './components/AccountDock';
import { AUTH_BASE_URL, STORAGE_BASE_URL } from './config/env';
import {
  AccountStateConflictDialog,
  LoginProvider,
  useAccountState,
  useAuth,
} from './login';
import {
  accuracyAccountStorage,
  decodeUserResults,
  encodeUserResults,
  initializeLegacyAccountDirtyFlags,
  isAccuracySnapshot,
  isResultsSnapshot,
  isSettingsSnapshot,
  isSettingsSnapshotEmpty,
  mergeAccuracySnapshots,
  mergeResultsSnapshots,
  mergeSettingsSnapshots,
  normalizeAccuracySnapshot,
  normalizeResultsSnapshot,
  normalizeSettingsSnapshot,
  resultsAccountStorage,
  settingsAccountStorage,
} from './utils/accountSync';
import './App.css';

initializeLegacyAccountDirtyFlags();

function AppContent() {
  const { user } = useAuth();
  const [storageMountVersion, setStorageMountVersion] = useState(0);
  const handleExternalStateApplied = useCallback(() => {
    setStorageMountVersion(version => version + 1);
  }, []);

  const resultsSync = useAccountState({
    namespace: 'sekai-force-results-v1',
    storage: resultsAccountStorage,
    normalize: normalizeResultsSnapshot,
    validate: isResultsSnapshot,
    isEmpty: () => false,
    hasLocalOnly: (local, remote, dirty) => (
      dirty && local.records.length > 0 && JSON.stringify(local) !== JSON.stringify(remote)
    ),
    isConflict: (local, remote, dirty) => (
      dirty && local.records.length > 0 && JSON.stringify(local) !== JSON.stringify(remote)
    ),
    merge: mergeResultsSnapshots,
    enabled: Boolean(user),
    saveDelayMs: 1_200,
    refreshOnFocus: true,
    refreshMinIntervalMs: 15_000,
    flushOnHide: true,
    logLabel: '셐포스 성과 기록',
  });

  const accuracySync = useAccountState({
    namespace: 'sekai-force-accuracy-v1',
    storage: accuracyAccountStorage,
    normalize: normalizeAccuracySnapshot,
    validate: isAccuracySnapshot,
    isEmpty: () => false,
    hasLocalOnly: (local, remote, dirty) => (
      dirty && local.records.length > 0 && JSON.stringify(local) !== JSON.stringify(remote)
    ),
    isConflict: (local, remote, dirty) => (
      dirty && local.records.length > 0 && JSON.stringify(local) !== JSON.stringify(remote)
    ),
    merge: mergeAccuracySnapshots,
    enabled: Boolean(user),
    saveDelayMs: 1_500,
    localPollMs: 750,
    refreshOnFocus: true,
    refreshMinIntervalMs: 15_000,
    flushOnHide: true,
    onExternalStateApplied: handleExternalStateApplied,
    logLabel: '셐포스 정확도 기록',
  });

  const settingsSync = useAccountState({
    namespace: 'sekai-force-settings-v1',
    storage: settingsAccountStorage,
    normalize: normalizeSettingsSnapshot,
    validate: isSettingsSnapshot,
    isEmpty: () => false,
    hasLocalOnly: (local, remote, dirty) => (
      dirty && !isSettingsSnapshotEmpty(local) && JSON.stringify(local) !== JSON.stringify(remote)
    ),
    isConflict: (local, remote, dirty) => (
      dirty && !isSettingsSnapshotEmpty(local) && JSON.stringify(local) !== JSON.stringify(remote)
    ),
    merge: mergeSettingsSnapshots,
    enabled: Boolean(user),
    saveDelayMs: 1_500,
    localPollMs: 750,
    refreshOnFocus: true,
    refreshMinIntervalMs: 15_000,
    flushOnHide: true,
    onExternalStateApplied: handleExternalStateApplied,
    logLabel: '셐포스 프로필 및 설정',
  });

  const [allSongs, setAllSongs] = useState<Song[]>([]); // Store raw songs
  const [songs, setSongs] = useState<Song[]>([]); // Store filtered songs
  const [best39, setBest39] = useState<MusicDifficultyStatus[]>([]);
  const [bestAppend, setBestAppend] = useState<MusicDifficultyStatus[]>([]);
  const [totalR, setTotalR] = useState<number>(0);
  const [appendTotalR, setAppendTotalR] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const userResults = useMemo(
    () => decodeUserResults(resultsSync.value),
    [resultsSync.value],
  );
  const lastModified = resultsSync.value.lastModified;

  const showUnreleased = settingsSync.value.preferences.showUnreleased ?? false;

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const songsData = await fetchSongs();
        setAllSongs(songsData);
      } catch (err) {
        console.error("Failed to load data", err);
        setError("Failed to load data. Please check the console or API connection.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter songs whenever allSongs or showUnreleased changes
  useEffect(() => {
    if (showUnreleased) {
      setSongs(allSongs);
    } else {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      const filteredSongs = allSongs.filter(song => {
        if (!song.release_date) return true;
        // Normalize separators to hyphens for consistent comparison
        const songDate = song.release_date.replace(/\//g, '-');
        return songDate <= todayStr;
      });
      setSongs(filteredSongs);
    }
  }, [allSongs, showUnreleased]);

  const handleToggleUnreleased = (value: boolean) => {
    const latest = settingsAccountStorage.read();
    settingsSync.setValue(normalizeSettingsSnapshot({
      ...latest,
      preferences: {
        ...latest.preferences,
        showUnreleased: value,
      },
    }));
  };

  // Recalculate Best39 whenever userResults or songs change
  useEffect(() => {
    if (songs.length > 0) {
      const { best39: calculatedBest39, bestAppend: calculatedBestAppend } = processUserBest(songs, userResults);
      setBest39(calculatedBest39);
      setBestAppend(calculatedBestAppend);
      setTotalR(calculateTotalR(calculatedBest39));
      setAppendTotalR(calculateAppendR(calculatedBestAppend));
    }
  }, [songs, userResults]);

  const handleUpdateResults = (newResults: UserMusicResult[]) => {
    const now = new Date().toISOString();
    resultsSync.setValue(encodeUserResults(newResults, now));
  };

  const syncStatuses = [
    resultsSync.status,
    accuracySync.status,
    settingsSync.status,
  ];
  const conflicts = [
    resultsSync.conflict,
    accuracySync.conflict,
    settingsSync.conflict,
  ];
  const hasConflict = conflicts.some(Boolean);
  const localSummary = [
    resultsSync.conflict ? `성과 ${resultsSync.conflict.local.records.length}개` : null,
    accuracySync.conflict ? `정확도 ${accuracySync.conflict.local.records.length}개` : null,
    settingsSync.conflict ? '프로필·설정' : null,
  ].filter(Boolean).join(' · ');
  const remoteSummary = [
    resultsSync.conflict ? `성과 ${resultsSync.conflict.remote.records.length}개` : null,
    accuracySync.conflict ? `정확도 ${accuracySync.conflict.remote.records.length}개` : null,
    settingsSync.conflict ? '프로필·설정' : null,
  ].filter(Boolean).join(' · ');
  const syncBusy = syncStatuses.includes('saving');
  const migrationSyncState = !user
    ? { label: '먼저 로그인 필요', className: 'login-required' }
    : syncStatuses.includes('error')
      ? { label: '동기화 오류 확인 필요', className: 'error' }
      : syncStatuses.includes('conflict')
        ? { label: '데이터 선택 필요', className: 'warning' }
        : syncStatuses.includes('saving') || syncStatuses.includes('loading')
          ? { label: '계정 데이터 동기화 중', className: 'working' }
          : syncStatuses.every(status => status === 'ready')
            ? { label: '계정 데이터 동기화 완료', className: 'ready' }
            : { label: '로컬 데이터 확인 중', className: 'local' };

  return (
    <Router basename={import.meta.env.BASE_URL}>
      <aside className="force-migration-banner" aria-label="셐포스 이전 안내">
        <div className="force-migration-copy">
          <strong>셐포스와 셐정리가 통합되었습니다.</strong>
          <span>로그인 해서 성과를 동기화하세요.</span>
        </div>
        <div className="force-migration-actions">
          <span className={`force-migration-status ${migrationSyncState.className}`}>
            {migrationSyncState.label}
          </span>
          <a
            href="https://rilakbest.com/song/sekai_force"
            target="_blank"
            rel="noopener noreferrer"
          >
            새 사이트 열기
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </aside>
      <AccountDock syncStatuses={syncStatuses} />
      <Routes key={storageMountVersion}>
        <Route path="/" element={
          <Dashboard
            songs={songs}
            best39={best39}
            bestAppend={bestAppend}
            userResults={userResults}
            totalR={totalR}
            appendTotalR={appendTotalR}
            loading={loading}
            error={error}
            lastModified={lastModified}
            showUnreleased={showUnreleased}
            onToggleUnreleased={handleToggleUnreleased}
          />
        } />
        <Route path="/input" element={
          <ScoreInput
            songs={songs}
            userResults={userResults}
            onUpdateResults={handleUpdateResults}
          />
        } />
        <Route path="/stats" element={
          <Stats
            songs={songs}
            userResults={userResults}
            onUpdateResults={handleUpdateResults}
          />
        } />
      </Routes>
      <AccountStateConflictDialog
        open={hasConflict}
        title="셐포스 저장 데이터"
        localSummary={localSummary || '저장 데이터 없음'}
        remoteSummary={remoteSummary || '저장 데이터 없음'}
        busy={syncBusy}
        mergeHint="성과는 최신 수정 기록을, 정확도는 더 높은 기록을 우선해 합칩니다."
        onChoose={async (choice) => {
          if (resultsSync.conflict) await resultsSync.resolveConflict(choice);
          if (accuracySync.conflict) await accuracySync.resolveConflict(choice);
          if (settingsSync.conflict) await settingsSync.resolveConflict(choice);
        }}
      />
    </Router>
  );
}

function App() {
  return (
    <LoginProvider
      authBaseUrl={AUTH_BASE_URL}
      storageBaseUrl={STORAGE_BASE_URL}
      cacheKey="sekai-force-auth-cache-v1"
      locale="ko"
      showInviteCode
    >
      <AppContent />
    </LoginProvider>
  );
}

export default App;
