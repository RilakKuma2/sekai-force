import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Song } from '../utils/api';
import './Stats.css';

interface SongStats {
    song_name: string;
    Level: number;
    Judgment: string;
    Elements: string;
    Memo: string;
    PY_BR: number;
    song_no: number;
}

interface StatsProps {
    songs: Song[];
}

const Stats: React.FC<StatsProps> = ({ songs }) => {
    const navigate = useNavigate();
    const [groupedData, setGroupedData] = useState<Record<number, Record<number, SongStats[]>>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedSong, setSelectedSong] = useState<SongStats | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                console.log("Fetching CSV...");
                let response = await fetch('/append_diff.csv');
                if (!response.ok) {
                    response = await fetch('/sekai-force/append_diff.csv');
                }

                if (!response.ok) {
                    throw new Error(`Failed to fetch CSV data: ${response.status} ${response.statusText}`);
                }

                const text = await response.text();
                if (text.trim().startsWith('<')) {
                    setError('데이터 파일 경로 오류 (HTML 응답)');
                    setLoading(false);
                    return;
                }

                parseCSV(text);
            } catch (err) {
                console.error("Fetch error:", err);
                setError(`데이터를 불러오는 중 오류가 발생했습니다: ${err}`);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const parseCSV = (text: string) => {
        const lines = text.split('\n');
        const parsedData: SongStats[] = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values: string[] = [];
            let currentVal = '';
            let inQuotes = false;

            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(currentVal);
                    currentVal = '';
                } else {
                    currentVal += char;
                }
            }
            values.push(currentVal);

            if (values.length < 7) continue;

            const levelStr = values[1].replace('Lv', '').trim();
            const song: SongStats = {
                song_name: values[0],
                Level: parseInt(levelStr) || 0,
                Judgment: values[2],
                Elements: values[3],
                Memo: values[4],
                PY_BR: parseFloat(values[5]) || 0,
                song_no: parseInt(values[6]) || 0
            };

            if (song.song_no > 0) {
                parsedData.push(song);
            }
        }

        const newGroupedData: Record<number, Record<number, SongStats[]>> = {};
        const judgmentMap: Record<string, number> = {
            '최상위': 2,
            '상위': 1,
            '적정': 0,
            '-': 0,
            '하위': -1,
            '최하위': -2
        };

        parsedData.forEach(song => {
            if (!newGroupedData[song.Level]) {
                newGroupedData[song.Level] = {};
            }

            let judgmentKey = 0;
            if (song.Judgment && song.Judgment.trim() in judgmentMap) {
                judgmentKey = judgmentMap[song.Judgment.trim()];
            }

            if (!newGroupedData[song.Level][judgmentKey]) {
                newGroupedData[song.Level][judgmentKey] = [];
            }
            newGroupedData[song.Level][judgmentKey].push(song);
        });

        setGroupedData(newGroupedData);
        setLoading(false);
    };

    const sortedLevels = Object.keys(groupedData)
        .map(Number)
        .sort((a, b) => b - a);

    const getCategory = (pyBr: number) => {
        if (pyBr <= -5) return 'physical';
        if (pyBr >= 5) return 'brain';
        return 'general';
    };

    const getKoreanTitle = (songNo: number) => {
        const song = songs.find(s => parseInt(s.id) === songNo);
        return song ? (song.title_ko || song.title_jp) : '';
    };

    const handleSongClick = (song: SongStats) => {
        setSelectedSong(song);
    };

    const closeModal = () => {
        setSelectedSong(null);
    };

    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="stats-container">
            <div className="stats-header">
                <button onClick={() => navigate('/')} className="back-button">&lt; 뒤로가기</button>
                <h1>APPEND 서열표</h1>
            </div>

            <div className="tier-list-scroll-container">
                <div className="tier-grid">
                    {/* Header Row */}
                    <div className="grid-header level-tier-header">Lv</div>
                    <div className="grid-header category-header physical">
                        <span>피지컬</span>
                    </div>
                    <div className="grid-header category-header general">
                        <span>종합</span>
                    </div>
                    <div className="grid-header category-header brain">
                        <span>뇌지컬</span>
                    </div>

                    {/* Data Rows */}
                    {sortedLevels.map((level, levelIndex) => {
                        const judgments = groupedData[level];
                        const sortedJudgments = Object.keys(judgments)
                            .map(Number)
                            .sort((a, b) => b - a); // +2 to -2

                        return sortedJudgments.map((judgment, idx) => {
                            const songs = judgments[judgment];
                            const physical = songs.filter(s => getCategory(s.PY_BR) === 'physical').sort((a, b) => a.PY_BR - b.PY_BR);
                            const general = songs.filter(s => getCategory(s.PY_BR) === 'general').sort((a, b) => a.PY_BR - b.PY_BR);
                            const brain = songs.filter(s => getCategory(s.PY_BR) === 'brain').sort((a, b) => a.PY_BR - b.PY_BR);

                            // If judgment is 0, show Level. Otherwise show signed judgment.
                            const label = judgment === 0 ? String(level) : (judgment > 0 ? `+${judgment}` : `${judgment}`);
                            const isLevelLabel = judgment === 0;

                            // Determine if this is the last row of the current level group
                            const isLastRowOfLevel = idx === sortedJudgments.length - 1;

                            return (
                                <React.Fragment key={`${level}-${judgment}`}>
                                    <div className={`grid-cell level-tier-cell ${isLastRowOfLevel ? 'level-border-bottom' : ''}`}>
                                        <span className={`judgment-badge ${isLevelLabel ? 'level-label' : (judgment > 0 ? 'judgment-plus' : 'judgment-minus')}`}>
                                            {label}
                                        </span>
                                    </div>
                                    <div className={`grid-cell content-cell physical ${isLastRowOfLevel ? 'level-border-bottom' : ''}`}>
                                        <div className="song-grid center-align">
                                            {physical.map(song => (
                                                <div
                                                    key={song.song_no}
                                                    className="song-card"
                                                    title={`${song.song_name} (PY_BR: ${song.PY_BR})`}
                                                    onClick={() => handleSongClick(song)}
                                                >
                                                    <img
                                                        src={`https://asset.rilaksekai.com/cover/${String(song.song_no).padStart(3, '0')}.jpg`}
                                                        alt={song.song_name}
                                                        loading="lazy"
                                                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/60'; }}
                                                    />
                                                    {song.Judgment === '-' && <div className="negative-indicator">?</div>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className={`grid-cell content-cell general ${isLastRowOfLevel ? 'level-border-bottom' : ''}`}>
                                        <div className="song-grid center-align">
                                            {general.map(song => (
                                                <div
                                                    key={song.song_no}
                                                    className="song-card"
                                                    title={`${song.song_name} (PY_BR: ${song.PY_BR})`}
                                                    onClick={() => handleSongClick(song)}
                                                >
                                                    <img
                                                        src={`https://asset.rilaksekai.com/cover/${String(song.song_no).padStart(3, '0')}.jpg`}
                                                        alt={song.song_name}
                                                        loading="lazy"
                                                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/60'; }}
                                                    />
                                                    {song.Judgment === '-' && <div className="negative-indicator">?</div>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className={`grid-cell content-cell brain ${isLastRowOfLevel ? 'level-border-bottom' : ''}`}>
                                        <div className="song-grid center-align">
                                            {brain.map(song => (
                                                <div
                                                    key={song.song_no}
                                                    className="song-card"
                                                    title={`${song.song_name} (PY_BR: ${song.PY_BR})`}
                                                    onClick={() => handleSongClick(song)}
                                                >
                                                    <img
                                                        src={`https://asset.rilaksekai.com/cover/${String(song.song_no).padStart(3, '0')}.jpg`}
                                                        alt={song.song_name}
                                                        loading="lazy"
                                                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/60'; }}
                                                    />
                                                    {song.Judgment === '-' && <div className="negative-indicator">?</div>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        });
                    })}
                </div>
            </div>

            {selectedSong && (
                <div className="popover-overlay" onClick={closeModal}>
                    <div className="popover-content" onClick={e => e.stopPropagation()}>
                        <div className="popover-header">
                            <img
                                src={`https://asset.rilaksekai.com/cover/${String(selectedSong.song_no).padStart(3, '0')}.jpg`}
                                alt={selectedSong.song_name}
                                className="popover-cover"
                            />
                            <div className="popover-title-section">
                                <h2>{getKoreanTitle(selectedSong.song_no) || selectedSong.song_name}</h2>
                                <div className="popover-subtitle">
                                    <span className="popover-level">Lv.{selectedSong.Level}</span>
                                    <span className={`popover-category ${getCategory(selectedSong.PY_BR)}`}>
                                        {getCategory(selectedSong.PY_BR) === 'physical' ? '피지컬' :
                                            getCategory(selectedSong.PY_BR) === 'brain' ? '뇌지컬' : '종합'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="popover-body">
                            {selectedSong.Elements && selectedSong.Elements !== '-' && (
                                <div className="popover-section">
                                    <div className="elements-container">
                                        {selectedSong.Elements.split('_').map((el, idx) => (
                                            <span key={idx} className="element-tag">{el.trim()}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {selectedSong.Memo && (
                                <div className="popover-section">
                                    <p className="memo-text">{selectedSong.Memo}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Stats;
