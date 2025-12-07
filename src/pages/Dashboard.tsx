import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { type Song } from '../utils/api';
import { type MusicDifficultyStatus, type UserMusicResult } from '../utils/calculator';
import Best39 from '../components/Best39';
import Summary from '../components/Summary';
import StatisticsChart from '../components/StatisticsChart';
import FloatingButton from '../components/FloatingButton';
import AssetImageSelector from '../components/AssetImageSelector';
import './ScoreInput.css'; // Reusing modal styles (partially)
import './Dashboard.css'; // Dedicated modal and dashboard styles

interface DashboardProps {
    songs: Song[];
    best39: MusicDifficultyStatus[];
    bestAppend: MusicDifficultyStatus[];
    userResults: UserMusicResult[];
    totalR: number;
    appendTotalR: number;
    loading: boolean;
    error: string | null;
    lastModified?: string | null;
    showUnreleased?: boolean;
    onToggleUnreleased?: (value: boolean) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ songs, best39, bestAppend, userResults, totalR, appendTotalR, loading, error, lastModified, showUnreleased = false, onToggleUnreleased }) => {
    // Profile State
    const [sekaiRank, setSekaiRank] = useState('399');
    const [playerId, setPlayerId] = useState('6393939393939393');
    const [twitterId, setTwitterId] = useState('');
    const [registrationDate, setRegistrationDate] = useState('2020-10-03T15:39:39');
    const [playerName, setPlayerName] = useState('셐붕이');
    const [profileImage, setProfileImage] = useState<string | null>('https://asset.rilaksekai.com/face/21/008_normal.webp');
    const [language, setLanguage] = useState<'ko' | 'jp'>('ko');
    const [displayDateType, setDisplayDateType] = useState<'registration' | 'lastModified'>('lastModified');
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showAssetSelector, setShowAssetSelector] = useState(false);
    const [isProfileLoaded, setIsProfileLoaded] = useState(false);
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
                setDisplayDateType(parsed.displayDateType || 'lastModified');
            } catch (e) {
                console.error("Failed to load profile", e);
            }
        }
        setIsProfileLoaded(true);
    }, []);

    // Auto-save profile whenever relevant state changes
    useEffect(() => {
        if (!isProfileLoaded) return;
        const profile = { sekaiRank, playerId, twitterId, registrationDate, playerName, language, profileImage, displayDateType };
        localStorage.setItem('userProfile', JSON.stringify(profile));
    }, [sekaiRank, playerId, twitterId, registrationDate, playerName, language, profileImage, displayDateType, isProfileLoaded]);

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
            setDisplayDateType('lastModified');
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

    const [isCapturing, setIsCapturing] = useState(false);
    const captureRef = useRef<HTMLDivElement>(null);

    const handleCapture = async () => {
        setIsCapturing(true);

        // Wait for render and ECharts initialization
        setTimeout(async () => {
            if (captureRef.current) {
                try {
                    const element = captureRef.current;

                    // Handle Images: Convert to Base64 to bypass CORS issues in html2canvas
                    const images = element.querySelectorAll('img');
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

                    const canvas = await html2canvas(element, {
                        backgroundColor: '#1e1e1e',
                        scale: 2,
                        useCORS: true,
                        allowTaint: true,
                        logging: false,
                        scrollX: 0,
                        scrollY: 0,
                        x: 0,
                        y: 0,
                        width: 800, // Adjusted to fit content (400px left + ~390px right)
                        windowWidth: 800
                    });

                    const link = document.createElement('a');
                    link.download = `sekai-force-dashboard-${new Date().getTime()}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                } catch (error) {
                    console.error('Capture failed:', error);
                    alert('이미지 저장 중 오류가 발생했습니다. (Error: ' + (error instanceof Error ? error.message : String(error)) + ')');
                } finally {
                    setIsCapturing(false);
                }
            } else {
                setIsCapturing(false);
            }
        }, 1000); // Give it 1s to render ECharts and layout
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
                            lastModified={lastModified}
                            displayDateType={displayDateType}
                        />
                    </div>

                    {/* Append Best 13 (Moved to Left Panel) */}
                    <div className="append-section-left">
                        <Best39
                            best39={best39}
                            bestAppend={bestAppend}
                            language={language}
                            totalR={totalR}
                            appendTotalR={appendTotalR}
                            variant="append"
                        />
                    </div>

                    <div className="chart-section">
                        <StatisticsChart
                            best39={best39}
                            userResults={userResults}
                            songs={songs}
                            chartType="line"
                        />
                    </div>
                </div >

                <div className="best39-section">
                    <Best39
                        best39={best39}
                        bestAppend={bestAppend}
                        language={language}
                        totalR={totalR}
                        appendTotalR={appendTotalR}
                        variant="main"
                    />
                </div>

            </div>

            <FloatingButton
                onEditProfile={() => setShowProfileModal(true)}
                onCapture={handleCapture}
            />

            {/* Profile Edit Modal */}
            {
                showProfileModal && (
                    <div className="dashboard-modal-overlay" onClick={() => setShowProfileModal(false)}>
                        <div className="dashboard-modal" onClick={e => e.stopPropagation()}>
                            <a
                                href="https://github.com/RilakKuma2/sekai-force"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="dashboard-github-link"
                                aria-label="GitHub Repository"
                            >
                                <svg height="24" viewBox="0 0 16 16" width="24" className="github-icon">
                                    <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
                                </svg>
                            </a>
                            <h2>프로필 설정</h2>
                            <div className="dashboard-profile-form">
                                <div className="dashboard-form-group">
                                    <label>곡명 표기 언어</label>
                                    <div className="dashboard-btn-group">
                                        <button
                                            className={`dashboard-btn-toggle ${language === 'ko' ? 'active' : ''}`}
                                            onClick={() => setLanguage('ko')}
                                        >
                                            한국어
                                        </button>
                                        <button
                                            className={`dashboard-btn-toggle ${language === 'jp' ? 'active' : ''}`}
                                            onClick={() => setLanguage('jp')}
                                        >
                                            日本語
                                        </button>
                                    </div>
                                </div>

                                <div className="dashboard-form-group">
                                    <label>프로필 이미지</label>
                                    <div className="dashboard-image-upload">
                                        <div
                                            className="dashboard-avatar-preview"
                                            style={{ backgroundImage: profileImage ? `url(${profileImage})` : 'none' }}
                                        ></div>
                                        <button
                                            className="dashboard-upload-btn"
                                            onClick={() => setShowAssetSelector(true)}
                                        >
                                            카드 일러스트 선택
                                        </button>
                                        <label htmlFor="profile-upload" className="dashboard-upload-btn">
                                            파일 업로드
                                        </label>
                                        <input
                                            id="profile-upload"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            style={{ display: 'none' }}
                                        />
                                    </div>
                                </div>

                                <div className="dashboard-form-group">
                                    <label>플레이어 이름</label>
                                    <input
                                        className="dashboard-input"
                                        type="text"
                                        value={playerName}
                                        onChange={(e) => setPlayerName(e.target.value)}
                                        placeholder="셐붕이"
                                    />
                                </div>

                                <div className="dashboard-form-group">
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', marginBottom: '8px' }}>랭크</label>
                                            <input
                                                className="dashboard-input"
                                                type="text"
                                                value={sekaiRank}
                                                onChange={(e) => setSekaiRank(e.target.value)}
                                                placeholder="399"
                                            />
                                        </div>
                                        <div style={{ flex: 2 }}>
                                            <label style={{ display: 'block', marginBottom: '8px' }}>플레이어 ID</label>
                                            <input
                                                className="dashboard-input"
                                                type="text"
                                                value={playerId}
                                                onChange={(e) => setPlayerId(e.target.value)}
                                                placeholder="ID 입력"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="dashboard-form-group">
                                    <label>날짜 표시 설정</label>
                                    <div className="dashboard-btn-group" style={{ marginBottom: '8px' }}>
                                        <button
                                            className={`dashboard-btn-toggle ${displayDateType === 'registration' ? 'active' : ''}`}
                                            onClick={() => setDisplayDateType('registration')}
                                        >
                                            가입일 (Registration)
                                        </button>
                                        <button
                                            className={`dashboard-btn-toggle ${displayDateType === 'lastModified' ? 'active' : ''}`}
                                            onClick={() => setDisplayDateType('lastModified')}
                                        >
                                            최종 갱신 (Updated)
                                        </button>
                                    </div>
                                    <div className="dashboard-date-group" style={{
                                        opacity: displayDateType === 'lastModified' ? 0.5 : 1,
                                        pointerEvents: displayDateType === 'lastModified' ? 'none' : 'auto'
                                    }}>
                                        <input
                                            className="dashboard-input"
                                            type="date"
                                            value={registrationDate.split('T')[0]}
                                            onChange={(e) => {
                                                const time = registrationDate.split('T')[1] || '00:00:00';
                                                setRegistrationDate(`${e.target.value}T${time}`);
                                            }}
                                        />
                                        <input
                                            className="dashboard-input"
                                            type="time"
                                            step="1"
                                            value={registrationDate.split('T')[1]}
                                            onChange={(e) => {
                                                const date = registrationDate.split('T')[0];
                                                setRegistrationDate(`${date}T${e.target.value}`);
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="dashboard-form-group">
                                    <label>미출시곡 설정</label>
                                    <div className="dashboard-checkbox-group" onClick={() => onToggleUnreleased && onToggleUnreleased(!showUnreleased)}>
                                        <input
                                            type="checkbox"
                                            checked={showUnreleased}
                                            onChange={(e) => onToggleUnreleased && onToggleUnreleased(e.target.checked)}
                                        />
                                        <span className="dashboard-checkbox-custom"></span>
                                        <span className="dashboard-checkbox-label">수록 예정 곡 표시</span>
                                    </div>
                                </div>

                                <div className="dashboard-form-group">
                                    <label>Twitter ID</label>
                                    <input
                                        className="dashboard-input"
                                        type="text"
                                        value={twitterId}
                                        onChange={(e) => setTwitterId(e.target.value)}
                                        placeholder="@ 제외하고 입력"
                                    />
                                </div>


                            </div>
                            <div className="dashboard-actions">
                                <button className="dashboard-btn cancel" onClick={handleResetProfile}>초기화</button>
                                <button className="dashboard-btn confirm" onClick={() => setShowProfileModal(false)}>닫기</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Asset Image Selector Modal */}
            {
                showAssetSelector && (
                    <AssetImageSelector
                        onSelect={(url) => {
                            setProfileImage(url);
                            setShowAssetSelector(false);
                        }}
                        onClose={() => setShowAssetSelector(false)}
                    />
                )
            }

            {/* Off-screen Capture Container */}
            {
                isCapturing && (
                    <div
                        ref={captureRef}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            zIndex: -9999,
                            width: '800px', // Adjusted to fit content
                            minWidth: '800px',
                            backgroundColor: '#1e1e1e',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            padding: 0,
                            margin: 0
                        }}
                    >
                        <div className="dashboard-layout" style={{ width: '100%', maxWidth: 'none', margin: 0, display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
                            <div className="left-panel-wrapper" style={{ width: '400px', minWidth: '400px', flexShrink: 0, borderRight: '1px solid #333', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                                <div className="profile-section" style={{ width: '100%', position: 'relative', display: 'block', order: 1 }}>
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
                                        lastModified={lastModified}
                                        displayDateType={displayDateType}
                                    />
                                </div>

                                {/* Append Best 13 (Moved to Left Panel) */}
                                <div className="append-section-left" style={{ order: 2 }}>
                                    <Best39
                                        best39={best39}
                                        bestAppend={bestAppend}
                                        language={language}
                                        totalR={totalR}
                                        appendTotalR={appendTotalR}
                                        forcePcLayout={true}
                                        variant="append"
                                    />
                                    <StatisticsChart
                                        best39={best39}
                                        userResults={userResults}
                                        songs={songs}
                                        forcePcLayout={true}
                                        chartType="line"
                                        displayMode="standard"
                                    />
                                    <StatisticsChart
                                        best39={best39}
                                        userResults={userResults}
                                        songs={songs}
                                        forcePcLayout={true}
                                        chartType="line"
                                        displayMode="append"
                                        hideLegend={true}
                                    />
                                </div>
                            </div>

                            <div className="best39-section" style={{ flexGrow: 1, width: 'auto', maxWidth: 'none' }}>
                                <Best39
                                    best39={best39}
                                    bestAppend={bestAppend}
                                    language={language}
                                    totalR={totalR}
                                    appendTotalR={appendTotalR}
                                    forcePcLayout={true}
                                    variant="main"
                                />
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Dashboard;
