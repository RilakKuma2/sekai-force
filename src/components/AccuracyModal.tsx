import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Song } from '../utils/api';
import { type Difficulty } from '../utils/calculator';
import { getChoseong } from 'es-hangul';
import '../pages/ScoreInput.css'; // Reuse existing CSS

export interface AccuracyInput {
    perfect: number;
    great: number;
    good: number;
    bad: number;
    miss: number;
}

interface AccuracyModalProps {
    mode: 'edit' | 'calculator';
    songs: Song[];
    // For 'edit' mode or pre-selection
    targetSong?: Song | null;
    targetDiff?: Difficulty;
    initialValues?: AccuracyInput | null;
    existingValues?: AccuracyInput | null;
    getExistingData?: (songId: string, diff: Difficulty) => AccuracyInput | null;

    onSave?: (data: AccuracyInput, info?: { songId: string, diff: Difficulty }) => void;
    onDelete?: (info?: { songId: string, diff: Difficulty }) => void;
    onClose: () => void;

    // Position for edit mode (optional, if using absolute positioning)
    position?: { top: number; left: number };
}

const calculateAccuracy = (input: AccuracyInput): number | null => {
    const total = input.perfect + input.great + input.good + input.bad + input.miss;
    if (total === 0) return null;
    const score = input.perfect * 3 + input.great * 2 + input.good * 1;
    return (score / (total * 3)) * 100;
};

