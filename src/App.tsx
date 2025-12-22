import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { fetchSongs, type Song } from './utils/api';
import { processUserBest, calculateTotalR, calculateAppendR, type MusicDifficultyStatus, type UserMusicResult } from './utils/calculator';
import Dashboard from './pages/Dashboard';
import ScoreInput from './pages/ScoreInput';
import Stats from './pages/Stats';
import './App.css';

function App() {
  const [allSongs, setAllSongs] = useState<Song[]>([]); // Store raw songs
  const [songs, setSongs] = useState<Song[]>([]); // Store filtered songs
  const [userResults, setUserResults] = useState<UserMusicResult[]>([]);
  const [best39, setBest39] = useState<MusicDifficultyStatus[]>([]);
  const [bestAppend, setBestAppend] = useState<MusicDifficultyStatus[]>([]);
  const [totalR, setTotalR] = useState<number>(0);
  const [appendTotalR, setAppendTotalR] = useState<number>(0);
  const [lastModified, setLastModified] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // New state for showing unreleased songs
  const [showUnreleased, setShowUnreleased] = useState<boolean>(() => {
    return localStorage.getItem('sekai_show_unreleased') === 'true';
  });

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const songsData = await fetchSongs();
        setAllSongs(songsData);

        // Load from localStorage
        const savedResults = localStorage.getItem('sekai_user_results');
        if (savedResults) {
          try {
            const parsed = JSON.parse(savedResults);
            if (Array.isArray(parsed)) {
              setUserResults(parsed);
            } else {
              console.error("Saved results is not an array, resetting.");
              setUserResults([]);
            }
          } catch (e) {
            console.error("Failed to parse saved results", e);
            setUserResults([]);
          }
        } else {
          setUserResults([]);
        }

        const savedLastModified = localStorage.getItem('sekai_last_modified');
        if (savedLastModified) {
          setLastModified(savedLastModified);
        }

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
    setShowUnreleased(value);
    localStorage.setItem('sekai_show_unreleased', String(value));
  };

  // Recalculate Best39 whenever userResults or songs change
  useEffect(() => {
    if (songs.length > 0) {
      const { best39: calculatedBest39, bestAppend: calculatedBestAppend } = processUserBest(songs, userResults);
      setBest39(calculatedBest39);
      setBestAppend(calculatedBestAppend);
      setTotalR(calculateTotalR(calculatedBest39));
      setAppendTotalR(calculateAppendR(calculatedBestAppend));

      // Save to localStorage
      localStorage.setItem('sekai_user_results', JSON.stringify(userResults));
    }
  }, [songs, userResults]);

  const handleUpdateResults = (newResults: UserMusicResult[]) => {
    setUserResults(newResults);
    const now = new Date().toISOString();
    setLastModified(now);
    localStorage.setItem('sekai_last_modified', now);
  };

  return (
    <Router basename={import.meta.env.BASE_URL}>
      <Routes>
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
    </Router>
  );
}

export default App;
