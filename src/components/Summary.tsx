import React, { useState } from 'react';
import { type Song } from '../utils/api';
import { type MusicDifficultyStatus, type UserMusicResult } from '../utils/calculator';
import './Summary.css';

interface SummaryProps {
    best39: MusicDifficultyStatus[];
    userResults: UserMusicResult[];
    songs: Song[];
    totalR: number;
    appendTotalR: number;
    sekaiRank: string;
    playerId: string;
    twitterId: string;
    registrationDate: string;
    playerName: string;
    profileImage?: string | null;
}

const Summary: React.FC<SummaryProps> = ({ userResults, songs, totalR, appendTotalR, sekaiRank, playerId, twitterId, registrationDate, playerName, profileImage }) => {
    const [activeTooltip, setActiveTooltip] = useState<'none' | 'general' | 'append'>('none');

    // Calculate summary data
    const difficulties = ['easy', 'normal', 'hard', 'expert', 'master', 'append'] as const;

    // ... (rest of the calculation logic is unchanged, so we skip to the return) ...

    // Create a lookup map for user results to avoid duplicates and ensure O(1) access
    const resultMap = new Map<string, string>();
    userResults.forEach(r => {
        resultMap.set(`${r.musicId}-${r.musicDifficulty}`, r.playResult);
    });

    const summaryByDifficulty = {
        'P': { easy: 0, normal: 0, hard: 0, expert: 0, master: 0, append: 0 },
        'F': { easy: 0, normal: 0, hard: 0, expert: 0, master: 0, append: 0 },
        'C': { easy: 0, normal: 0, hard: 0, expert: 0, master: 0, append: 0 },
    };

    songs.forEach(song => {
        difficulties.forEach(diff => {
            if (song.levels[diff] !== null) {
                const result = resultMap.get(`${song.id}-${diff}`);
                if (result) {
                    if (result === 'full_perfect') summaryByDifficulty.P[diff]++;
                    if (result === 'full_combo' || result === 'full_perfect') summaryByDifficulty.F[diff]++;
                    if (result === 'clear' || result === 'full_combo' || result === 'full_perfect') summaryByDifficulty.C[diff]++;
                }
            }
        });
    });

    const totalSongsByDifficulty = { easy: 0, normal: 0, hard: 0, expert: 0, master: 0, append: 0 };
    songs.forEach(song => {
        difficulties.forEach(diff => {
            if (song.levels[diff] !== null) {
                totalSongsByDifficulty[diff]++;
            }
        });
    });

    const toggleTooltip = (type: 'general' | 'append') => {
        if (activeTooltip === type) {
            setActiveTooltip('none');
        } else {
            setActiveTooltip(type);
        }
    };

    // Close tooltip when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (activeTooltip === 'none') return;

            const target = event.target as HTMLElement;
            if (
                !target.closest('.info-tooltip') &&
                !target.closest('.info-icon') &&
                !target.closest('.append-info-icon')
            ) {
                setActiveTooltip('none');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [activeTooltip]);

    return (
        <div className="summary-container">
            {/* Header Info */}
            <div className="summary-section">
                <div className="list-item" style={{ minHeight: '60px' }}>
                    <div
                        className="list-item-avatar-placeholder"
                        style={profileImage ? { backgroundImage: `url(${profileImage})` } : {}}
                    ></div>
                    <div className="user-info-header">
                        <div className="list-item-title">{playerName}</div>
                        <div className="user-rank-container">
                            <div className="rank-label">Rank</div>
                            <div className="rank-value">{sekaiRank}</div>
                        </div>
                    </div>
                </div>
                <div className="divider"></div>
                <div className="list-item">
                    <div className="list-item-content">Player ID</div>
                    <div className="list-item-action">{playerId}</div>
                </div>
                <div className="divider"></div>
                <div className="list-item">
                    <div className="list-item-content">Registration at</div>
                    <div className="list-item-action">{registrationDate.replace('T', ' ').replace(/-/g, '/')}</div>
                </div>
                <div className="divider"></div>
                <div className="list-item">
                    <div className="list-item-content">Twitter</div>
                    <div className="list-item-action">
                        {twitterId ? `@ ${twitterId}` : '@'} <span style={{ marginLeft: '4px' }}>&gt;</span>
                    </div>
                </div>
                <div className="divider"></div>
            </div>

            <div className="spacer"></div>

            {/* Difficulty Breakdown */}
            <div className="summary-section">
                <div className="divider"></div>
                <div className="list-item header-row">
                    <div className="icon-placeholder"></div>
                    <div className="difficulty-headers">
                        {difficulties.map(diff => (
                            <div key={diff} className={`diff-header ${diff}`}>{diff}</div>
                        ))}
                    </div>
                </div>
                <div className="divider inset"></div>

                {['P', 'F', 'C'].map(rank => (
                    <React.Fragment key={rank}>
                        <div className="list-item">
                            <div className="rank-icon-container">
                                <div className={`rank-icon rank-${rank.toLowerCase()}`}>{rank}</div>
                            </div>
                            <div className="rank-counts">
                                {difficulties.map(diff => (
                                    <div key={diff} className="count-cell">
                                        {summaryByDifficulty[rank as 'P' | 'F' | 'C'][diff as keyof typeof summaryByDifficulty.P]}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="divider inset"></div>
                    </React.Fragment>
                ))}

                <div className="list-item">
                    <div className="rank-icon-container">
                        <div className="rank-icon all">All</div>
                    </div>
                    <div className="rank-counts">
                        {difficulties.map(diff => (
                            <div key={diff} className="count-cell">
                                {totalSongsByDifficulty[diff]}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="divider"></div>
            </div>

            <div className="spacer"></div>

            {/* Player R */}
            <div className="summary-section">
                <div className="divider"></div>
                <div className="list-item">
                    <div className="list-item-content">Player R</div>
                    <div className="list-item-action">
                        <div className="r-values-container">
                            <div>{totalR}</div>
                            <div className="append-r-value">{appendTotalR}</div>
                        </div>
                        <div className="icons-container">
                            <span
                                className="info-icon"
                                onClick={() => toggleTooltip('general')}
                                style={{ margin: 0 }} // Override margin-left
                            >i</span>
                            <span
                                className="append-info-icon"
                                onClick={() => toggleTooltip('append')}
                            >A</span>
                        </div>

                        {activeTooltip === 'general' && (
                            <div className="info-tooltip">
                                <p>Player R = Sum of the Music R in Best 39.</p>
                                <p>Music R = Rank (P / F / C) * Level+.</p>
                                <p>Example: Full Combo of Level 30.0 is: 7.5 * 30.0 = 225.</p>
                                <p>Rank: P = 8.0, F = 7.5, C = 5.0.</p>
                                <p>Level+: Estimated by P % and F %. The more players achieve All Perfect / Full Combo, the lower P / F Level+ adjusts. P / F / C Level+ are estimated separately.</p>
                            </div>
                        )}

                        {activeTooltip === 'append' && (
                            <div className="info-tooltip">
                                <p><strong>Append R</strong></p>
                                <p>Sum of the Music R in Best 13 Append * 3.</p>
                                <p>Calculated separately from the main Best 39.</p>
                            </div>
                        )}
                    </div>
                </div>
                <div className="divider"></div>
            </div>
        </div>
    );
};


export default Summary;
