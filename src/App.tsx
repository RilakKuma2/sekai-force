import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { fetchSongs, type Song } from './utils/api';
import { processUserBest, calculateTotalR, calculateAppendR, type MusicDifficultyStatus, type UserMusicResult } from './utils/calculator';
import Dashboard from './pages/Dashboard';
import ScoreInput from './pages/ScoreInput';
import Stats from './pages/Stats';
import './App.css';

function App() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [userResults, setUserResults] = useState<UserMusicResult[]>([]);
  const [best39, setBest39] = useState<MusicDifficultyStatus[]>([]);
  const [bestAppend, setBestAppend] = useState<MusicDifficultyStatus[]>([]);
  const [totalR, setTotalR] = useState<number>(0);
  const [appendTotalR, setAppendTotalR] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const songsData = await fetchSongs();
        setSongs(songsData);

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

      } catch (err) {
        console.error("Failed to load data", err);
        setError("Failed to load data. Please check the console or API connection.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

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
  };

  return (
    <Router>
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
