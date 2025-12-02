import React from 'react';
import { type MusicDifficultyStatus } from '../utils/calculator';
import './Best39.css';

interface Best39Props {
    best39: MusicDifficultyStatus[];
    language: 'ko' | 'jp';
}

const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
        case 'easy': return '#81C784';
        case 'normal': return '#64B5F6';
        case 'hard': return '#FFB74D';
        case 'expert': return '#E57373';
        case 'master': return '#BA68C8';
        case 'append': return null; // Handled specially with gradient
        default: return '#BA68C8';
    }
};





const formatLevel = (playLevel: number, baseLevel: number) => {
    // Logic:
    // If constant (playLevel) is >= baseLevel + 0.5 -> baseLevel + "+"
    // If constant (playLevel) is <= baseLevel - 0.3 -> baseLevel + "-"
    // Else -> baseLevel

    // Ensure numbers
    const pLevel = Number(playLevel);
    const bLevel = Number(baseLevel);

    // Use a small epsilon for float comparison if needed, but direct comparison usually works for these ranges
    if (pLevel >= bLevel + 0.5) {
        return <>{bLevel}<sup>+</sup></>;
    } else if (pLevel <= bLevel - 0.3) {
        return <>{bLevel}<sup>-</sup></>;
    } else {
        return <>{bLevel}</>;
    }
};

const Best39: React.FC<Best39Props> = ({ best39, language }) => {
    // Always render 39 slots (13 rows * 3 columns)
    const rows = 13;

    return (
        <div className="best39-list">
            <div className="divider"></div>
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <React.Fragment key={rowIndex}>
                    {rowIndex > 0 && <div className="divider"></div>}
                    <div className="d-flex">
                        {Array.from({ length: 3 }).map((_, colIndex) => {
                            const index = rowIndex * 3 + colIndex;
                            const item = best39[index];

                            if (!item) {
                                return (
                                    <React.Fragment key={colIndex}>
                                        {colIndex > 0 && <div className="vertical-divider"></div>}
                                        <div className="best39-cell"></div>
                                    </React.Fragment>
                                );
                            }

                            const diffColor = getDifficultyColor(item.musicDifficulty);
                            const isAppend = item.musicDifficulty === 'append';

                            const rankStyle: React.CSSProperties = {};

                            if (item.rank === 'P') {
                                rankStyle.border = '1px solid #FFFFFF';
                                rankStyle.color = '#FFFFFF';
                                rankStyle.backgroundImage = 'linear-gradient(to bottom, #F06292, #64B5F6)';
                                rankStyle.fontWeight = 900;
                            } else if (item.rank === 'F') {
                                rankStyle.border = '1px solid #F06292';
                                rankStyle.color = '#00000099';
                                rankStyle.backgroundColor = '#F06292';
                            } else { // C or others
                                rankStyle.border = `1px solid ${diffColor || '#AB47BC'}`; // Fallback for append border in rank if needed, though usually rank has its own color
                                rankStyle.color = '#FFFFFF99';
                                // background is transparent/null
                            }

                            // Define level badge style
                            const levelBadgeStyle: React.CSSProperties = {
                                color: isAppend ? '#000000' : '#222222'
                            };

                            if (isAppend) {
                                levelBadgeStyle.backgroundImage = 'linear-gradient(to bottom right, #ad92fd, #fe7bde)';
                                levelBadgeStyle.border = '1px solid transparent'; // Keep border width for alignment
                            } else {
                                levelBadgeStyle.backgroundColor = diffColor!;
                                levelBadgeStyle.border = `1px solid ${diffColor}`;
                            }

                            return (
                                <React.Fragment key={colIndex}>
                                    {colIndex > 0 && <div className="vertical-divider"></div>}
                                    <div className="best39-cell">
                                        <div className="best39-item-container">
                                            {/* First Row: Avatar + Rank + Badge */}
                                            <div className="list-item first-row">
                                                <div className="list-item-avatar">
                                                    <img
                                                        src={`https://asset.rilaksekai.com/cover/${item.musicId}.webp`}
                                                        alt={item.title}
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAMElEQVR42u3QwQkAMAwDMYv336j/4CI40Ncg8yI58928/wAAAAAAAAAAAAAAAIBjA8lZAgF/27YAAAAASUVORK5CYII=';
                                                        }}
                                                    />
                                                </div>
                                                <div className="list-item-content">
                                                    <div className="list-item-title">
                                                        <span># {index + 1}</span>
                                                    </div>
                                                    <div className="list-item-subtitle">
                                                        <div className="difficulty-status">
                                                            <span
                                                                className="play-level"
                                                                style={levelBadgeStyle}
                                                            >
                                                                {formatLevel(item.playLevel, item.baseLevel)}
                                                            </span>
                                                            <span className="rank-badge" style={rankStyle}>
                                                                {item.rank}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Second Row: Title + Score Details */}
                                            <div className="list-item second-row">
                                                <div className="list-item-content">
                                                    <div className="list-item-title song-title">
                                                        {language === 'ko' ? (item.title_ko || item.title) : (item.title_jp || item.title)}
                                                    </div>
                                                    <div className="list-item-action-text">
                                                        <span className="score-detail">
                                                            {Number(item.playLevel).toFixed(1)}{item.isExact ? '' : '?'} → {Math.round(item.r)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </React.Fragment>
            ))}
            <div className="divider"></div>
        </div>
    );
};

export default Best39;