const AccuracyModal: React.FC<AccuracyModalProps> = ({
    mode,
    songs,
    targetSong,
    targetDiff,
    initialValues,
    existingValues,
    getExistingData,
    onSave,
    onDelete,
    onClose,
    position
}) => {
    // Calculator Mode State
    const [selectedSongId, setSelectedSongId] = useState<string>(targetSong?.id || '');
    const [selectedDiff, setSelectedDiff] = useState<Difficulty>(targetDiff || 'master'); // Default to Master
    const [searchTerm, setSearchTerm] = useState('');
    const [showSongList, setShowSongList] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Focus search input when in calculator mode
    useEffect(() => {
        if (mode === 'calculator' && !targetSong && !selectedSongId) {
            searchInputRef.current?.focus();
            setShowSongList(true);
        }
    }, [mode, targetSong, selectedSongId]);

    // Input State
    const [inputs, setInputs] = useState<AccuracyInput>(initialValues || {
        perfect: 0, great: 0, good: 0, bad: 0, miss: 0
    });

    // Store existing loads for calculator mode display
    const [calculatorExistingValues, setCalculatorExistingValues] = useState<AccuracyInput | null>(null);

    // Load existing data in calculator mode
    useEffect(() => {
        if (mode === 'calculator' && selectedSongId && selectedDiff && getExistingData) {
            const data = getExistingData(selectedSongId, selectedDiff);
            setCalculatorExistingValues(data);
            if (data) {
                setInputs(data);
            } else {
                setInputs({ perfect: 0, great: 0, good: 0, bad: 0, miss: 0 });
            }
        }
    }, [selectedSongId, selectedDiff, mode, getExistingData]);

    // Resolve current song/diff based on mode
    const currentSong = useMemo(() => {
        if (mode === 'edit') return targetSong;
        return songs.find(s => s.id === selectedSongId) || null;
    }, [mode, targetSong, selectedSongId, songs]);

    const currentDiff = mode === 'edit' ? targetDiff : selectedDiff;
    const activeExistingValues = mode === 'edit' ? existingValues : calculatorExistingValues;

    // DB Total Notes Logic
    const dbTotalNotes = useMemo(() => {
        if (!currentSong || !currentDiff) return null;
        if (currentDiff === 'expert') return currentSong.ex_note ?? null;
        if (currentDiff === 'master') return currentSong.ma_note ?? null;
        if (currentDiff === 'append') return currentSong.ap_note ?? null;
        return null;
    }, [currentSong, currentDiff]);

    // Auto-calculate Perfect
    useEffect(() => {
        if (dbTotalNotes !== null) {
            const others = inputs.great + inputs.good + inputs.bad + inputs.miss;
            const calculatedPerfect = Math.max(0, dbTotalNotes - others);
            if (inputs.perfect !== calculatedPerfect) {
                setInputs(prev => ({ ...prev, perfect: calculatedPerfect }));
            }
        }
    }, [inputs.great, inputs.good, inputs.bad, inputs.miss, dbTotalNotes]);

    const handleInputChange = (type: keyof AccuracyInput, valueStr: string) => {
        if (type === 'perfect' && dbTotalNotes !== null) return;

        let newVal = Math.max(0, parseInt(valueStr) || 0);

        if (dbTotalNotes !== null && type !== 'perfect') {
            let currentSum = 0;
            (['great', 'good', 'bad', 'miss'] as const).forEach(k => {
                if (k === type) currentSum += newVal;
                else currentSum += inputs[k];
            });

            if (currentSum > dbTotalNotes) {
                newVal = 0;
            }
        }

        setInputs(prev => ({
            ...prev,
            [type]: newVal
        }));
    };

    const handleSave = () => {
        if (onSave) {
            if (mode === 'calculator') {
                if (selectedSongId && selectedDiff) {
                    onSave(inputs, { songId: selectedSongId, diff: selectedDiff });
                }
            } else {
                if (targetSong && targetDiff) {
                    onSave(inputs, { songId: targetSong.id, diff: targetDiff });
                } else {
                    onSave(inputs);
                }
            }
        }
    };
    // onClose removed to allow parent to decide when to close (e.g. after confirmation)

    const handleDelete = () => {
        if (!onDelete) return;
        if (window.confirm('정확도 데이터를 삭제하시겠습니까?')) {
            if (mode === 'calculator') {
                if (selectedSongId && selectedDiff) {
                    onDelete({ songId: selectedSongId, diff: selectedDiff });
                }
            } else {
                if (targetSong && targetDiff) {
                    onDelete({ songId: targetSong.id, diff: targetDiff });
                } else {
                    onDelete();
                }
            }
        }
    };

    // Filter Logic for Calculator Mode
    const filteredSongs = useMemo(() => {
        if (!searchTerm) return songs;
        let result = songs;
        const term = searchTerm.toLowerCase().replace(/\s/g, '');

        const normalizeKana = (str: string) => {
            return str.replace(/[\u30a1-\u30f6]/g, (match) => {
                const chr = match.charCodeAt(0) - 0x60;
                return String.fromCharCode(chr);
            });
        };

        const normalizedTerm = normalizeKana(term);

        return result.filter(song => {
            const titleKo = (song.title_ko || '').toLowerCase().replace(/\s/g, '');
            const titleJp = normalizeKana((song.title_jp || '').toLowerCase().replace(/\s/g, ''));
            const titleHi = normalizeKana((song.title_hi || '').toLowerCase().replace(/\s/g, ''));
            const titleHangul = (song.title_hangul || '').toLowerCase().replace(/\s/g, '');
            const composer = (song.composer || '').toLowerCase().replace(/\s/g, '');

            if (titleKo.includes(term) || titleJp.includes(normalizedTerm) || titleHi.includes(normalizedTerm) || titleHangul.includes(term) || composer.includes(term)) return true;
            if (song.title_ko && /[ㄱ-ㅎ]/.test(term)) {
                const choseong = getChoseong(song.title_ko).replace(/\s/g, '');
                if (choseong.includes(term)) return true;
            }
            return false;
        });
    }, [searchTerm, songs]);

    const handleSongSelect = (songId: string) => {
        setSelectedSongId(songId);
        setShowSongList(false);
        setSearchTerm(''); // Clear search or keep it? Clearing is usually better after selection.
    };

    const handleChangeSong = () => {
        setSelectedSongId('');
        setShowSongList(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
    };

    // Difficulty Dropdown State
    const [showDiffDropdown, setShowDiffDropdown] = useState(false);
    const diffDropdownRef = useRef<HTMLDivElement>(null);

    // Close difficulty dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (diffDropdownRef.current && !diffDropdownRef.current.contains(event.target as Node)) {
                setShowDiffDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <>
            <div className="fixed-overlay" onClick={onClose} style={{ zIndex: 99998 }} />
            <div
                className="accuracy-modal"
                style={mode === 'edit' && position ? {
                    position: 'absolute',
                    top: position.top,
                    left: position.left,
                    zIndex: 99999,
                } : {
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 99999
                }}
                onClick={e => e.stopPropagation()}
            >
                <div className="accuracy-modal-header" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {mode === 'calculator' ? (
                        <div className="calc-header-top" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="calc-search-wrapper" style={{ flexGrow: 1 }}>
                                {selectedSongId ? (
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px', marginRight: '12px' }}>
                                            {currentSong?.title_ko || currentSong?.title_jp}
                                        </span>
                                        <button onClick={handleChangeSong} style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', background: '#eaebf3', color: '#434367', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem' }}>
                                            변경
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            placeholder="곡명/작곡가 검색"
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            onFocus={() => setShowSongList(true)}
                                            className="search-input"
                                            style={{ width: '100%' }}
                                        />
                                        {showSongList && searchTerm && (
                                            <div className="calc-song-list" style={{
                                                position: 'absolute',
                                                top: '100%',
                                                left: 0,
                                                right: 0,
                                                maxHeight: '250px',
                                                overflowY: 'auto',
                                                backgroundColor: '#ffffff',
                                                border: '1px solid #ccc',
                                                borderRadius: '0 0 8px 8px',
                                                zIndex: 1000,
                                                marginTop: '4px',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                color: '#333'
                                            }}>
                                                {filteredSongs.length > 0 ? (
                                                    filteredSongs.map(s => (
                                                        <div
                                                            key={s.id}
                                                            onClick={() => handleSongSelect(s.id)}
                                                            style={{
                                                                padding: '10px 12px',
                                                                cursor: 'pointer',
                                                                borderBottom: '1px solid #eee',
                                                                fontSize: '0.95rem',
                                                                fontWeight: '500'
                                                            }}
                                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0f0f5'}
                                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                        >
                                                            {s.title_ko || s.title_jp}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div style={{ padding: '12px', color: '#888', textAlign: 'center' }}>검색 결과 없음</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Difficulty Selector (Circular) */}
                            <div className="calc-diff-wrapper" style={{ position: 'relative' }} ref={diffDropdownRef}>
                                <div
                                    className={`header-circle ${selectedDiff}`}
                                    onClick={() => setShowDiffDropdown(!showDiffDropdown)}
                                    style={{ cursor: 'pointer', flexShrink: 0 }}
                                >
                                    {selectedDiff === 'master' ? 'MAS' : selectedDiff === 'expert' ? 'EXP' : selectedDiff === 'append' ? 'APD' : selectedDiff.toUpperCase()}
                                </div>
                                {showDiffDropdown && (
                                    <div className="diff-dropdown" style={{
                                        position: 'absolute',
                                        top: '110%',
                                        right: 0,
                                        backgroundColor: '#fff',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                        zIndex: 1001,
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(3, 1fr)',
                                        gap: '8px'
                                    }}>
                                        {['easy', 'normal', 'hard', 'expert', 'master', 'append'].map(diff => (
                                            <div
                                                key={diff}
                                                className={`header-circle ${diff}`}
                                                onClick={() => {
                                                    setSelectedDiff(diff as Difficulty);
                                                    setShowDiffDropdown(false);
                                                }}
                                                style={{ cursor: 'pointer', width: '36px', height: '36px', fontSize: '0.5rem' }}
                                            >
                                                {diff === 'master' ? 'MAS' : diff === 'expert' ? 'EXP' : diff === 'append' ? 'APD' : diff.toUpperCase().slice(0, 3)}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <span className={`accuracy-modal-diff ${currentDiff}`}>
                                {currentDiff?.toUpperCase()}
                            </span>
                        </div>
                    )}

                    <div className="accuracy-modal-stats-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: '4px' }}>
                        {currentSong ? (
                            <img
                                src={`https://asset.rilaksekai.com/cover/${currentSong.id}.webp`}
                                alt="cover"
                                style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }}
                                onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }}
                            />
                        ) : (
                            <div style={{ width: '40px', height: '40px' }} />
                        )}
                        <span className="total-notes" style={{ fontSize: '0.9rem', color: '#ccc' }}>
                            총 노트: {dbTotalNotes ?? (inputs.perfect + inputs.great + inputs.good + inputs.bad + inputs.miss)}
                        </span>
                    </div>
                </div>

                <div className="accuracy-modal-body">
                    {activeExistingValues && (
                        <div className="accuracy-column-header">
                            <span className="col-existing">기존</span>
                        </div>
                    )}

                    {(['perfect', 'great', 'good', 'bad', 'miss'] as const).map(type => {
                        // Display logic
                        const currentVal = inputs[type];
                        const currentValStr = String(currentVal);
                        const currentPadded = currentValStr.padStart(4, '0');
                        const currentLeadingZeros = currentPadded.slice(0, currentPadded.length - currentValStr.length);

                        const existingVal = activeExistingValues?.[type] ?? 0;
                        const existValStr = String(existingVal);
                        const existPadded = existValStr.padStart(4, '0');
                        const existLeadingZeros = existPadded.slice(0, existPadded.length - existValStr.length);

                        return (
                            <div key={type} className={`accuracy-input-row ${type}`}>
                                <label>{type.toUpperCase()}</label>
                                <div className="input-visual-wrapper">
                                    <div className="visual-value">
                                        <span className="padded-zeros">{currentLeadingZeros}</span>
                                        <span className="actual-number">{currentValStr || '0'}</span>
                                    </div>
                                    <input
                                        type="number"
                                        min={0}
                                        value={inputs[type]}
                                        readOnly={type === 'perfect' && dbTotalNotes !== null}
                                        className={type === 'perfect' && dbTotalNotes !== null ? 'auto-calculated' : ''}
                                        onFocus={e => e.target.select()}
                                        onChange={e => handleInputChange(type, e.target.value)}
                                    />
                                </div>
                                {activeExistingValues && (
                                    <span className="existing-value">
                                        <span className="padded-zeros">{existLeadingZeros}</span>
                                        <span className="actual-number">{existValStr || '0'}</span>
                                    </span>
                                )}
                            </div>
                        );
                    })}

                    <div className="accuracy-result-row">
                        <div className="accuracy-result-label">정확도</div>
                        <div className="accuracy-result-value">
                            {calculateAccuracy(inputs)?.toFixed(2) ?? '0.00'}%
                        </div>
                        {activeExistingValues && (
                            <div className="accuracy-existing-result">
                                {calculateAccuracy(activeExistingValues)?.toFixed(2) ?? '0.00'}%
                            </div>
                        )}
                    </div>
                </div>

                <div className="accuracy-modal-footer">
                    <button className="accuracy-clear-btn" onClick={handleDelete}>초기화</button>
                    <button className="accuracy-cancel-btn" onClick={onClose}>취소</button>
                    {(mode === 'edit' || (mode === 'calculator' && selectedSongId)) && onSave && (
                        <button className="accuracy-save-btn" onClick={handleSave}>저장</button>
                    )}
                </div>
            </div>
        </>
    );
};

export default AccuracyModal;
