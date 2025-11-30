import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Song } from '../utils/api';
import './Stats.css';

interface ApiSongStats {
    id: string;
    title_ko: string;
    title_jp: string;
    unit_code: string;
    release_date: string;
    bpm: number | string;
    levels: {
        easy: number;
        normal: number;
        hard: number;
        expert: number;
        master: number;
        append: number;
    };
    length: string;
    Judgment_mas?: string;
    Elements_mas?: string;
    Memo_mas?: string;
    PhBr_mas?: string;
    Judgment_ex?: string;
    Elements_ex?: string;
    Memo_ex?: string;
    PhBr_ex?: string;
    Judgment_apd?: string;
    Elements_apd?: string;
    Memo_apd?: string;
    PhBr_apd?: string;
}

interface SongStats {
    song_name: string;
    Level: number;
    Judgment: string;
    Elements: string;
    Memo: string;
    PY_BR: number;
    song_no: number;
    bpm: number | string;
    song_time: string;
    isExpert?: boolean;
}

type Difficulty = 'master' | 'expert' | 'append';

interface StatsProps {
    songs: Song[];
}

const Stats: React.FC<StatsProps> = ({ songs }) => {
    const navigate = useNavigate();
    const [apiData, setApiData] = useState<ApiSongStats[]>([]);
    const [groupedData, setGroupedData] = useState<Record<number, Record<number, SongStats[]>>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedSong, setSelectedSong] = useState<SongStats | null>(null);
    const [difficulty, setDifficulty] = useState<Difficulty>('master');

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
            processData(apiData, difficulty);
        }
    }, [apiData, difficulty, songs]);

    const processData = (data: ApiSongStats[], diff: Difficulty) => {
        const parsedData: SongStats[] = [];

        data.forEach(item => {
            // Find corresponding song in songs prop
            const songFromApi = songs.find(s => s.id === item.id);

            const processSong = (d: Difficulty, isExpertOverride: boolean = false) => {
                let level = 0;
                let judgment = '';
                let elements = '';
                let memo = '';
                let phBrStr = '0';

                if (d === 'master') {
                    level = item.levels.master;
                    judgment = item.Judgment_mas || '-';
                    elements = item.Elements_mas || '';
                    memo = item.Memo_mas || '';
                    if (songFromApi?.PhBr_mas !== undefined && songFromApi.PhBr_mas !== null && String(songFromApi.PhBr_mas).trim() !== '') {
                        phBrStr = String(songFromApi.PhBr_mas);
                    } else {
                        phBrStr = item.PhBr_mas || '0';
                    }
                } else if (d === 'expert') {
                    level = item.levels.expert;
                    judgment = item.Judgment_ex || '-';
                    elements = item.Elements_ex || '';
                    memo = item.Memo_ex || '';
                    if (songFromApi?.PhBr_ex !== undefined && songFromApi.PhBr_ex !== null && String(songFromApi.PhBr_ex).trim() !== '') {
                        phBrStr = String(songFromApi.PhBr_ex);
                    } else {
                        phBrStr = item.PhBr_ex || '0';
                    }
                } else if (d === 'append') {
                    level = item.levels.append;
                    judgment = item.Judgment_apd || '-';
                    elements = item.Elements_apd || '';
                    memo = item.Memo_apd || '';
                    phBrStr = item.PhBr_apd || '0';
                }

                if (!level) return;

                const song: SongStats = {
                    song_name: item.title_ko || item.title_jp,
                    Level: level,
                    Judgment: judgment,
                    Elements: elements,
                    Memo: memo,
                    PY_BR: parseFloat(phBrStr) || 0,
                    song_no: parseInt(item.id) || 0,
                    bpm: item.bpm,
                    song_time: item.length,
                    isExpert: isExpertOverride
                };
                parsedData.push(song);
            };

            if (diff === 'master') {
                // Add Master song
                processSong('master');
                // Add Expert song if level >= 27
                if (item.levels.expert >= 27) {
                    processSong('expert', true);
                }
            } else if (diff === 'expert') {
                // Only add Expert song if level <= 26
                if (item.levels.expert <= 26) {
                    processSong('expert');
                }
            } else {
                processSong(diff);
            }
        });

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
                    <div className="difficulty-toggles">
                        <button
                            className={`diff-btn master ${difficulty === 'master' ? 'active' : ''}`}
                            onClick={() => setDifficulty('master')}
                        >
                            MAS
                        </button>
                        <button
                            className={`diff-btn expert ${difficulty === 'expert' ? 'active' : ''}`}
                            onClick={() => setDifficulty('expert')}
                        >
                            EXP
                        </button>
                        <button
                            className={`diff-btn append ${difficulty === 'append' ? 'active' : ''}`}
                            onClick={() => setDifficulty('append')}
                        >
                            APD
                        </button>
                    </div>
                    <div className="info-box">
                        <p>⚠️ 뇌지컬/피지컬 분류는 정확하지 않을 수 있습니다.</p>
                        <p>⚠️ 같은 세부 난이도 내의 곡들은 위치(좌우)에 상관없이 동등한 난이도입니다.</p>
                        <p>ℹ️ 곡 이미지를 클릭하면 상세 설명을 확인할 수 있습니다.</p>
                        <p>
                            <span className="negative-indicator-inline">?</span>
                            <span>표시된 악곡은 아직 세부 난이도가 정해지지 않은 악곡입니다.</span>
                        </p>
                    </div>
                    <div className="external-links">
                        <a href={getJpTierListUrl()} target="_blank" rel="noopener noreferrer" className="link-btn jp-tier">
                            🇯🇵 원본 서열표
                        </a>
                        {getGalleryTierListUrl() && (
                            <a href={getGalleryTierListUrl()!} target="_blank" rel="noopener noreferrer" className="link-btn gallery-tier">
                                🇰🇷 갤 서열표
                            </a>
                        )}
                    </div>
                </div>
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
                    {sortedLevels.map((level) => {
                        const judgments = groupedData[level];
                        const sortedJudgments = Object.keys(judgments)
                            .map(Number)
                            .sort((a, b) => b - a); // +2 to -2

                        return sortedJudgments.map((judgment, idx) => {
                            const songs = judgments[judgment];
                            const physical = songs.filter(s => getCategory(s.PY_BR) === 'physical').sort((a, b) => a.PY_BR - b.PY_BR);
                            const general = songs.filter(s => getCategory(s.PY_BR) === 'general').sort((a, b) => a.PY_BR - b.PY_BR);
                            const brain = songs.filter(s => getCategory(s.PY_BR) === 'brain').sort((a, b) => a.PY_BR - b.PY_BR);

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
                                                        {song.Judgment === '-' && song.Level < 35 && <div className="negative-indicator">?</div>}
                                                        {song.isExpert && <div className="expert-indicator">EX</div>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className={`grid-cell content-cell general ${isLevelBorder ? 'level-border-bottom' : ''} ${isJudgmentBorder ? 'judgment-border-bottom' : ''}`}>
                                            <div className="song-grid center-align">
                                                {gSlice.map(song => (
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
                                                        {song.Judgment === '-' && song.Level < 35 && <div className="negative-indicator">?</div>}
                                                        {song.isExpert && <div className="expert-indicator">EX</div>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className={`grid-cell content-cell brain ${isLevelBorder ? 'level-border-bottom' : ''} ${isJudgmentBorder ? 'judgment-border-bottom' : ''}`}>
                                            <div className="song-grid center-align">
                                                {bSlice.map(song => (
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
                                                        {song.Judgment === '-' && song.Level < 35 && <div className="negative-indicator">?</div>}
                                                        {song.isExpert && <div className="expert-indicator">EX</div>}
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

            {selectedSong && (
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
                                src={`https://asset.rilaksekai.com/cover/${String(selectedSong.song_no).padStart(3, '0')}.jpg`}
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
                                    </div>
                                    <div className="popover-row">
                                        <span className="popover-info">
                                            {/^\d+$/.test(String(selectedSong.bpm)) ? `${selectedSong.bpm} BPM` : selectedSong.bpm}
                                        </span>
                                        <span className="popover-info">{selectedSong.song_time}</span>
                                        {(() => {
                                            const song = songs.find(s => parseInt(s.id) === selectedSong.song_no);
                                            let constant = 0;
                                            if (song) {
                                                if (selectedSong.isExpert) {
                                                    constant = song.ex_fc ? song.ex_fc - 0.4 : 0;
                                                } else if (difficulty === 'master') {
                                                    constant = song.mas_fc ? song.mas_fc - 0.4 : 0;
                                                } else if (difficulty === 'append') {
                                                    constant = song.apd_fc ? song.apd_fc - 0.4 : 0;
                                                }
                                            }
                                            return constant > 0 ? <span className="popover-info">상수 {constant.toFixed(1)}</span> : null;
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
            )
            }
        </div >
    );
};

export default Stats;
