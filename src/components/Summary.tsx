import React, { useState } from 'react';
import { type Song } from '../utils/api';
import { type MusicDifficultyStatus, type UserMusicResult } from '../utils/calculator';
import './Summary.css';

interface SummaryProps {
    best39: MusicDifficultyStatus[];
    userResults: UserMusicResult[];
    songs: Song[];
    totalR: number;
    sekaiRank: string;
    playerId: string;
    twitterId: string;
    playerName: string;
}

const Summary: React.FC<SummaryProps> = ({ best39, userResults, songs, totalR, sekaiRank, playerId, twitterId, playerName }) => {
    const [showInfo, setShowInfo] = useState(false);

    // Calculate summary data
    const difficulties = ['easy', 'normal', 'hard', 'expert', 'master', 'append'] as const;
    const summaryByDifficulty = {
        'P': { easy: 0, normal: 0, hard: 0, expert: 0, master: 0, append: 0 },
        'F': { easy: 0, normal: 0, hard: 0, expert: 0, master: 0, append: 0 },
        'C': { easy: 0, normal: 0, hard: 0, expert: 0, master: 0, append: 0 },
    };

    userResults.forEach(result => {
        const diff = result.musicDifficulty as keyof typeof summaryByDifficulty.P;
        if (diff in summaryByDifficulty.P) {
            if (result.playResult === 'full_perfect') summaryByDifficulty.P[diff]++;
            if (result.playResult === 'full_combo' || result.playResult === 'full_perfect') summaryByDifficulty.F[diff]++;
            if (result.playResult === 'clear' || result.playResult === 'full_combo' || result.playResult === 'full_perfect') summaryByDifficulty.C[diff]++;
        }
    });

    // Calculate total songs per difficulty
    const totalSongsByDifficulty = { easy: 0, normal: 0, hard: 0, expert: 0, master: 0, append: 0 };
    songs.forEach(song => {
        difficulties.forEach(diff => {
            if (song.levels[diff] !== null) {
                totalSongsByDifficulty[diff]++;
            }
        });
    });

    return (
        <div className="summary-container">
            {/* Header Info */}
            <div className="summary-section">
                <div className="list-item" style={{ minHeight: '60px' }}>
                    <div className="list-item-avatar-placeholder"></div>
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
                    <div className="list-item-action">2020/10/3 15:39:39</div>
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
                        {totalR}
                        <span
                            className="info-icon"
                            onClick={() => setShowInfo(!showInfo)}
                        >i</span>

                        {showInfo && (
                            <div className="info-tooltip">
                                <p>Player R = Sum of the Music R in Best 39.</p>
                                <p>Music R = Rank (P / F / C) * Level+.</p>
                                <p>Example: Full Combo of Level 30.0 is: 7.5 * 30.0 = 225.</p>
                                <p>Rank: P = 8.0, F = 7.5, C = 5.0.</p>
                                <p>Level+: Estimated by P % and F %. The more players achieve All Perfect / Full Combo, the lower P / F Level+ adjusts. P / F / C Level+ are estimated separately.</p>
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
