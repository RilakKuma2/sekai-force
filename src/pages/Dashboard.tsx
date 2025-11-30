import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { type Song } from '../utils/api';
import { type MusicDifficultyStatus, type UserMusicResult } from '../utils/calculator';
import Best39 from '../components/Best39';
import Summary from '../components/Summary';
import StatisticsChart from '../components/StatisticsChart';
import FloatingButton from '../components/FloatingButton';
import './ScoreInput.css'; // Reusing modal styles

interface DashboardProps {
    songs: Song[];
    best39: MusicDifficultyStatus[];
    userResults: UserMusicResult[];
    totalR: number;
    loading: boolean;
    error: string | null;
}

const Dashboard: React.FC<DashboardProps> = ({ songs, best39, userResults, totalR, loading, error }) => {
    // Profile State
    const [sekaiRank, setSekaiRank] = useState('399');
    const [playerId, setPlayerId] = useState('6393939393939393');
    const [twitterId, setTwitterId] = useState('');
    const [registrationDate, setRegistrationDate] = useState('2020-10-03T15:39:39');
    const [playerName, setPlayerName] = useState('셐붕이');
    const [language, setLanguage] = useState<'ko' | 'jp'>('ko');
    const [showProfileModal, setShowProfileModal] = useState(false);
    const dashboardRef = useRef<HTMLDivElement>(null);

    // Load profile from local storage
    useEffect(() => {
        const savedProfile = localStorage.getItem('userProfile');
        if (savedProfile) {
            try {
                const parsed = JSON.parse(savedProfile);
                setSekaiRank(parsed.sekaiRank || '399');
                setPlayerId(parsed.playerId || '6393939393939393');
                setTwitterId(parsed.twitterId || '');
                setRegistrationDate(parsed.registrationDate || '2020-10-03T15:39:39');
                setPlayerName(parsed.playerName || '셐붕이');
                setLanguage(parsed.language || 'ko');
            } catch (e) {
                console.error("Failed to load profile", e);
            }
        }
    }, []);

    const handleSaveProfile = () => {
        const profile = { sekaiRank, playerId, twitterId, registrationDate, playerName, language };
        localStorage.setItem('userProfile', JSON.stringify(profile));
        setShowProfileModal(false);
    };

    const handleResetProfile = () => {
        if (window.confirm('프로필을 초기화하시겠습니까?')) {
            setSekaiRank('399');
            setPlayerId('6393939393939393');
            setTwitterId('');
            setRegistrationDate('2020-10-03T15:39:39');
            setPlayerName('셐붕이');
            setLanguage('ko');
            localStorage.removeItem('userProfile');
            setShowProfileModal(false);
        }
    };


    const handleCapture = async () => {
        if (dashboardRef.current) {
            try {
                // Clone the dashboard element
                const original = dashboardRef.current;
                const clone = original.cloneNode(true) as HTMLElement;

                // Copy Canvas Content (Critical for ECharts)
                const originalCanvases = original.querySelectorAll('canvas');
                const cloneCanvases = clone.querySelectorAll('canvas');
                originalCanvases.forEach((sourceCanvas, index) => {
                    const destCanvas = cloneCanvases[index];
                    if (destCanvas) {
                        const context = destCanvas.getContext('2d');
                        if (context) {
                            destCanvas.width = sourceCanvas.width;
                            destCanvas.height = sourceCanvas.height;
                            context.drawImage(sourceCanvas, 0, 0);
                        }
                    }
                });

                // Force Desktop Styles on Clone
                clone.style.position = 'fixed';
                clone.style.top = '0';
                clone.style.left = '0';
                clone.style.zIndex = '-9999';

                clone.style.width = 'fit-content';
                clone.style.minWidth = 'auto';
                clone.style.maxWidth = 'none';
                clone.style.height = 'auto';
                clone.style.minHeight = '800px';

                clone.style.display = 'flex';
                clone.style.flexDirection = 'row';
                clone.style.alignItems = 'flex-start';
                clone.style.justifyContent = 'flex-start';
                clone.style.gap = '0';

                clone.style.backgroundColor = '#1e1e1e';
                clone.style.border = '1px solid #333';
                clone.style.borderRadius = '8px';
                clone.style.padding = '0';
                clone.style.margin = '0';
                clone.style.transform = 'none';

                // Force Left Panel Styles
                const leftPanel = clone.querySelector('.left-panel-wrapper') as HTMLElement;
                if (leftPanel) {
                    leftPanel.style.width = '360px';
                    leftPanel.style.minWidth = '360px';
                    leftPanel.style.maxWidth = '360px';
                    leftPanel.style.flexShrink = '0';
                    leftPanel.style.borderRight = '1px solid #333';
                    leftPanel.style.borderBottom = 'none';
                    leftPanel.style.display = 'flex';
                    leftPanel.style.flexDirection = 'column';
                    leftPanel.style.margin = '0';
                    leftPanel.style.padding = '0';
                    leftPanel.style.overflow = 'hidden'; // Prevent chart overflow
                }

                // Force Best39 Section Styles
                const best39Section = clone.querySelector('.best39-section') as HTMLElement;
                if (best39Section) {
                    best39Section.style.flexGrow = '1';
                    best39Section.style.width = 'auto';
                    best39Section.style.maxWidth = 'none';
                    best39Section.style.margin = '0';
                    best39Section.style.padding = '0';
                }

                // Append to body to render (hidden)
                document.body.appendChild(clone);

                // Handle Images: Convert to Base64 to bypass CORS issues in html2canvas
                const images = clone.querySelectorAll('img');
                const imagePromises = Array.from(images).map(async (img) => {
                    if (img.src.includes('asset.rilaksekai.com')) {
                        return new Promise<void>((resolve) => {
                            const tempImg = new Image();
                            tempImg.crossOrigin = 'Anonymous';
                            // Add timestamp to bypass cache and force CORS request
                            tempImg.src = img.src + '?t=' + new Date().getTime();

                            tempImg.onload = () => {
                                try {
                                    const canvas = document.createElement('canvas');
                                    canvas.width = tempImg.width;
                                    canvas.height = tempImg.height;
                                    const ctx = canvas.getContext('2d');
                                    if (ctx) {
                                        ctx.drawImage(tempImg, 0, 0);
                                        img.src = canvas.toDataURL('image/jpeg');
                                    }
                                } catch (e) {
                                    console.warn('Failed to convert image to base64 via canvas:', img.src, e);
                                }
                                resolve();
                            };

                            tempImg.onerror = () => {
                                console.warn('Failed to load image for base64 conversion:', img.src);
                                resolve();
                            };
                        });
                    }
                    return Promise.resolve();
                });

                // Wait for all image conversions
                await Promise.all(imagePromises);

                // Wait for the new base64 images to render
                await new Promise(resolve => setTimeout(resolve, 500));

                const canvas = await html2canvas(clone, {
                    backgroundColor: '#1e1e1e',
                    scale: 2,
                    useCORS: true, // Still keep this true just in case
                    allowTaint: true,
                    logging: false,
                    scrollX: 0,
                    scrollY: 0,
                    x: 0,
                    y: 0
                });

                // Remove clone
                document.body.removeChild(clone);

                const link = document.createElement('a');
                link.download = `sekai-force-dashboard-${new Date().getTime()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            } catch (error) {
                console.error('Capture failed:', error);
                alert('이미지 저장 중 오류가 발생했습니다. (Error: ' + (error instanceof Error ? error.message : String(error)) + ')');

                // Ensure clone is removed if it exists
                const existingClone = document.body.lastElementChild;
                if (existingClone && (existingClone as HTMLElement).style.zIndex === '-9999') {
                    document.body.removeChild(existingClone);
                }
            }
        }
    };

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <div className="app-container">
            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {/* Flattened Layout for Mobile Reordering */}
            <div className="dashboard-layout" ref={dashboardRef}>
                <div className="left-panel-wrapper">
                    <div className="profile-section">
                        <Summary
                            best39={best39}
                            userResults={userResults}
                            songs={songs}
                            totalR={totalR}
                            sekaiRank={sekaiRank}
                            playerId={playerId}
                            twitterId={twitterId}
                            registrationDate={registrationDate}
                            playerName={playerName}
                        />
                    </div>

                    <div className="chart-section">
                        <StatisticsChart best39={best39} userResults={userResults} songs={songs} />
                    </div>
                </div >

                <div className="best39-section">
                    <Best39 best39={best39} language={language} />
                </div>

            </div>

            <FloatingButton
                onEditProfile={() => setShowProfileModal(true)}
                onCapture={handleCapture}
            />

            {/* Profile Edit Modal */}
            {
                showProfileModal && (
                    <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
                        <div className="preview-modal" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
                            <h2>프로필 수정</h2>
                            <div className="profile-edit-form">
                                <div className="form-group">
                                    <label>곡명 표기 언어 설정</label>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            className={`preview-btn ${language === 'ko' ? 'confirm' : 'cancel'}`}
                                            onClick={() => setLanguage('ko')}
                                            style={{ flex: 1 }}
                                        >
                                            한국어
                                        </button>
                                        <button
                                            className={`preview-btn ${language === 'jp' ? 'confirm' : 'cancel'}`}
                                            onClick={() => setLanguage('jp')}
                                            style={{ flex: 1 }}
                                        >
                                            日本語
                                        </button>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>플레이어 이름</label>
                                    <input
                                        type="text"
                                        value={playerName}
                                        onChange={(e) => setPlayerName(e.target.value)}
                                        placeholder="셐붕이"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>플레이어 랭크</label>
                                    <input
                                        type="text"
                                        value={sekaiRank}
                                        onChange={(e) => setSekaiRank(e.target.value)}
                                        placeholder="399"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>플레이어 ID</label>
                                    <input
                                        type="text"
                                        value={playerId}
                                        onChange={(e) => setPlayerId(e.target.value)}
                                        placeholder="ID 입력"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Registration at</label>
                                    <div className="date-time-group" style={{ display: 'flex', gap: '10px' }}>
                                        <input
                                            type="date"
                                            value={registrationDate.split('T')[0]}
                                            onChange={(e) => {
                                                const time = registrationDate.split('T')[1] || '00:00:00';
                                                setRegistrationDate(`${e.target.value}T${time}`);
                                            }}
                                            style={{ flex: 1 }}
                                        />
                                        <input
                                            type="time"
                                            step="1"
                                            value={registrationDate.split('T')[1]}
                                            onChange={(e) => {
                                                const date = registrationDate.split('T')[0];
                                                setRegistrationDate(`${date}T${e.target.value}`);
                                            }}
                                            style={{ flex: 1 }}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Twitter ID</label>
                                    <input
                                        type="text"
                                        value={twitterId}
                                        onChange={(e) => setTwitterId(e.target.value)}
                                        placeholder="@ 제외하고 입력"
                                    />
                                </div>
                            </div>
                            <div className="preview-actions">
                                <button className="preview-btn cancel" onClick={handleResetProfile} style={{ backgroundColor: '#d32f2f' }}>초기화</button>
                                <div style={{ flex: 1 }}></div>
                                <button className="preview-btn cancel" onClick={() => setShowProfileModal(false)}>취소</button>
                                <button className="preview-btn confirm" onClick={handleSaveProfile}>저장</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Dashboard;
