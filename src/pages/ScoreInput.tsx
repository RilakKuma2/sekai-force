
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getChoseong } from 'es-hangul';
import { type Difficulty, type UserMusicResult, calculateTotalR, calculateAppendR, processUserBest, type MusicDifficultyStatus } from '../utils/calculator';
import { type Song } from '../utils/api';
import './ScoreInput.css';

interface ScoreInputProps {
    songs: Song[];
    userResults: UserMusicResult[];
    onUpdateResults: (results: UserMusicResult[]) => void;
}

// Extracted Components

interface DifficultyFilterProps {
    diff: Difficulty;
    label: string;
    value: string;
    onChange: (val: string) => void;
    activeFilter: Difficulty | null;
    setActiveFilter: (diff: Difficulty | null) => void;
    songs: Song[];
}

const DifficultyFilter = React.memo(({ diff, label, value, onChange, activeFilter, setActiveFilter, songs }: DifficultyFilterProps) => {
    // Generate level options based on available songs
    const options = useMemo(() => {
        const levels = new Set<number>();
        songs.forEach(song => {
            const l = song.levels[diff];
            if (l !== null) levels.add(l);
        });
        return Array.from(levels).sort((a, b) => b - a);
    }, [songs, diff]);

    const handleSelect = (level: string) => {
        // Toggle: if clicking the already selected value, clear it.
        if (value === level) {
            onChange('');
        } else {
            onChange(level);
        }
        setActiveFilter(null);
    };

    return (
        <div className="difficulty-filter-container" style={{ position: 'relative' }}>
            <div
                className={`header-circle ${diff} ${value ? 'has-value' : ''}`}
                onClick={() => setActiveFilter(activeFilter === diff ? null : diff)}
                style={{ cursor: 'pointer', border: value ? '3.5px solid white' : undefined }}
            >
                {value ? value : label}
            </div>

            {activeFilter === diff && (
                <div className="filter-dropdown">
                    {options.map(level => (
                        <div
                            key={level}
                            className={`filter-option ${value === String(level) ? 'selected' : ''}`}
                            onClick={() => handleSelect(String(level))}
                        >
                            {level}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

interface SongRowProps {
    song: Song;
    activeEdit: { songId: string, diff: Difficulty } | null;
    setActiveEdit: (edit: { songId: string, diff: Difficulty } | null) => void;
    updateResult: (musicId: string, difficulty: Difficulty, result: 'clear' | 'full_combo' | 'full_perfect' | null) => void;
    updateResultsBulk: (updates: { musicId: string, difficulty: Difficulty, result: 'clear' | 'full_combo' | 'full_perfect' | null }[]) => void;
    activeFilters: Difficulty[];
    songResults: Record<string, string>; // difficulty -> result
}

const SongRow = React.memo(({ song, activeEdit, setActiveEdit, updateResult, updateResultsBulk, activeFilters, songResults }: SongRowProps) => {
    // Determine unit border class
    const unitClass = `unit-border-${song.unit_code.replace('/', '-')}`;
    const isFilteredMode = activeFilters.length > 0;
    const [showBulkDropdown, setShowBulkDropdown] = useState(false);

    const handleBulkUpdate = (result: 'clear' | 'full_combo' | 'full_perfect' | null) => {
        const difficulties: Difficulty[] = ['easy', 'normal', 'hard', 'expert', 'master', 'append'];
        const updates: { musicId: string, difficulty: Difficulty, result: 'clear' | 'full_combo' | 'full_perfect' | null }[] = [];

        difficulties.forEach(diff => {
            if (song.levels[diff] !== null) {
                updates.push({ musicId: song.id, difficulty: diff, result });
            }
        });

        if (updates.length > 0) {
            updateResultsBulk(updates);
        }
        setShowBulkDropdown(false);
    };

    return (
        <div className={`song-item ${activeEdit?.songId === song.id ? 'active-popover-parent' : ''}`} style={{ zIndex: (activeEdit?.songId === song.id || showBulkDropdown) ? 1001 : 'auto' }}>
            <div className="song-cover-wrapper">
                <img
                    src={`https://asset.rilaksekai.com/cover/${song.id}.webp`}
                    alt={song.title_ko || song.title_jp}
                    loading="lazy"
                    className={`song-cover ${unitClass}`}
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80'; }}
                />
            </div>

            <div className="song-details">
                <div className="song-title-row">
                    <div className="song-titles">
                        <span className="title-ko">{song.title_ko || song.title_jp}</span>
                        <span className="title-jp">{song.title_jp}</span>
                    </div>
                    <div className="song-bulk-control" style={{ position: 'relative' }}>
                        <button
                            className="song-bulk-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowBulkDropdown(!showBulkDropdown);
                            }}
                        >
                            일괄
                        </button>
                        {showBulkDropdown && (
                            <>
                                <div className="fixed-overlay" onClick={() => setShowBulkDropdown(false)} />
                                <div
                                    className="score-popover right-aligned"
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ top: '100%', left: 'auto', right: 0, transform: 'none', marginTop: '5px', zIndex: 1002 }}
                                >
                                    <button onClick={() => handleBulkUpdate(null)}>-</button>
                                    <button className="active-clear" onClick={() => handleBulkUpdate('clear')}>C</button>
                                    <button className="active-fc" onClick={() => handleBulkUpdate('full_combo')}>FC</button>
                                    <button className="active-ap" onClick={() => handleBulkUpdate('full_perfect')}>AP</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="difficulty-circles">
                    {(['easy', 'normal', 'hard', 'expert', 'master', 'append'] as Difficulty[]).map(diff => {
                        const level = song.levels[diff];

                        // In filtered mode, only show active difficulties
                        if (isFilteredMode && !activeFilters.includes(diff)) return null;

                        // Render placeholder if level is null (only in non-filtered mode to maintain alignment)
                        if (level === null) {
                            if (isFilteredMode) return null; // Don't show placeholder in filtered mode
                            // If it's append and null, don't show placeholder at all (as requested)
                            if (diff === 'append') return null;
                            return <div key={diff} className="circle" style={{ visibility: 'hidden', cursor: 'default' }}></div>;
                        }

                        const currentResult = songResults[diff] || null;
                        const isEditing = activeEdit?.songId === song.id && activeEdit?.diff === diff;

                        // Determine classes
                        let circleClass = `circle ${diff}`;

                        if (isFilteredMode) {
                            // In filtered mode, use the specific filtered style (header style)
                            circleClass += ' filtered-style';
                        } else {
                            // Standard mode: Apply result classes
                            if (currentResult === 'clear') circleClass += ' result-clear';
                            else if (currentResult === 'full_combo') circleClass += ' result-full_combo';
                            else if (currentResult === 'full_perfect') circleClass += ' result-full_perfect';
                        }

                        return (
                            <div key={diff} style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                                <div
                                    className={circleClass}
                                    onClick={(e) => {
                                        if (!isFilteredMode) {
                                            e.stopPropagation();
                                            setActiveEdit(isEditing ? null : { songId: song.id, diff });
                                        }
                                    }}
                                    title={`${diff}: ${level}`}
                                    style={{ cursor: isFilteredMode ? 'default' : 'pointer' }}
                                >
                                    {level}
                                </div>

                                {/* Standard Popover (Non-filtered mode) */}
                                {!isFilteredMode && isEditing && (
                                    <div
                                        className={`score-popover ${(diff === 'append' || diff === 'master') ? 'right-aligned' : ''}`}
                                        onClick={(e) => e.stopPropagation()}
                                        style={
                                            (diff === 'append' || diff === 'master')
                                                ? { left: 'auto', right: 0, transform: 'none' }
                                                : {}
                                        }
                                    >
                                        <button className={currentResult === null ? 'active-none' : ''} onClick={() => updateResult(song.id, diff, null)}>-</button>
                                        <button className={currentResult === 'clear' ? 'active-clear' : ''} onClick={() => updateResult(song.id, diff, 'clear')}>C</button>
                                        <button className={currentResult === 'full_combo' ? 'active-fc' : ''} onClick={() => updateResult(song.id, diff, 'full_combo')}>FC</button>
                                        <button className={currentResult === 'full_perfect' ? 'active-ap' : ''} onClick={() => updateResult(song.id, diff, 'full_perfect')}>AP</button>
                                    </div>
                                )}

                                {/* Inline Buttons (Filtered mode) */}
                                {isFilteredMode && (
                                    <div className="inline-score-container">
                                        <div className="inline-score-buttons">
                                            <button className={`inline-score-btn ${currentResult === null ? 'active-none' : ''}`} onClick={() => updateResult(song.id, diff, null)}>-</button>
                                            <button className={`inline-score-btn ${currentResult === 'clear' ? 'active-clear' : ''}`} onClick={() => updateResult(song.id, diff, 'clear')}>C</button>
                                            <button className={`inline-score-btn ${currentResult === 'full_combo' ? 'active-fc' : ''}`} onClick={() => updateResult(song.id, diff, 'full_combo')}>FC</button>
                                            <button className={`inline-score-btn ${currentResult === 'full_perfect' ? 'active-ap' : ''}`} onClick={() => updateResult(song.id, diff, 'full_perfect')}>AP</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div >
    );
});

const ScoreInput: React.FC<ScoreInputProps> = ({ songs, userResults, onUpdateResults }) => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [localResults, setLocalResults] = useState<UserMusicResult[]>([]);
    const [activeEdit, setActiveEdit] = useState<{ songId: string, diff: Difficulty } | null>(null);

    // Preview Modal State
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewResults, setPreviewResults] = useState<UserMusicResult[]>([]);
    const [previewBest39, setPreviewBest39] = useState<MusicDifficultyStatus[]>([]);
    const [previewBestAppend, setPreviewBestAppend] = useState<MusicDifficultyStatus[]>([]);

    const [easyLevel, setEasyLevel] = useState('');
    const [normalLevel, setNormalLevel] = useState('');
    const [hardLevel, setHardLevel] = useState('');
    const [expertLevel, setExpertLevel] = useState('');
    const [masterLevel, setMasterLevel] = useState('');
    const [appendLevel, setAppendLevel] = useState('');

    const [activeFilter, setActiveFilter] = useState<Difficulty | null>(null);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkModalPos, setBulkModalPos] = useState<{ top: number, left?: number, right?: number } | null>(null);

    // Bulk Input State
    const [bulkDiffs, setBulkDiffs] = useState<Set<Difficulty>>(new Set());
    const [bulkMinLevel, setBulkMinLevel] = useState<number>(5);
    const [bulkMaxLevel, setBulkMaxLevel] = useState<number>(38);
    const [bulkResult, setBulkResult] = useState<'clear' | 'full_combo' | 'full_perfect' | null>(null);

    // Share Modal State
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareUrl, setShareUrl] = useState('');

    // Sync local state with global state on mount/update
    useEffect(() => {
        setLocalResults(userResults);
    }, [userResults]);

    const handleUpdateResults = (newResults: UserMusicResult[]) => {
        onUpdateResults(newResults);
    };

    const confirmLoad = () => {
        if (window.confirm("현재 데이터가 덮어씌워집니다. 계속하시겠습니까?")) {
            setLocalResults(previewResults);
            handleUpdateResults(previewResults);
            setShowPreviewModal(false);
            // Clear URL
            const url = new URL(window.location.href);
            url.searchParams.delete('data');
            window.history.replaceState({}, '', url.toString());
        }
    };

    const cancelLoad = () => {
        setShowPreviewModal(false);
        // Clear URL
        const url = new URL(window.location.href);
        url.searchParams.delete('data');
        window.history.replaceState({}, '', url.toString());
    };

    // Load from URL on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const data = params.get('data');
        if (data) {
            try {
                const decoded = decodeScoreMap(data);
                if (decoded.length > 0) {
                    // Calculate Best 39 for preview
                    const { best39, bestAppend } = processUserBest(songs, decoded);
                    setPreviewResults(decoded);
                    setPreviewBest39(best39);
                    setPreviewBestAppend(bestAppend);
                    setShowPreviewModal(true);
                }
            } catch (e) {
                console.error("Failed to decode URL data", e);
            }
        }
    }, [songs]); // Add songs dependency to ensure calculation works

    // Handle click outside to close popover
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (activeEdit) {
                const target = event.target as HTMLElement;
                if (!target.closest('.score-popover') && !target.closest('.circle')) {
                    setActiveEdit(null);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [activeEdit]);

    // Close filter dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.difficulty-filter-container')) {
                setActiveFilter(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Base64 characters for encoding (standard)
    const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

    const encodeScoreMap = (results: UserMusicResult[], maxId: number): string => {
        const resultBySong: Record<number, Record<Difficulty, number>> = {};

        // Map results for easier access
        results.forEach(r => {
            const id = Number(r.musicId);
            if (!isNaN(id)) {
                if (!resultBySong[id]) resultBySong[id] = {} as any;

                let val = 0;
                if (r.playResult === 'clear') val = 1;
                else if (r.playResult === 'full_combo') val = 2;
                else if (r.playResult === 'full_perfect') val = 3;

                resultBySong[id][r.musicDifficulty] = val;
            }
        });

        let binaryString = "";

        // Iterate from ID 1 to maxId
        for (let i = 1; i <= maxId; i++) {
            const songRes = resultBySong[i] || {};
            // Order: Easy, Normal, Hard, Expert, Master, Append
            // 2 bits each. 
            // Construct 12-bit integer.
            // MSB -> LSB: Easy -> Append
            const easy = songRes['easy'] || 0;
            const normal = songRes['normal'] || 0;
            const hard = songRes['hard'] || 0;
            const expert = songRes['expert'] || 0;
            const master = songRes['master'] || 0;
            const append = songRes['append'] || 0;

            const val = (easy << 10) | (normal << 8) | (hard << 6) | (expert << 4) | (master << 2) | append;

            // Convert 12-bit val to 2 Base64 chars
            const char1 = BASE64_CHARS[(val >> 6) & 0x3F];
            const char2 = BASE64_CHARS[val & 0x3F];

            binaryString += char1 + char2;
        }

        return binaryString;
    };

    const decodeScoreMap = (encoded: string): UserMusicResult[] => {
        // Support legacy URL-unsafe characters
        encoded = encoded.replace(/\+/g, '-').replace(/\//g, '_');

        const results: UserMusicResult[] = [];
        const now = Date.now();

        // Each 2 chars = 1 song ID
        for (let i = 0; i < encoded.length; i += 2) {
            if (i + 1 >= encoded.length) break;

            const char1 = encoded[i];
            const char2 = encoded[i + 1];

            const val1 = BASE64_CHARS.indexOf(char1);
            const val2 = BASE64_CHARS.indexOf(char2);

            if (val1 === -1 || val2 === -1) continue;

            const val = (val1 << 6) | val2;
            const songId = (i / 2) + 1;

            // Extract difficulties
            const diffs: Difficulty[] = ['easy', 'normal', 'hard', 'expert', 'master', 'append'];
            // Easy: bits 11-10 (val >> 10) & 3
            // Normal: bits 9-8 (val >> 8) & 3
            // ...

            const states = [
                (val >> 10) & 3, // Easy
                (val >> 8) & 3,  // Normal
                (val >> 6) & 3,  // Hard
                (val >> 4) & 3,  // Expert
                (val >> 2) & 3,  // Master
                val & 3          // Append
            ];

            states.forEach((state, idx) => {
                if (state > 0) {
                    let playResult: 'clear' | 'full_combo' | 'full_perfect' | null = null;
                    if (state === 1) playResult = 'clear';
                    else if (state === 2) playResult = 'full_combo';
                    else if (state === 3) playResult = 'full_perfect';

                    if (playResult) {
                        results.push({
                            musicId: String(songId),
                            musicDifficulty: diffs[idx],
                            playResult: playResult,
                            score: 1000,
                            createdAt: now,
                            updatedAt: now
                        });
                    }
                }
            });
        }

        return results;
    };

    // Old useEffect removed (replaced by preview logic)

    const handleShareUrl = () => {
        const maxId = songs.length > 0 ? Math.max(...songs.map(s => Number(s.id))) : 0;
        if (maxId === 0) return;

        const encoded = encodeScoreMap(localResults, maxId);
        const url = new URL(window.location.href);
        url.searchParams.set('data', encoded);



        setShareUrl(url.toString());
        setShowShareModal(true);
    };

    const copyShareUrl = () => {
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert('URL이 클립보드에 복사되었습니다.');
        }).catch(() => {
            alert('복사 실패. URL을 직접 복사해주세요.');
        });
    };

    const handleExport = () => {
        // Create export data structure: Song ID, Japanese Title, and status for each difficulty
        // Sort by release date descending (newest first)
        // We need to join localResults with songs data to get title and release date

        // 1. Map results to a more usable format (map by songId)
        const resultsBySong: Record<string, Record<string, string>> = {};
        localResults.forEach(r => {
            if (!resultsBySong[r.musicId]) resultsBySong[r.musicId] = {};
            resultsBySong[r.musicId][r.musicDifficulty] = r.playResult;
        });

        // 2. Create the export list
        const exportList = songs.map(song => {
            const songResults = resultsBySong[song.id] || {};
            return {
                id: song.id,
                title_jp: song.title_jp,
                release_date: song.release_date, // Correct property name
                easy: songResults['easy'] || null,
                normal: songResults['normal'] || null,
                hard: songResults['hard'] || null,
                expert: songResults['expert'] || null,
                master: songResults['master'] || null,
                append: songResults['append'] || null
            };
        });

        // 3. Sort by release_date descending (newest first), otherwise by ID descending as proxy
        exportList.sort((a, b) => {
            if (a.release_date && b.release_date) {
                if (a.release_date < b.release_date) return 1;
                if (a.release_date > b.release_date) return -1;
                return 0;
            }
            // Fallback to ID descending
            return parseInt(b.id) - parseInt(a.id);
        });

        // 4. Clean up for final JSON
        const finalExport = exportList.map(({ id, title_jp, easy, normal, hard, expert, master, append }) => ({
            id,
            title_jp,
            easy,
            normal,
            hard,
            expert,
            master,
            append
        }));

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(finalExport, null, 2)); // Pretty print
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "sekai_scores.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target?.result as string);

                if (Array.isArray(importedData)) {
                    // Convert back to UserMusicResult[] format
                    const newResults: UserMusicResult[] = [];
                    const now = Date.now();

                    importedData.forEach((item: any) => {
                        if (!item.id) return; // Skip invalid rows without ID

                        // Note: title_jp is present in the file but we ignore it as requested.
                        // We only use the ID to map results.

                        const diffs: Difficulty[] = ['easy', 'normal', 'hard', 'expert', 'master', 'append'];
                        diffs.forEach(diff => {
                            if (item[diff]) {
                                newResults.push({
                                    musicId: String(item.id),
                                    musicDifficulty: diff,
                                    playResult: item[diff],
                                    score: 1000, // Default score
                                    createdAt: now,
                                    updatedAt: now
                                });
                            }
                        });
                    });

                    setPreviewResults(newResults);
                    const { best39, bestAppend } = processUserBest(songs, newResults);
                    setPreviewBest39(best39);
                    setPreviewBestAppend(bestAppend);
                    setShowPreviewModal(true);
                } else {
                    alert('올바르지 않은 파일 형식입니다.');
                }
            } catch (error) {
                console.error('Error parsing JSON:', error);
                alert('JSON 파일 파싱 중 오류가 발생했습니다.');
            }
        };
        reader.readAsText(file);
        // Reset input value to allow re-importing same file
        event.target.value = '';
    };

    // Create a map for quick result lookup to pass to SongRow
    const resultsMap = useMemo(() => {
        const map: Record<string, Record<string, string>> = {};
        localResults.forEach(r => {
            if (!map[r.musicId]) map[r.musicId] = {};
            map[r.musicId][r.musicDifficulty] = r.playResult;
        });
        return map;
    }, [localResults]);

    const updateResult = (musicId: string, difficulty: Difficulty, result: 'clear' | 'full_combo' | 'full_perfect' | null) => {
        setLocalResults(prevResults => {
            const newResults = [...prevResults];
            const existingIndex = newResults.findIndex(r => r.musicId === musicId && r.musicDifficulty === difficulty);

            if (result === null) {
                if (existingIndex >= 0) {
                    newResults.splice(existingIndex, 1);
                }
            } else {
                const newItem: UserMusicResult = {
                    musicId,
                    musicDifficulty: difficulty,
                    playResult: result,
                    score: 1000,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };

                if (existingIndex >= 0) {
                    newResults[existingIndex] = { ...newResults[existingIndex], playResult: result, updatedAt: Date.now() };
                } else {
                    newResults.push(newItem);
                }
            }

            // Notify parent (this might trigger re-render of parent, but localResults state update is what matters)
            // We defer the parent update to useEffect or just call it here. 
            // Calling it here is fine, but we need to use the newResults.
            // Note: onUpdateResults is a prop, so it might change.
            // To be safe, we can just call it.
            onUpdateResults(newResults);

            return newResults;
        });

        setActiveEdit(null);
    };

    const updateResultsBulk = (updates: { musicId: string, difficulty: Difficulty, result: 'clear' | 'full_combo' | 'full_perfect' | null }[]) => {
        setLocalResults(prevResults => {
            const newResults = [...prevResults];

            updates.forEach(({ musicId, difficulty, result }) => {
                const existingIndex = newResults.findIndex(r => r.musicId === musicId && r.musicDifficulty === difficulty);

                if (result === null) {
                    if (existingIndex >= 0) {
                        newResults.splice(existingIndex, 1);
                    }
                } else {
                    const newItem: UserMusicResult = {
                        musicId,
                        musicDifficulty: difficulty,
                        playResult: result,
                        score: 1000,
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    };

                    if (existingIndex >= 0) {
                        newResults[existingIndex] = { ...newResults[existingIndex], playResult: result, updatedAt: Date.now() };
                    } else {
                        newResults.push(newItem);
                    }
                }
            });

            onUpdateResults(newResults);
            return newResults;
        });

        setActiveEdit(null);
    };

    // Check if any filter is active
    const activeFilters = useMemo(() => {
        const filters: Difficulty[] = [];
        if (easyLevel) filters.push('easy');
        if (normalLevel) filters.push('normal');
        if (hardLevel) filters.push('hard');
        if (expertLevel) filters.push('expert');
        if (masterLevel) filters.push('master');
        if (appendLevel) filters.push('append');
        return filters;
    }, [easyLevel, normalLevel, hardLevel, expertLevel, masterLevel, appendLevel]);

    const [unfilteredSortOrder, setUnfilteredSortOrder] = useState<'desc' | 'asc'>('desc');
    const [filteredSortOrder, setFilteredSortOrder] = useState<'desc' | 'asc'>('asc');

    const filteredSongs = useMemo(() => {
        let result = songs;
        const term = searchTerm.toLowerCase().replace(/\s/g, '');

        // 1. Text Search
        if (term) {
            result = result.filter(song => {
                const titleKo = (song.title_ko || '').toLowerCase().replace(/\s/g, '');
                const titleJp = (song.title_jp || '').toLowerCase().replace(/\s/g, '');
                const composer = (song.composer || '').toLowerCase().replace(/\s/g, '');

                if (titleKo.includes(term) || titleJp.includes(term) || composer.includes(term)) return true;
                if (song.title_ko && /[ㄱ-ㅎ]/.test(term)) {
                    // getChoseong is imported from 'es-hangul'
                    const choseong = getChoseong(song.title_ko).replace(/\s/g, '');
                    if (choseong.includes(term)) return true;
                }
                return false;
            });
        }

        // 2. Difficulty Level Filter
        if (easyLevel) result = result.filter(song => song.levels.easy === parseInt(easyLevel));
        if (normalLevel) result = result.filter(song => song.levels.normal === parseInt(normalLevel));
        if (hardLevel) result = result.filter(song => song.levels.hard === parseInt(hardLevel));
        if (expertLevel) result = result.filter(song => song.levels.expert === parseInt(expertLevel));
        if (masterLevel) result = result.filter(song => song.levels.master === parseInt(masterLevel));
        if (appendLevel) {
            if (appendLevel === 'all') result = result.filter(song => song.levels.append !== null);
            else result = result.filter(song => song.levels.append === parseInt(appendLevel));
        }

        // 3. Sorting
        const isFiltered = !!(easyLevel || normalLevel || hardLevel || expertLevel || masterLevel || appendLevel);

        if (isFiltered) {
            // Filtered Mode Logic
            if (filteredSortOrder === 'desc') {
                // Descending: Sort by release_date Descending (Newest first)
                // User Request: If Append filter is active, use 'apd' date if available
                const useApd = !!appendLevel;

                result = [...result].sort((a, b) => {
                    const dateA = (useApd && a.apd) ? a.apd : a.release_date;
                    const dateB = (useApd && b.apd) ? b.apd : b.release_date;

                    if (dateA < dateB) return 1;
                    if (dateA > dateB) return -1;
                    return 0;
                });
            } else {
                // Ascending (Default): Use original complex sort (Hako -> Unit -> Release Date Asc)
                result = [...result].sort((a, b) => {
                    // 1. Grouping: 
                    // Top: Existing/Cover/Contest (기존곡, 커버곡, 공모전곡)
                    // Bottom: Commissioned (하코곡)

                    // Exception IDs that should be treated as Cover/Existing even if they are Hako
                    const exceptionIds = ['230', '231', '232', '233', '234'];
                    // Forced Hako IDs (User request)
                    const forcedHakoIds = ['162', '163', '164', '447', '448', '449', '503', '622'];

                    // Check if '하코곡' (Commissioned), excluding exceptions, OR if forced
                    const isHakoA = (a.classification === '하코곡' && !exceptionIds.includes(a.id)) || forcedHakoIds.includes(a.id);
                    const isHakoB = (b.classification === '하코곡' && !exceptionIds.includes(b.id)) || forcedHakoIds.includes(b.id);

                    // If one is Hako and the other isn't, put Hako at the bottom
                    if (isHakoA !== isHakoB) return isHakoA ? 1 : -1;

                    // 2. Unit Order: VS -> L/N -> MMJ -> VBS -> WxS -> 25 -> Other
                    const unitOrder = ['VS', 'L/n', 'MMJ', 'VBS', 'WxS', 'N25', 'Oth'];
                    const idxA = unitOrder.indexOf(a.unit_code);
                    const idxB = unitOrder.indexOf(b.unit_code);

                    // Treat 'Other' (not found) as last
                    const sortIdxA = idxA === -1 ? 999 : idxA;
                    const sortIdxB = idxB === -1 ? 999 : idxB;

                    if (sortIdxA !== sortIdxB) return sortIdxA - sortIdxB;

                    // 3. Release Date (Ascending: Earlier first)
                    if (a.release_date < b.release_date) return -1;
                    if (a.release_date > b.release_date) return 1;

                    return 0;
                });
            }
        } else {
            // Unfiltered Mode Logic
            if (unfilteredSortOrder === 'asc') {
                // ID Priority List for same release date sorting
                const ID_PRIORITY = [
                    "337", "336", "077", "076", "060", "051", "054", "057", "063",
                    "067", "066", "019", "078", "041", "038", "069", "028", "026",
                    "071", "013", "010", "006", "003", "002", "082", "050", "049",
                    "047", "043", "001"
                ];

                // Ascending: Sort by release_date Ascending (Oldest first) + ID Priority
                result = [...result].sort((a, b) => {
                    // 1. Release Date
                    if (a.release_date < b.release_date) return -1;
                    if (a.release_date > b.release_date) return 1;

                    // 2. ID Priority (Same Date)
                    const idxA = ID_PRIORITY.indexOf(a.id);
                    const idxB = ID_PRIORITY.indexOf(b.id);

                    if (idxA !== -1 && idxB !== -1) return idxB - idxA;
                    if (idxA !== -1) return 1;
                    if (idxB !== -1) return -1;

                    // 3. Fallback (ID Ascending)
                    return parseInt(a.id) - parseInt(b.id);
                });
            }
            // If 'desc' (Default), do nothing (API Order)
        }

        return result;
    }, [songs, searchTerm, easyLevel, normalLevel, hardLevel, expertLevel, masterLevel, appendLevel, unfilteredSortOrder, filteredSortOrder]);

    const resetFilters = () => {
        setEasyLevel('');
        setNormalLevel('');
        setHardLevel('');
        setExpertLevel('');
        setMasterLevel('');
        setAppendLevel('');
        setActiveFilter(null);
    };

    // Check if any filter is active (for rendering reset button)
    const isAnyFilterActive = !!(easyLevel || normalLevel || hardLevel || expertLevel || masterLevel || appendLevel);

    // Generate level options for bulk select (5 to 38)
    const levelOptions = Array.from({ length: 34 }, (_, i) => i + 5);

    const toggleBulkDiff = (diff: Difficulty) => {
        const newSet = new Set(bulkDiffs);
        if (newSet.has(diff)) newSet.delete(diff);
        else newSet.add(diff);
        setBulkDiffs(newSet);
    };

    const toggleBulkModal = (e?: React.MouseEvent<HTMLButtonElement>) => {
        if (showBulkModal) {
            setShowBulkModal(false);
            setBulkModalPos(null);
        } else {
            if (e) {
                const rect = e.currentTarget.getBoundingClientRect();
                // Calculate position to be below the button, aligned to the right if possible, or left
                // Default to aligning right edge of modal with right edge of button, but ensure it fits
                // Actually, let's just center it below the button or align left/right based on space.
                // Simple approach: Top = button bottom + 10px. Left/Right handled via CSS or calc.
                // Let's try to align the top-right of the modal with the bottom-right of the button for mobile,
                // and top-left with bottom-left for desktop if space permits.

                // Since we want "directly below", let's use fixed positioning based on the rect.
                // For PC, align right edge of modal with right edge of button (expand to left).
                // For Mobile, we use CSS centering so left/right in state doesn't matter as much, but we can set them.

                const isMobile = window.innerWidth <= 768;

                setBulkModalPos({
                    top: rect.bottom + 10,
                    left: isMobile ? 0 : undefined, // Not used for PC right alignment
                    right: isMobile ? 0 : window.innerWidth - rect.right // Align right edge
                });
            }
            setShowBulkModal(true);
        }
    };

    const applyBulkUpdate = () => {
        if (bulkDiffs.size === 0) {
            alert('난이도를 선택해주세요.');
            return;
        }

        if (window.confirm('선택한 범위의 곡들에 결과를 일괄 적용하시겠습니까? (기존 기록 덮어씌움)')) {
            const newResults = [...localResults];

            songs.forEach(song => {
                bulkDiffs.forEach(diff => {
                    const level = song.levels[diff];
                    if (level !== null && level >= bulkMinLevel && level <= bulkMaxLevel) {
                        // Logic similar to updateResult but without state update per item
                        const existingIndex = newResults.findIndex(r => r.musicId === song.id && r.musicDifficulty === diff);

                        if (bulkResult === null) {
                            // Remove result
                            if (existingIndex >= 0) newResults.splice(existingIndex, 1);
                        } else {
                            // Add/Update result
                            const newItem: UserMusicResult = {
                                musicId: song.id,
                                musicDifficulty: diff,
                                playResult: bulkResult,
                                score: 1000, // Default score
                                createdAt: Date.now(),
                                updatedAt: Date.now()
                            };

                            if (existingIndex >= 0) {
                                newResults[existingIndex] = { ...newResults[existingIndex], playResult: bulkResult, updatedAt: Date.now() };
                            } else {
                                newResults.push(newItem);
                            }
                        }
                    }
                });
            });

            setLocalResults(newResults);
            handleUpdateResults(newResults);
            setShowBulkModal(false);
        }
    };

    const updateFilter = (targetDiff: Difficulty, level: string) => {
        // Reset all others to ensure only one filter is active
        if (targetDiff !== 'easy') setEasyLevel('');
        if (targetDiff !== 'normal') setNormalLevel('');
        if (targetDiff !== 'hard') setHardLevel('');
        if (targetDiff !== 'expert') setExpertLevel('');
        if (targetDiff !== 'master') setMasterLevel('');
        if (targetDiff !== 'append') setAppendLevel('');

        // Set target
        switch (targetDiff) {
            case 'easy': setEasyLevel(level); break;
            case 'normal': setNormalLevel(level); break;
            case 'hard': setHardLevel(level); break;
            case 'expert': setExpertLevel(level); break;
            case 'master': setMasterLevel(level); break;
            case 'append': setAppendLevel(level); break;
        }
    };

    return (
        <div className="score-input-container">
            {/* Sticky Header */}
            <div className="score-input-header">
                <div className="header-top-row">
                    <button onClick={() => navigate('/')} className="back-button">&lt; 뒤로가기</button>

                    {/* Legend Moved Here */}
                    <div className="score-legend">
                        <div className="legend-item">
                            <div className="legend-circle clear">C</div>
                            <span> 클리어</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-circle fc">F</div>
                            <span>풀콤보</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-circle ap">P</div>
                            <span>AP</span>
                        </div>
                    </div>

                    <div className="header-actions">
                        <button onClick={handleShareUrl} className="export-button" style={{ marginRight: '10px' }}>URL로 데이터 공유</button>
                        <button onClick={handleExport} className="export-button">내보내기</button>
                        <label className="import-button">
                            불러오기
                            <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
                        </label>
                    </div>
                </div>

                <input
                    type="text"
                    placeholder="곡 검색 (제목, 작곡가, 초성)"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="search-input"
                />

                {/* Mobile Instruction & Sort Toggle */}
                <div className="difficulty-instruction mobile-only" style={{ marginTop: '8px', marginBottom: '4px', justifyContent: 'center', alignItems: 'center', position: 'relative', height: '30px' }}>
                    <span>{isAnyFilterActive ? "오름차순 정렬 시 인겜 순서와 동일" : "위의 난이도 버튼 눌러서 레벨 검색"}</span>
                    <button
                        className="bulk-input-trigger-btn mobile"
                        onClick={toggleBulkModal}
                        style={{ position: 'absolute', right: '60px' }}
                    >
                        일괄 입력
                    </button>
                    <button
                        className="sort-toggle-btn mobile"
                        onClick={() => {
                            if (isAnyFilterActive) {
                                setFilteredSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
                            } else {
                                setUnfilteredSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
                            }
                        }}
                        style={{ position: 'absolute', right: '0px', background: 'none', border: 'none', color: '#aaa', fontSize: '1.2rem', outline: 'none' }}
                    >
                        {(isAnyFilterActive ? filteredSortOrder : unfilteredSortOrder) === 'desc' ? '↓' : '↑'}
                    </button>
                </div>

                {/* Difficulty Header Row */}
                <div className="difficulty-header-row">
                    <div className="difficulty-header-spacer">
                        {isAnyFilterActive && (
                            <button className="reset-filter-btn" onClick={resetFilters} title="필터 초기화">
                                ↺
                            </button>
                        )}
                    </div>
                    <div className="difficulty-header-content">
                        <div className="difficulty-header-labels">
                            {isAnyFilterActive && (
                                <button className="reset-filter-btn mobile-only" onClick={resetFilters} title="필터 초기화" style={{ marginRight: '4px' }}>
                                    &lt;
                                </button>
                            )}
                            <DifficultyFilter diff="easy" label="EASY" value={easyLevel} onChange={(val) => updateFilter('easy', val)} activeFilter={activeFilter} setActiveFilter={setActiveFilter} songs={songs} />
                            <DifficultyFilter diff="normal" label="NORMAL" value={normalLevel} onChange={(val) => updateFilter('normal', val)} activeFilter={activeFilter} setActiveFilter={setActiveFilter} songs={songs} />
                            <DifficultyFilter diff="hard" label="HARD" value={hardLevel} onChange={(val) => updateFilter('hard', val)} activeFilter={activeFilter} setActiveFilter={setActiveFilter} songs={songs} />
                            <DifficultyFilter diff="expert" label="EXPERT" value={expertLevel} onChange={(val) => updateFilter('expert', val)} activeFilter={activeFilter} setActiveFilter={setActiveFilter} songs={songs} />
                            <DifficultyFilter diff="master" label="MASTER" value={masterLevel} onChange={(val) => updateFilter('master', val)} activeFilter={activeFilter} setActiveFilter={setActiveFilter} songs={songs} />
                            <DifficultyFilter diff="append" label="APPEND" value={appendLevel} onChange={(val) => updateFilter('append', val)} activeFilter={activeFilter} setActiveFilter={setActiveFilter} songs={songs} />

                            {/* Sort Toggle Button (Desktop) */}
                            <button
                                className="sort-toggle-btn desktop-only"
                                onClick={() => {
                                    if (isAnyFilterActive) {
                                        setFilteredSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
                                    } else {
                                        setUnfilteredSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
                                    }
                                }}
                                title={(isAnyFilterActive ? filteredSortOrder : unfilteredSortOrder) === 'desc' ? "내림차순" : "오름차순"}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#aaa',
                                    fontSize: '1.2rem',
                                    cursor: 'pointer',
                                    padding: '0 8px',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    outline: 'none'
                                }}
                            >
                                {(isAnyFilterActive ? filteredSortOrder : unfilteredSortOrder) === 'desc' ? '↓' : '↑'}
                            </button>
                        </div>
                        <div className="difficulty-instruction desktop-only desktop-instruction-container">
                            <span>{isAnyFilterActive ? "오름차순 정렬 시 인겜 순서와 동일" : "좌측 난이도 버튼 눌러서 레벨 검색"}</span>
                            <button
                                className="bulk-input-trigger-btn desktop"
                                onClick={toggleBulkModal}
                            >
                                일괄 입력
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Song List */}
            <div className="song-list">
                {filteredSongs.map(song => (
                    <SongRow
                        key={song.id}
                        song={song}
                        activeEdit={activeEdit}
                        setActiveEdit={setActiveEdit}
                        updateResult={updateResult}
                        updateResultsBulk={updateResultsBulk}
                        activeFilters={activeFilters}
                        songResults={resultsMap[song.id] || {}}
                    />
                ))}
            </div>

            {/* Preview Modal */}
            {
                showPreviewModal && (
                    <div className="modal-overlay">
                        <div className="preview-modal">
                            <h2>불러올 데이터 미리보기</h2>
                            <p>데이터를 불러옵니다.</p>

                            <div className="preview-stats">
                                <div className="stat-item">
                                    <span className="label">불러올 기록 수</span>
                                    <span className="value">{previewResults.length}개</span>
                                </div>
                                <div className="stat-item">
                                    <span className="label">예상 Total R</span>
                                    <span className="value">{calculateTotalR(previewBest39)}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="label">예상 Append R</span>
                                    <span className="value">{calculateAppendR(previewBestAppend)}</span>
                                </div>
                            </div>

                            <div className="preview-best39">
                                <h3>Best 39 미리보기</h3>
                                <div className="preview-list">
                                    {previewBest39.map((item, idx) => (
                                        <div key={idx} className="preview-item">
                                            <span className="rank">#{idx + 1}</span>
                                            <span className={`preview-diff ${item.musicDifficulty}`}>
                                                {item.musicDifficulty === 'master' ? 'MAS' :
                                                    item.musicDifficulty === 'expert' ? 'EXP' :
                                                        item.musicDifficulty === 'append' ? 'APD' :
                                                            item.musicDifficulty.toUpperCase().slice(0, 3)}
                                            </span>
                                            <span className={`preview-clear-status ${item.rank}`}>
                                                {item.rank === 'P' ? 'AP' : item.rank === 'F' ? 'FC' : 'Clear'}
                                            </span>
                                            <span className="title">{item.title}</span>
                                            <span className="score">{item.r.toFixed(1)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>


                            {previewBestAppend.length > 0 && (
                                <div className="preview-best39" style={{ marginTop: '20px' }}>
                                    <h3>Best Append 미리보기 (Top 13)</h3>
                                    <div className="preview-list">
                                        {previewBestAppend.map((item, idx) => (
                                            <div key={idx} className="preview-item">
                                                <span className="rank">#{idx + 1}</span>
                                                <span className={`preview-diff ${item.musicDifficulty}`}>
                                                    APD
                                                </span>
                                                <span className={`preview-clear-status ${item.rank}`}>
                                                    {item.rank === 'P' ? 'AP' : item.rank === 'F' ? 'FC' : 'Clear'}
                                                </span>
                                                <span className="title">{item.title}</span>
                                                <span className="score">{item.r.toFixed(1)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="preview-actions">
                                <button className="preview-btn cancel" onClick={cancelLoad}>취소</button>
                                <button className="preview-btn confirm" onClick={confirmLoad}>불러오기 (덮어쓰기)</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Share Modal */}
            {
                showShareModal && (
                    <div className="modal-overlay">
                        <div className="share-modal">
                            <h2>데이터 공유 URL</h2>
                            <p>아래 URL을 복사하여 다른 기기나 브라우저에서 내 기록을 불러올 수 있습니다.</p>
                            <div className="url-container">
                                <input type="text" value={shareUrl} readOnly />
                                <button onClick={copyShareUrl}>복사</button>
                            </div>
                            <div className="modal-actions">
                                <button className="confirm-btn" onClick={() => setShowShareModal(false)}>닫기</button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Bulk Input Panel (Fixed/Absolute Position) */}
            {
                showBulkModal && (
                    <div
                        className="bulk-panel-container"
                        style={bulkModalPos ? {
                            position: 'fixed',
                            top: `${bulkModalPos.top}px`,
                            left: window.innerWidth <= 768 ? '0' : (bulkModalPos.left !== undefined ? `${bulkModalPos.left}px` : 'auto'),
                            right: window.innerWidth <= 768 ? '0' : (bulkModalPos.right !== undefined ? `${bulkModalPos.right}px` : 'auto'),
                            margin: window.innerWidth <= 768 ? '0 auto' : '0',
                            bottom: 'auto',
                            transform: 'none',
                            width: window.innerWidth <= 768 ? '90%' : 'auto', // Ensure it fits on mobile
                            maxWidth: '400px'
                        } : {}}
                    >
                        <div className="bulk-panel">
                            <div className="bulk-header">
                                <h3>일괄 입력</h3>
                                <button className="bulk-close-btn" onClick={() => setShowBulkModal(false)}>✕</button>
                            </div>

                            <div className="bulk-section">
                                <label>난이도 선택</label>
                                <div className="bulk-diff-buttons">
                                    {(['easy', 'normal', 'hard', 'expert', 'master', 'append'] as Difficulty[]).map(diff => (
                                        <button
                                            key={diff}
                                            className={`bulk-diff-btn ${diff} ${bulkDiffs.has(diff) ? 'selected' : ''}`}
                                            onClick={() => toggleBulkDiff(diff)}
                                        >
                                            {diff === 'easy' ? 'EASY' : diff === 'normal' ? 'NORM' : diff === 'hard' ? 'HARD' : diff === 'expert' ? 'EX' : diff === 'master' ? 'MAS' : 'APD'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bulk-section">
                                <label>레벨 범위</label>
                                <div className="bulk-level-range">
                                    <select value={bulkMinLevel} onChange={e => setBulkMinLevel(Number(e.target.value))}>
                                        {levelOptions.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                    <span>~</span>
                                    <select value={bulkMaxLevel} onChange={e => setBulkMaxLevel(Number(e.target.value))}>
                                        {levelOptions.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="bulk-section">
                                <label>결과 선택</label>
                                <div className="bulk-result-buttons">
                                    <button className={`bulk-result-btn none ${bulkResult === null ? 'active' : ''}`} onClick={() => setBulkResult(null)}>-</button>
                                    <button className={`bulk-result-btn clear ${bulkResult === 'clear' ? 'active' : ''}`} onClick={() => setBulkResult('clear')}>C</button>
                                    <button className={`bulk-result-btn fc ${bulkResult === 'full_combo' ? 'active' : ''}`} onClick={() => setBulkResult('full_combo')}>FC</button>
                                    <button className={`bulk-result-btn ap ${bulkResult === 'full_perfect' ? 'active' : ''}`} onClick={() => setBulkResult('full_perfect')}>AP</button>
                                </div>
                            </div>

                            <div className="bulk-actions">
                                <button className="bulk-apply-btn" onClick={applyBulkUpdate}>적용</button>
                            </div>
                        </div>
                    </div>
                )
            }


        </div >
    );
};

export default ScoreInput;
