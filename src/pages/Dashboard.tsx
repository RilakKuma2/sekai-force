import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { type Song } from '../utils/api';
import { type MusicDifficultyStatus, type UserMusicResult } from '../utils/calculator';
import Best39 from '../components/Best39';
import Summary from '../components/Summary';
import StatisticsChart from '../components/StatisticsChart';
import FloatingButton from '../components/FloatingButton';
import AssetImageSelector from '../components/AssetImageSelector';
import './ScoreInput.css'; // Reusing modal styles

interface DashboardProps {
    songs: Song[];
    best39: MusicDifficultyStatus[];
    bestAppend: MusicDifficultyStatus[];
    userResults: UserMusicResult[];
    totalR: number;
    appendTotalR: number;
    loading: boolean;
    error: string | null;
}

const Dashboard: React.FC<DashboardProps> = ({ songs, best39, bestAppend, userResults, totalR, appendTotalR, loading, error }) => {
    // Profile State
    const [sekaiRank, setSekaiRank] = useState('399');
    const [playerId, setPlayerId] = useState('6393939393939393');
    const [twitterId, setTwitterId] = useState('');
    const [registrationDate, setRegistrationDate] = useState('2020-10-03T15:39:39');
    const [playerName, setPlayerName] = useState('셐붕이');
    const [profileImage, setProfileImage] = useState<string | null>('https://asset.rilaksekai.com/face/21/008_normal.webp');
    const [language, setLanguage] = useState<'ko' | 'jp'>('ko');
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showAssetSelector, setShowAssetSelector] = useState(false);
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
                setProfileImage(parsed.profileImage || 'https://asset.rilaksekai.com/face/21/008_normal.webp');
                setLanguage(parsed.language || 'ko');
            } catch (e) {
                console.error("Failed to load profile", e);
            }
        }
    }, []);

    // Auto-save profile whenever relevant state changes
    useEffect(() => {
        const profile = { sekaiRank, playerId, twitterId, registrationDate, playerName, language, profileImage };
        localStorage.setItem('userProfile', JSON.stringify(profile));
    }, [sekaiRank, playerId, twitterId, registrationDate, playerName, language, profileImage]);

    // Removed manual handleSaveProfile as it's now auto-saved

    const handleResetProfile = () => {
        if (window.confirm('프로필을 초기화하시겠습니까?')) {
            setSekaiRank('399');
            setPlayerId('6393939393939393');
            setTwitterId('');
            setRegistrationDate('2020-10-03T15:39:39');
            setPlayerName('셐붕이');
            setProfileImage('https://asset.rilaksekai.com/face/21/008_normal.webp');
            setLanguage('ko');
            localStorage.removeItem('userProfile');
            setShowProfileModal(false);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCapture = async () => {
        if (dashboardRef.current) {
            try {
                // Clone the dashboard element
                const original = dashboardRef.current;
                const clone = original.cloneNode(true) as HTMLElement;

                // Add capture-mode class to the clone
                clone.classList.add('capture-mode');

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

                            // Force canvas to fill the container (which is forced to 400px)
                            // This scales up the mobile-rendered chart to fit the PC layout
                            destCanvas.style.width = '100%';
                            destCanvas.style.height = '100%';

                            // Also force the parent element (ECharts container) to 100%
                            if (destCanvas.parentElement) {
                                destCanvas.parentElement.style.width = '100%';
                                destCanvas.parentElement.style.height = '100%';
                            }
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
                    // Force PC width (400px) regardless of current device width
                    // This ensures "PC Layout Capture" works on mobile
                    const pcPanelWidth = '400px';
                    leftPanel.style.width = pcPanelWidth;
                    leftPanel.style.minWidth = pcPanelWidth;
                    leftPanel.style.maxWidth = pcPanelWidth;
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
                            appendTotalR={appendTotalR}
                            sekaiRank={sekaiRank}
                            playerId={playerId}
                            twitterId={twitterId}
                            registrationDate={registrationDate}
                            playerName={playerName}
                            profileImage={profileImage}
                        />
                    </div>

                    <div className="chart-section">
                        <StatisticsChart best39={best39} userResults={userResults} songs={songs} />
                    </div>
                </div >

                <div className="best39-section">
                    <Best39 best39={best39} bestAppend={bestAppend} language={language} />
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
                        <div className="preview-modal" style={{ maxWidth: '400px', paddingTop: '15px' }} onClick={e => e.stopPropagation()}>
                            <div className="profile-edit-form">
                                <div className="form-group">
                                    <label>곡명 표기 언어 설정</label>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            className={`preview-btn ${language === 'ko' ? 'confirm' : 'cancel'}`}
                                            onClick={() => setLanguage('ko')}
                                            style={{ flex: 1, fontSize: '0.8rem', padding: '6px 0' }}
                                        >
                                            한국어
                                        </button>
                                        <button
                                            className={`preview-btn ${language === 'jp' ? 'confirm' : 'cancel'}`}
                                            onClick={() => setLanguage('jp')}
                                            style={{ flex: 1, fontSize: '0.8rem', padding: '6px 0' }}
                                        >
                                            日本語
                                        </button>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>프로필 이미지</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{
                                            width: '50px',
                                            height: '50px',
                                            borderRadius: '50%',
                                            backgroundColor: '#333',
                                            backgroundImage: profileImage ? `url(${profileImage})` : 'none',
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            border: '1px solid #444',
                                            flexShrink: 0 // Prevent oval shape
                                        }}></div>
                                        <button
                                            className="preview-btn"
                                            style={{
                                                width: 'auto',
                                                height: '32px',
                                                backgroundColor: '#4b5563',
                                                color: 'white',
                                                whiteSpace: 'nowrap',
                                                padding: '0 12px',
                                                fontSize: '0.8rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxSizing: 'border-box',
                                                border: 'none',
                                                lineHeight: '1'
                                            }}
                                            onClick={() => setShowAssetSelector(true)}
                                        >
                                            카드 일러 선택
                                        </button>
                                        <label
                                            htmlFor="profile-image-upload"
                                            className="preview-btn"
                                            style={{
                                                width: 'auto',
                                                height: '32px',
                                                backgroundColor: '#333',
                                                color: '#ccc',
                                                whiteSpace: 'nowrap',
                                                padding: '0 12px',
                                                textAlign: 'center',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem',
                                                border: '1px solid #555',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxSizing: 'border-box',
                                                lineHeight: '2.5',
                                                flex: 1
                                            }}
                                        >
                                            파일 업로드
                                        </label>
                                        <input
                                            id="profile-image-upload"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            style={{ display: 'none' }}
                                        />
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
                                <button className="preview-btn confirm" onClick={() => setShowProfileModal(false)}>닫기</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Asset Image Selector Modal */}
            {showAssetSelector && (
                <AssetImageSelector
                    onSelect={(url) => {
                        setProfileImage(url);
                        setShowAssetSelector(false);
                    }}
                    onClose={() => setShowAssetSelector(false)}
                />
            )}
        </div >
    );
};

export default Dashboard;
