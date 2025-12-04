import React from 'react';
import { type MusicDifficultyStatus } from '../utils/calculator';
import './Best39.css';
import './Summary.css'; // Added this import at the top

interface Best39Props {
    best39: MusicDifficultyStatus[];
    bestAppend: MusicDifficultyStatus[];
    language: 'ko' | 'jp';
    totalR: number;
    appendTotalR: number;
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
    const pLevel = Number(playLevel);
    const bLevel = Number(baseLevel);

    if (pLevel >= bLevel + 0.5) {
        return <>{bLevel}<sup>+</sup></>;
    } else if (pLevel <= bLevel - 0.3) {
        return <>{bLevel}<sup>-</sup></>;
    } else {
        return <>{bLevel}</>;
    }
};

const Best39: React.FC<Best39Props> = ({ best39, bestAppend, language, appendTotalR }) => {
    const rows = 13;
    const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 450);

    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 450);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [activeTooltip, setActiveTooltip] = React.useState<'none' | 'append'>('none');

    const toggleTooltip = (type: 'append') => {
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

    const renderCell = (item: MusicDifficultyStatus | undefined, index: number, isAppend: boolean) => {
        if (!item) {
            return (
                <div className="best39-cell">
                    <div className="best39-item-container">
                        <div className="list-item first-row">
                            <div className="list-item-avatar" style={{ backgroundColor: 'transparent' }}></div>
                            <div className="list-item-content">
                                <div className="list-item-title" style={{ color: '#555' }}>
                                    <span></span>
                                </div>
                                <div className="list-item-subtitle">
                                    <div className="difficulty-status" style={{ height: '16px' }}></div>
                                </div>
                            </div>
                        </div>
                        <div className="list-item second-row">
                            <div className="list-item-content">
                                <div className="list-item-title song-title">&nbsp;</div>
                                <div className="list-item-action-text">&nbsp;</div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        const diffColor = getDifficultyColor(item.musicDifficulty);
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
            rankStyle.border = `1px solid ${diffColor || '#AB47BC'}`;
            rankStyle.color = '#FFFFFF99';
        }

        const levelBadgeStyle: React.CSSProperties = {
            color: isAppend ? '#000000' : '#222222'
        };

        if (isAppend) {
            levelBadgeStyle.backgroundImage = 'linear-gradient(to bottom right, #ab94fe, #fe7bde)';
            levelBadgeStyle.border = '0.1px solid #fff';
        } else {
            levelBadgeStyle.backgroundColor = diffColor!;
            levelBadgeStyle.border = `1px solid ${diffColor}`;
        }

        return (
            <div className="best39-cell">
                <div className="best39-item-container">
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
                                    <span className="play-level" style={levelBadgeStyle}>
                                        {formatLevel(item.playLevel, item.baseLevel)}
                                    </span>
                                    <span className="rank-badge" style={rankStyle}>
                                        {item.rank}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
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
        );
    };

    if (isMobile) {
        // Mobile Layout: Main (3 cols) -> Scores -> Append (3 cols)
        const mainRows = 13;
        // const appendRows = Math.ceil(bestAppend.length / 3); // Should be 5 rows for 13 items

        return (
            <div className="best39-list mobile-layout" style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Main Best 39 Section */}
                <div className="section-main-mobile">
                    <div className="divider"></div>
                    {Array.from({ length: mainRows }).map((_, rowIndex) => (
                        <React.Fragment key={rowIndex}>
                            {rowIndex > 0 && <div className="divider"></div>}
                            <div className="d-flex">
                                {Array.from({ length: 3 }).map((_, colIndex) => (
                                    <React.Fragment key={colIndex}>
                                        {colIndex > 0 && <div className="vertical-divider"></div>}
                                        {renderCell(best39[rowIndex * 3 + colIndex], rowIndex * 3 + colIndex, false)}
                                    </React.Fragment>
                                ))}
                            </div>
                        </React.Fragment>
                    ))}
                    <div className="divider"></div>
                </div>

                {/* Score Summary Section (Reusing Summary Component Styles) */}
                <div className="mobile-score-summary summary-section" style={{ padding: 0, margin: 0 }}>
                    <div className="divider"></div>
                    <div className="list-item">
                        <div className="list-item-content">Append R</div>
                        <div className="list-item-action">
                            <div className="r-values-container">
                                <div className="append-r-value">{Math.floor(appendTotalR)}</div>
                            </div>
                            <div className="icons-container">
                                <span
                                    className="append-info-icon"
                                    onClick={() => toggleTooltip('append')}
                                >A</span>
                            </div>
                            {activeTooltip === 'append' && (
                                <div className="info-tooltip" style={{ top: '30px', right: '10px' }}>
                                    <p><strong>Append R</strong></p>
                                    <p>Sum of the Music R in Best 13 Append * 3.</p>
                                    <p>Calculated separately from the main Best 39.</p>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Removed bottom divider to merge with table */}
                </div>

                {/* Append Best 13 Section (Grid of 3) */}
                <div className="section-append-mobile">
                    <div className="divider"></div>
                    {Array.from({ length: 5 }).map((_, rowIndex) => ( // 5 rows for 13 items
                        <React.Fragment key={rowIndex}>
                            {rowIndex > 0 && <div className="divider"></div>}
                            <div className="d-flex">
                                {Array.from({ length: 3 }).map((_, colIndex) => {
                                    const index = rowIndex * 3 + colIndex;
                                    const item = bestAppend[index];
                                    return (
                                        <React.Fragment key={colIndex}>
                                            {colIndex > 0 && <div className="vertical-divider"></div>}
                                            {index < 13 ? renderCell(item, index, true) : <div className="best39-cell" style={{ backgroundColor: '#2a2a2a' }}></div>}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </React.Fragment>
                    ))}
                    <div className="divider"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="best39-list" style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch' }}>
            {/* Main Best 39 Section */}
            <div className="section-main">
                <div className="divider"></div>
                {Array.from({ length: rows }).map((_, rowIndex) => (
                    <React.Fragment key={rowIndex}>
                        {rowIndex > 0 && <div className="divider"></div>}
                        <div className="d-flex">
                            {Array.from({ length: 3 }).map((_, colIndex) => (
                                <React.Fragment key={colIndex}>
                                    {colIndex > 0 && <div className="vertical-divider"></div>}
                                    {renderCell(best39[rowIndex * 3 + colIndex], rowIndex * 3 + colIndex, false)}
                                </React.Fragment>
                            ))}
                        </div>
                    </React.Fragment>
                ))}
                <div className="divider"></div>
            </div>

            {/* Thick Divider */}
            <div className="vertical-divider thick"></div>

            {/* Append Section */}
            <div className="section-append">
                <div className="divider"></div>
                {Array.from({ length: rows }).map((_, rowIndex) => (
                    <React.Fragment key={rowIndex}>
                        {rowIndex > 0 && <div className="divider"></div>}
                        <div className="d-flex">
                            {renderCell(bestAppend[rowIndex], rowIndex, true)}
                        </div>
                    </React.Fragment>
                ))}
                <div className="divider"></div>
            </div>
        </div>
    );
};

export default Best39;
