import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Song } from '../utils/api';
import { type Difficulty, type UserMusicResult } from '../utils/calculator';
import './Stats.css';

interface ApiSongStats {
    id: string;
    ex_el?: string;
    ex_mm?: string;
    ex_ph?: string;
    ex_kst?: string;
    ex_jst?: string;
    mas_el?: string;
    mas_mm?: string;
    mas_ap_mm?: string;
    mas_ph?: string;
    mas_kst?: string;
    mas_jst?: string;
    apd_el?: string;
    apd_mm?: string;
    apd_ap_mm?: string;
    apd_ph?: string;
    apd_kst?: string;
    apd_jst?: string;
}

interface StatsProps {
    songs: Song[];
    userResults: UserMusicResult[];
    onUpdateResults: (newResults: UserMusicResult[]) => void;
}

interface SongStats {
    song_no: number;
    song_name: string;
    Level: number;
    Judgment: string;
    Elements: string;
    Memo: string;
    PY_BR: number;
    bpm: number | string;
    song_time: string;
    isExpert?: boolean;
    ApMemo?: string;
    modifier?: '+' | '-' | '±' | null;
}

const Stats: React.FC<StatsProps> = ({ songs, userResults, onUpdateResults }) => {
    const navigate = useNavigate();
    const [apiData, setApiData] = useState<ApiSongStats[]>([]);
    const [groupedData, setGroupedData] = useState<Record<number, Record<number, SongStats[]>>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedSong, setSelectedSong] = useState<SongStats | null>(null);
    const [dimCleared, setDimCleared] = useState(() => {
        const saved = localStorage.getItem('dimCleared');
        return saved !== null ? JSON.parse(saved) : false;
    });
    const [difficulty, setDifficulty] = useState<Difficulty>('master');
    const [apMode, setApMode] = useState(false);
    const [tierSource, setTierSource] = useState<'jp' | 'gallery'>(() => {
        const saved = localStorage.getItem('tierSource');
        return (saved === 'jp' || saved === 'gallery') ? saved : 'jp';
    });
    const [showSourceInfo, setShowSourceInfo] = useState(false);

    const handleTierSourceChange = (checked: boolean) => {
        const newSource = checked ? 'gallery' : 'jp';
        setTierSource(newSource);
        localStorage.setItem('tierSource', newSource);
    };

    const handleDimToggle = (checked: boolean) => {
        setDimCleared(checked);
        localStorage.setItem('dimCleared', JSON.stringify(checked));
    };



    useEffect(() => {
        const fetchData = async () => {
            try {
                console.log("Fetching API data...");
                const response = await fetch('https://api.rilaksekai.com/api/songs_stats');

                if (!response.ok) {
                    throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
                }

                const data: ApiSongStats[] = await response.json();
                setApiData(data);
                setLoading(false);
            } catch (err) {
                console.error("Fetch error:", err);
                setError(`데이터를 불러오는 중 오류가 발생했습니다: ${err}`);
                setLoading(false);
            }
        };

        fetchData();
    }, []);


    useEffect(() => {
        if (apiData.length > 0) {
            processData(apiData, difficulty, apMode, tierSource);
        }
    }, [apiData, difficulty, apMode, tierSource, songs]);

    const handleStatusUpdate = (resultType: 'clear' | 'full_combo' | 'full_perfect' | null) => {
        if (!selectedSong) return;

        const songId = String(selectedSong.song_no).padStart(3, '0');
        const targetDifficulty = selectedSong.isExpert ? 'expert' : difficulty;

        // Find existing result index
        const existingIndex = userResults.findIndex(r => r.musicId === songId && r.musicDifficulty === targetDifficulty);

        let newResults = [...userResults];

        if (resultType === null) {
            // Remove result
            if (existingIndex !== -1) {
                newResults.splice(existingIndex, 1);
            }
        } else {
            const now = Date.now();
            const newResult: UserMusicResult = {
                musicId: songId,
                musicDifficulty: targetDifficulty,
                playResult: resultType,
                score: 0, // Default score
                createdAt: existingIndex !== -1 ? userResults[existingIndex].createdAt : now,
                updatedAt: now
            };

            if (existingIndex !== -1) {
                newResults[existingIndex] = newResult;
            } else {
                newResults.push(newResult);
            }
        }

        onUpdateResults(newResults);
    };

    const processData = (data: ApiSongStats[], diff: Difficulty, isApMode: boolean, source: 'jp' | 'gallery') => {
        const parsedData: SongStats[] = [];

        data.forEach(item => {
            // Find corresponding song in songs prop
            const songFromApi = songs.find(s => s.id === item.id);

            // Defensive check for levels
            const levels = songFromApi?.levels;
            if (!levels || !songFromApi) {
                console.warn(`No levels or song info found for song ${item.id}`);
                return;
            }

            const processSong = (d: Difficulty, isExpertOverride: boolean = false) => {
                let level = 0;
                let judgment = '';
                let elements = '';
                let memo = '';
                let apMemo = '';
                let phBrStr = '0';
                let apConstant: number | undefined;
                let modifier: '+' | '-' | '±' | null = null;

                const parseGalleryTier = (kstStr: string | undefined): { tier: string, mod: '+' | '-' | '±' | null } => {
                    if (!kstStr) return { tier: '-', mod: null };

                    // Format 1: "33 0(-)" or "33 0" or "33 0(+)" or "33 0(±)" -> Tier is 0, Mod is -/+/±
                    // Format 2: "29 +1" or "29 -1" -> Tier is +1/-1, Mod is null (or implied by tier value)
                    // Format 3: "29 +1 (+)" -> Tier is +1, Mod is +

                    // Regex 1: Level (space) Tier(Modifier)
                    // e.g. "33 0(-)" -> match[1]=33, match[2]=0, match[3]=-
                    // e.g. "29 +1 (+)" -> match[1]=29, match[2]=+1, match[3]=+
                    const match1 = kstStr.match(/(\d+)\s+([+-]?\d+)(?:\s*\(([+-±])\))?/);
                    if (match1) {
                        return { tier: match1[2], mod: (match1[3] as '+' | '-' | '±') || null };
                    }

                    return { tier: '-', mod: null };
                };

                if (d === 'master') {
                    level = levels.master || 0;
                    if (source === 'jp') {
                        let rawJudgment = item.mas_jst || item.mas_kst || '-';
                        judgment = rawJudgment.split(' ')[0];
                    } else {
                        const { tier, mod } = parseGalleryTier(item.mas_kst);
                        judgment = tier;
                        modifier = mod;
                    }
                    elements = item.mas_el || '';
                    memo = item.mas_mm || '';
                    apMemo = isApMode ? (item.mas_ap_mm || '') : '';
                    phBrStr = item.mas_ph || '0';
                    if (songFromApi?.mas_ap) apConstant = Number(songFromApi.mas_ap);
                } else if (d === 'expert') {
                    level = levels.expert || 0;
                    // Force JP source for Expert
                    let rawJudgment = item.ex_jst || item.ex_kst || '-';
                    judgment = rawJudgment.split(' ')[0];

                    elements = item.ex_el || '';
                    memo = item.ex_mm || '';
                    phBrStr = item.ex_ph || '0';
                    if (songFromApi?.ex_ap) apConstant = Number(songFromApi.ex_ap);
                } else if (d === 'append') {
                    level = levels.append || 0;
                    // Force JP source for Append
                    let rawJudgment = item.apd_jst || item.apd_kst || '-';
                    judgment = rawJudgment.split(' ')[0];

                    elements = item.apd_el || '';
                    memo = item.apd_mm || '';
                    apMemo = isApMode ? (item.apd_ap_mm || '') : '';
                    phBrStr = item.apd_ph || '0';
                    if (songFromApi?.apd_ap) apConstant = Number(songFromApi.apd_ap);
                }

                if (!level) return;

                // AP Mode Logic (Overrides source logic if active and constant exists)
                if (isApMode && apConstant !== undefined && !isNaN(apConstant)) {
                    // level = Math.floor(apConstant); // Don't overwrite level with AP constant floor

                    // Calculate difference between AP constant and Level
                    // Round to 1 decimal place to avoid floating point errors
                    const diff = Math.round((apConstant - level) * 10) / 10;

                    if (level >= 34) {
                        // Level >= 34 Rules
                        // -0.4 ~ -0.3: Bottom
                        // -0.2 ~ -0.1: Lower
                        // 0 ~ 0.1: Mid
                        // 0.2 ~ 0.3: Upper
                        // 0.4 ~ 0.5: Top
                        if (diff <= -0.3) judgment = '최하위';
                        else if (diff <= -0.1) judgment = '하위';
                        else if (diff <= 0.1) judgment = '적정';
                        else if (diff <= 0.3) judgment = '상위';
                        else judgment = '최상위'; // >= 0.4
                    } else {
                        // Level < 34 Rules
                        // -0.6 ~ -0.5: Bottom
                        // -0.4 ~ -0.2: Lower
                        // -0.1 ~ 0.1: Mid
                        // 0.2 ~ 0.3: Upper
                        // 0.4 ~ 0.7: Top
                        if (diff <= -0.5) judgment = '최하위';
                        else if (diff <= -0.2) judgment = '하위';
                        else if (diff <= 0.1) judgment = '적정';
                        else if (diff <= 0.3) judgment = '상위';
                        else judgment = '최상위'; // >= 0.4
                    }

                    // Reset modifier in AP mode as it uses calculated tiers
                    modifier = null;
                } else if (isApMode) {
                    judgment = '-';
                    modifier = null;
                }

                const song: SongStats = {
                    song_name: songFromApi.title_ko || songFromApi.title_jp,
                    Level: level,
                    Judgment: judgment,
                    Elements: elements,
                    Memo: memo,
                    PY_BR: parseFloat(phBrStr) || 0,
                    song_no: parseInt(item.id) || 0,
                    bpm: songFromApi.bpm,
                    song_time: songFromApi.length,
                    isExpert: isExpertOverride,
                    ApMemo: apMemo,
                    modifier: modifier
                };
                parsedData.push(song);
            };

            if (diff === 'master') {
                processSong('master');
                if ((levels.expert || 0) >= 27 && !isApMode) { // Exclude Expert from AP Mode for now as requested (only MAS/APD buttons)
                    processSong('expert', true);
                }
            } else if (diff === 'expert') {
                if ((levels.expert || 0) <= 26) {
                    processSong('expert');
                }
            } else {
                processSong(diff);
            }
        });

        const newGroupedData: Record<number, Record<number, SongStats[]>> = {};
        const judgmentMap: Record<string, number> = {
            '최상위': 2,
            '最上位': 2,
            '最上位＋': 3,
            '상위': 1,
            '上位': 1,
            '적정': 0,
            '中位': 0,
            '適正': 0,
            '-': 0,
            '하위': -1,
            '下位': -1,
            '최하위': -2,
            '最下位': -2,
            '2': 2, '1': 1, '0': 0, '-1': -1, '-2': -2, // Numeric strings
            '+2': 2, '+1': 1, // Signed numeric strings
            '3': 3, '+3': 3, '-3': -3,
            '4': 4, '+4': 4, '-4': -4
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
    };

    const sortedLevels = Object.keys(groupedData)
        .map(Number)
        .sort((a, b) => b - a);

    const getCategory = (pyBr: number) => {
        if (pyBr <= -5) return 'physical';
        if (pyBr >= 5) return 'brain';
        return 'general';
    };

    const [zoomScale, setZoomScale] = useState(1);

    useEffect(() => {
        const handleResize = () => {
            if (window.visualViewport) {
                setZoomScale(window.visualViewport.scale);
            }
        };

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleResize);
            // Initial set
            setZoomScale(window.visualViewport.scale);
        }

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleResize);
            }
        };
    }, []);

    const handleSongClick = (song: SongStats) => {
        setSelectedSong(song);
        // Zoom scale is now handled by useEffect
    };

    const closeModal = () => {
        setSelectedSong(null);
        // We don't reset zoomScale here so it stays consistent if opened again immediately
    };



    const getJpTierListUrl = () => {
        switch (difficulty) {
            case 'master': return 'https://pjsekai.com/?aa95a0f97c';
            case 'expert': return 'https://pjsekai.com/?d58e7e100c';
            case 'append': return 'https://pjsekai.com/?163b58c097';
            default: return '#';
        }
    };

    const getGalleryTierListUrl = () => {
        switch (difficulty) {
            case 'master': return 'https://gall.dcinside.com/mgallery/board/view/?id=pjsekai&no=2282122';
            case 'append': return 'https://gall.dcinside.com/mgallery/board/view/?id=pjsekai&no=2197158';
            default: return null;
        }
    };

    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="stats-container">
            <div className="stats-header">
                <button onClick={() => navigate(-1)} className="back-button">&lt; 뒤로가기</button>
                <div className="header-controls">
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <div className="difficulty-toggles">
                            <div className="diff-col">
                                <button
                                    className={`diff-btn master ${difficulty === 'master' && !apMode ? 'active' : ''}`}
                                    onClick={() => { setDifficulty('master'); setApMode(false); }}
                                >
                                    MAS
                                </button>
                                <button
                                    className={`diff-btn master-ap ${difficulty === 'master' && apMode ? 'active' : ''}`}
                                    onClick={() => { setDifficulty('master'); setApMode(true); }}
                                >
                                    AP
                                </button>
                            </div>
                            <div className="diff-col">
                                <button
                                    className={`diff-btn expert ${difficulty === 'expert' ? 'active' : ''}`}
                                    onClick={() => { setDifficulty('expert'); setApMode(false); }}
                                >
                                    EXP
                                </button>
                                <div className="diff-placeholder"></div>
                            </div>
                            <div className="diff-col">
                                <button
                                    className={`diff-btn append ${difficulty === 'append' && !apMode ? 'active' : ''}`}
                                    onClick={() => { setDifficulty('append'); setApMode(false); }}
                                >
                                    APD
                                </button>
                                <button
                                    className={`diff-btn append-ap ${difficulty === 'append' && apMode ? 'active' : ''}`}
                                    onClick={() => { setDifficulty('append'); setApMode(true); }}
                                >
                                    AP
                                </button>
                            </div>
                        </div>
                        {difficulty === 'master' && !apMode && (
                            <div className="source-toggle-container">
                                <div className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        id="source-toggle"
                                        checked={tierSource === 'gallery'}
                                        onChange={(e) => handleTierSourceChange(e.target.checked)}
                                    />
                                    <label htmlFor="source-toggle" className="toggle-label">
                                        <span className="toggle-option jp">🇯🇵 위키서열</span>
                                        <span className="toggle-option gallery">🇰🇷 갤서열</span>
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="info-box">
                        <p>⚠️ 뇌지컬/피지컬 분류는 정확하지 않을 수 있습니다.</p>
                        <p>⚠️ 같은 세부 난이도 내의 곡들은 위치(상하)에 상관없이 동등한 난이도입니다.</p>
                        <p>ℹ️ 곡 이미지를 클릭하면 상세 설명을 확인할 수 있습니다.</p>
                        <p>
                            <span className="negative-indicator-inline">?</span>
                            <span>표시된 악곡은 아직 세부 난이도가 정해지지 않은 악곡입니다.</span>
                        </p>
                    </div>
                    <div className="external-links-container">
                        <div className="external-links">
                            <a href={getJpTierListUrl()} target="_blank" rel="noopener noreferrer" className="link-btn jp-tier">
                                🇯🇵 위키 서열표
                            </a>
                            {getGalleryTierListUrl() && (
                                <a href={getGalleryTierListUrl()!} target="_blank" rel="noopener noreferrer" className="link-btn gallery-tier">
                                    🇰🇷 갤 서열표
                                </a>
                            )}
                            <div
                                className="source-info-container"
                                onMouseEnter={() => setShowSourceInfo(true)}
                                onMouseLeave={() => setShowSourceInfo(false)}
                            >
                                <button className="link-btn source-info-btn">
                                    ℹ️ 상수 출처
                                </button>
                                {showSourceInfo && (
                                    <div className="source-tooltip">
                                        <a href="https://docs.google.com/spreadsheets/d/1KUZukWiCN5SV_DpUxGMSnj5qM8heqVQ4v2eW8TvRnR4/edit?usp=sharing" target="_blank" rel="noopener noreferrer">AP 상수</a>
                                        <a href="https://docs.google.com/spreadsheets/d/16riiKd5B5SZDaiePjo9AQNEP1RI2kUzj_7MipbyCneY/edit?usp=sharing" target="_blank" rel="noopener noreferrer">FC 상수</a>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="dim-toggle-container">
                            <label className="dim-toggle-label">
                                <input
                                    type="checkbox"
                                    checked={dimCleared}
                                    onChange={(e) => handleDimToggle(e.target.checked)}
                                />
                                {apMode ? 'AP된 곡 어둡게 표시' : '풀콤된 곡 어둡게 표시'}
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <div className="tier-list-scroll-container">
                <div className="tier-grid">
                    {/* Header Row */}
                    {/* Header Row */}
                    <div className="grid-header level-tier-header">
                        {apMode ? <span className="ap-header-badge">AP</span> : 'Lv'}
                    </div>
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
                    {sortedLevels.map((level) => {
                        const judgments = groupedData[level];
                        const sortedJudgments = Object.keys(judgments)
                            .map(Number);

                        // Always include 0 (Average/Level) tier even if empty
                        if (!sortedJudgments.includes(0)) {
                            sortedJudgments.push(0);
                        }

                        sortedJudgments.sort((a, b) => b - a); // +2 to -2

                        return sortedJudgments.map((judgment, idx) => {
                            const songs = judgments[judgment] || [];
                            const physical = songs.filter(s => getCategory(s.PY_BR) === 'physical').sort((a, b) => {
                                if (a.modifier !== b.modifier) {
                                    const modVal = (m: string | null | undefined) => m === '+' ? 1 : (m === '-' ? -1 : 0);
                                    return modVal(b.modifier) - modVal(a.modifier);
                                }
                                return a.PY_BR - b.PY_BR;
                            });
                            const general = songs.filter(s => getCategory(s.PY_BR) === 'general').sort((a, b) => {
                                if (a.modifier !== b.modifier) {
                                    const modVal = (m: string | null | undefined) => m === '+' ? 1 : (m === '-' ? -1 : 0);
                                    return modVal(b.modifier) - modVal(a.modifier);
                                }
                                return a.PY_BR - b.PY_BR;
                            });
                            const brain = songs.filter(s => getCategory(s.PY_BR) === 'brain').sort((a, b) => {
                                if (a.modifier !== b.modifier) {
                                    const modVal = (m: string | null | undefined) => m === '+' ? 1 : (m === '-' ? -1 : 0);
                                    return modVal(b.modifier) - modVal(a.modifier);
                                }
                                return a.PY_BR - b.PY_BR;
                            });

                            // Calculate number of rows needed
                            const totalSongs = physical.length + general.length + brain.length;
                            const rowCount = totalSongs > 15 ? Math.ceil(totalSongs / 15) : 1;

                            // Calculate chunk sizes for even distribution
                            const pChunk = Math.ceil(physical.length / rowCount);
                            const gChunk = Math.ceil(general.length / rowCount);
                            const bChunk = Math.ceil(brain.length / rowCount);

                            // If judgment is 0, show Level. Otherwise show signed judgment.
                            const label = judgment === 0 ? String(level) : (judgment > 0 ? `+${judgment}` : `${judgment}`);
                            const isLevelLabel = judgment === 0;

                            // Determine if this is the last row of the current level group
                            const isLastJudgment = idx === sortedJudgments.length - 1;

                            return Array.from({ length: rowCount }).map((_, r) => {
                                const isLastSubRow = r === rowCount - 1;
                                const isLevelBorder = isLastJudgment && isLastSubRow;
                                const isJudgmentBorder = isLastSubRow && !isLastJudgment;

                                const pSlice = physical.slice(r * pChunk, (r + 1) * pChunk);
                                const gSlice = general.slice(r * gChunk, (r + 1) * gChunk);
                                const bSlice = brain.slice(r * bChunk, (r + 1) * bChunk);

                                return (
                                    <React.Fragment key={`${level}-${judgment}-${r}`}>
                                        {r === 0 && (
                                            <div
                                                className={`grid-cell level-tier-cell ${isLevelBorder ? 'level-border-bottom' : ''} ${isJudgmentBorder ? 'judgment-border-bottom' : ''}`}
                                                style={{ gridRow: `span ${rowCount}` }}
                                            >
                                                <span className={`judgment-badge ${isLevelLabel ? 'level-label' : (judgment > 0 ? 'judgment-plus' : 'judgment-minus')}`}>
                                                    {label}
                                                </span>
                                            </div>
                                        )}
                                        <div className={`grid-cell content-cell physical ${isLevelBorder ? 'level-border-bottom' : ''} ${isJudgmentBorder ? 'judgment-border-bottom' : ''}`}>
                                            <div className="song-grid center-align">
                                                {pSlice.map(song => (
                                                    <div
                                                        key={song.song_no}
                                                        className={`song-card ${(() => {
                                                            if (!dimCleared) return '';
                                                            const targetDifficulty = song.isExpert ? 'expert' : difficulty;
                                                            const result = userResults.find(r => r.musicId === String(song.song_no).padStart(3, '0') && r.musicDifficulty === targetDifficulty);
                                                            if (!result) return '';

                                                            if (apMode) {
                                                                if (result.playResult === 'full_perfect') return 'dimmed dimmed-ap';
                                                                return '';
                                                            } else {
                                                                if (result.playResult === 'full_perfect') return 'dimmed dimmed-ap';
                                                                if (result.playResult === 'full_combo') return 'dimmed';
                                                                return '';
                                                            }
                                                        })()}`}
                                                        title={`${song.song_name}`}
                                                        onClick={() => handleSongClick(song)}
                                                    >
                                                        <img
                                                            src={`https://asset.rilaksekai.com/cover/${String(song.song_no).padStart(3, '0')}.webp`}
                                                            alt={song.song_name}
                                                            loading="lazy"
                                                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/60'; }}
                                                        />
                                                        {song.Judgment === '-' && song.Level < 35 && <div className="negative-indicator">?</div>}
                                                        {song.isExpert && <div className="expert-indicator">EX</div>}
                                                        {(song.modifier === '+' || song.modifier === '±') && (
                                                            <>
                                                                <div className="modifier-bg up"></div>
                                                                <div className="modifier-arrow up"></div>
                                                            </>
                                                        )}
                                                        {(song.modifier === '-' || song.modifier === '±') && (
                                                            <>
                                                                <div className="modifier-bg down"></div>
                                                                <div className="modifier-arrow down"></div>
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className={`grid-cell content-cell general ${isLevelBorder ? 'level-border-bottom' : ''} ${isJudgmentBorder ? 'judgment-border-bottom' : ''}`}>
                                            <div className="song-grid center-align">
                                                {gSlice.map(song => (
                                                    <div
                                                        key={song.song_no}
                                                        className={`song-card ${(() => {
                                                            if (!dimCleared) return '';
                                                            const targetDifficulty = song.isExpert ? 'expert' : difficulty;
                                                            const result = userResults.find(r => r.musicId === String(song.song_no).padStart(3, '0') && r.musicDifficulty === targetDifficulty);
                                                            if (!result) return '';
                                                            if (apMode) {
                                                                if (result.playResult === 'full_perfect') return 'dimmed dimmed-ap';
                                                                return '';
                                                            } else {
                                                                if (result.playResult === 'full_perfect') return 'dimmed dimmed-ap';
                                                                if (result.playResult === 'full_combo') return 'dimmed';
                                                                return '';
                                                            }
                                                        })()}`}
                                                        title={`${song.song_name}`}
                                                        onClick={() => handleSongClick(song)}
                                                    >
                                                        <img
                                                            src={`https://asset.rilaksekai.com/cover/${String(song.song_no).padStart(3, '0')}.webp`}
                                                            alt={song.song_name}
                                                            loading="lazy"
                                                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/60'; }}
                                                        />
                                                        {song.Judgment === '-' && song.Level < 35 && <div className="negative-indicator">?</div>}
                                                        {song.isExpert && <div className="expert-indicator">EX</div>}
                                                        {(song.modifier === '+' || song.modifier === '±') && (
                                                            <>
                                                                <div className="modifier-bg up"></div>
                                                                <div className="modifier-arrow up"></div>
                                                            </>
                                                        )}
                                                        {(song.modifier === '-' || song.modifier === '±') && (
                                                            <>
                                                                <div className="modifier-bg down"></div>
                                                                <div className="modifier-arrow down"></div>
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className={`grid-cell content-cell brain ${isLevelBorder ? 'level-border-bottom' : ''} ${isJudgmentBorder ? 'judgment-border-bottom' : ''}`}>
                                            <div className="song-grid center-align">
                                                {bSlice.map(song => (
                                                    <div
                                                        key={song.song_no}
                                                        className={`song-card ${(() => {
                                                            if (!dimCleared) return '';
                                                            const targetDifficulty = song.isExpert ? 'expert' : difficulty;
                                                            const result = userResults.find(r => r.musicId === String(song.song_no).padStart(3, '0') && r.musicDifficulty === targetDifficulty);
                                                            if (!result) return '';
                                                            if (apMode) {
                                                                if (result.playResult === 'full_perfect') return 'dimmed dimmed-ap';
                                                                return '';
                                                            } else {
                                                                if (result.playResult === 'full_perfect') return 'dimmed dimmed-ap';
                                                                if (result.playResult === 'full_combo') return 'dimmed';
                                                                return '';
                                                            }
                                                        })()}`}
                                                        title={`${song.song_name} (PY_BR: ${song.PY_BR})`}
                                                        onClick={() => handleSongClick(song)}
                                                    >
                                                        <img
                                                            src={`https://asset.rilaksekai.com/cover/${String(song.song_no).padStart(3, '0')}.webp`}
                                                            alt={song.song_name}
                                                            loading="lazy"
                                                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/60'; }}
                                                        />
                                                        {song.Judgment === '-' && song.Level < 35 && <div className="negative-indicator">?</div>}
                                                        {song.isExpert && <div className="expert-indicator">EX</div>}
                                                        {(song.modifier === '+' || song.modifier === '±') && (
                                                            <>
                                                                <div className="modifier-bg up"></div>
                                                                <div className="modifier-arrow up"></div>
                                                            </>
                                                        )}
                                                        {(song.modifier === '-' || song.modifier === '±') && (
                                                            <>
                                                                <div className="modifier-bg down"></div>
                                                                <div className="modifier-arrow down"></div>
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            });
                        });
                    })}
                </div>
            </div>

            {
                selectedSong && (
                    <div className="popover-overlay" onClick={closeModal}>
                        <div
                            className="popover-content"
                            onClick={e => e.stopPropagation()}
                            style={{
                                transform: window.innerWidth > 768 ? 'none' : `scale(${0.9 / zoomScale})`,
                                transformOrigin: 'bottom center',
                                width: '100%',
                                maxWidth: window.innerWidth > 768 ? '600px' : `${600 * zoomScale}px`,
                                marginBottom: '0'
                            }}
                        >
                            <div className="popover-header">
                                <img
                                    src={`https://asset.rilaksekai.com/cover/${String(selectedSong.song_no).padStart(3, '0')}.webp`}
                                    alt={selectedSong.song_name}
                                    className="popover-cover"
                                />
                                <div className="popover-title-section">
                                    <h2>{selectedSong.song_name}</h2>
                                    <div className="popover-subtitle-rows">
                                        <div className="popover-row">
                                            <span className="popover-level">Lv.{selectedSong.Level}</span>
                                            <span className={`popover-category ${getCategory(selectedSong.PY_BR)}`}>
                                                {getCategory(selectedSong.PY_BR) === 'physical' ? '피지컬' :
                                                    getCategory(selectedSong.PY_BR) === 'brain' ? '뇌지컬' : '종합'}
                                            </span>
                                            {(() => {
                                                const song = songs.find(s => parseInt(s.id) === selectedSong.song_no);
                                                let fcConstant: number | undefined;

                                                if (song) {
                                                    if (selectedSong.isExpert) {
                                                        fcConstant = song.ex_fc ? Number(song.ex_fc) : undefined;
                                                    } else if (difficulty === 'master') {
                                                        fcConstant = song.mas_fc ? Number(song.mas_fc) : undefined;
                                                    } else if (difficulty === 'append') {
                                                        fcConstant = song.apd_fc ? Number(song.apd_fc) : undefined;
                                                    }
                                                }
                                                return fcConstant !== undefined && !isNaN(fcConstant) ? (
                                                    <span className="popover-info">FC {fcConstant.toFixed(1)}</span>
                                                ) : null;
                                            })()}
                                        </div>
                                        <div className="popover-row">
                                            <span className="popover-info">
                                                {/^\d+$/.test(String(selectedSong.bpm)) ? `${selectedSong.bpm} BPM` : selectedSong.bpm}
                                            </span>
                                            <span className="popover-info">{selectedSong.song_time}</span>
                                            {(() => {
                                                const song = songs.find(s => parseInt(s.id) === selectedSong.song_no);
                                                let apConstant: number | undefined;

                                                if (song) {
                                                    if (selectedSong.isExpert) {
                                                        apConstant = song.ex_ap ? Number(song.ex_ap) : undefined;
                                                    } else if (difficulty === 'master') {
                                                        apConstant = song.mas_ap ? Number(song.mas_ap) : undefined;
                                                    } else if (difficulty === 'append') {
                                                        apConstant = song.apd_ap ? Number(song.apd_ap) : undefined;
                                                    }
                                                }
                                                return apConstant !== undefined && !isNaN(apConstant) ? (
                                                    <span className="popover-info">AP {apConstant.toFixed(1)}</span>
                                                ) : null;
                                            })()}
                                        </div>
                                    </div>
                                </div>
                                <a
                                    href={`https://asset.rilaksekai.com/charts/${String(selectedSong.song_no).padStart(3, '0')}/${difficulty}.html`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="popover-chart-btn"
                                >
                                    채보
                                </a>
                            </div>
                            <div className="popover-body">
                                {selectedSong.Elements && selectedSong.Elements !== '-' && (
                                    <div className="popover-section">
                                        <div className="elements-container">
                                            {selectedSong.Elements.split(/[_,]/).map((el, idx) => (
                                                <span key={idx} className="element-tag">{el.trim()}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {selectedSong.ApMemo && (
                                    <div className="popover-section">
                                        <p className="memo-text">{selectedSong.ApMemo}</p>
                                    </div>
                                )}
                                {selectedSong.Memo && (
                                    <div className="popover-section">
                                        <p className="memo-text">{selectedSong.Memo}</p>
                                    </div>
                                )}
                            </div>
                            <div className="popover-section status-control">
                                <div className="status-buttons">
                                    <button
                                        className={`status-btn ${!userResults.find(r => r.musicId === String(selectedSong.song_no).padStart(3, '0') && r.musicDifficulty === (selectedSong.isExpert ? 'expert' : difficulty)) ? 'active' : ''}`}
                                        onClick={() => handleStatusUpdate(null)}
                                    >
                                        -
                                    </button>
                                    <button
                                        className={`status-btn clear ${userResults.find(r => r.musicId === String(selectedSong.song_no).padStart(3, '0') && r.musicDifficulty === (selectedSong.isExpert ? 'expert' : difficulty))?.playResult === 'clear' ? 'active' : ''}`}
                                        onClick={() => handleStatusUpdate('clear')}
                                    >
                                        C
                                    </button>
                                    <button
                                        className={`status-btn fc ${userResults.find(r => r.musicId === String(selectedSong.song_no).padStart(3, '0') && r.musicDifficulty === (selectedSong.isExpert ? 'expert' : difficulty))?.playResult === 'full_combo' ? 'active' : ''}`}
                                        onClick={() => handleStatusUpdate('full_combo')}
                                    >
                                        FC
                                    </button>
                                    <button
                                        className={`status-btn ap ${userResults.find(r => r.musicId === String(selectedSong.song_no).padStart(3, '0') && r.musicDifficulty === (selectedSong.isExpert ? 'expert' : difficulty))?.playResult === 'full_perfect' ? 'active' : ''}`}
                                        onClick={() => handleStatusUpdate('full_perfect')}
                                    >
                                        AP
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Stats;
