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
    const [playerName, setPlayerName] = useState('셐붕이');
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
                setPlayerName(parsed.playerName || '셐붕이');
            } catch (e) {
                console.error("Failed to load profile", e);
            }
        }
    }, []);

    const handleSaveProfile = () => {
        const profile = { sekaiRank, playerId, twitterId, playerName };
        localStorage.setItem('userProfile', JSON.stringify(profile));
        setShowProfileModal(false);
    };

    const handleResetProfile = () => {
        if (window.confirm('프로필을 초기화하시겠습니까?')) {
            setSekaiRank('399');
            setPlayerId('6393939393939393');
            setTwitterId('');
            setPlayerName('셐붕이');
            localStorage.removeItem('userProfile');
            setShowProfileModal(false);
        }
    };

    const handleCapture = async () => {
        if (dashboardRef.current) {
            try {
                // Clone the dashboard element
                const clone = dashboardRef.current.cloneNode(true) as HTMLElement;

                // Force Desktop Styles on Clone
                clone.style.width = '1200px';
                clone.style.minWidth = '1200px';
                clone.style.maxWidth = '1200px';
                clone.style.display = 'flex';
                clone.style.flexDirection = 'row';
                clone.style.position = 'absolute';
                clone.style.top = '-9999px';
                clone.style.left = '-9999px';
                clone.style.backgroundColor = '#1e1e1e';
                clone.style.border = '1px solid #333';
                clone.style.borderRadius = '8px';

                // Force Left Panel Styles
                const leftPanel = clone.querySelector('.left-panel-wrapper') as HTMLElement;
                if (leftPanel) {
                    leftPanel.style.width = '360px';
                    leftPanel.style.flexShrink = '0';
                    leftPanel.style.borderRight = '1px solid #333';
                    leftPanel.style.borderBottom = 'none';
                    leftPanel.style.display = 'flex';
                    leftPanel.style.flexDirection = 'column';
                }

                // Force Best39 Section Styles
                const best39Section = clone.querySelector('.best39-section') as HTMLElement;
                if (best39Section) {
                    best39Section.style.flexGrow = '1';
                    best39Section.style.width = 'auto';
                    best39Section.style.maxWidth = 'none';
                }

                // Append to body to render
                document.body.appendChild(clone);

                // Wait for images to load (optional, but html2canvas handles it mostly)
                // We can use a small timeout to ensure styles are applied
                await new Promise(resolve => setTimeout(resolve, 100));

                const canvas = await html2canvas(clone, {
                    backgroundColor: '#1e1e1e',
                    scale: 2,
                    useCORS: true,
                    allowTaint: true,
                    logging: false,
                    width: 1200, // Force canvas width
                    windowWidth: 1200, // Simulate window width
                });

                // Remove clone
                document.body.removeChild(clone);

                const link = document.createElement('a');
                link.download = `sekai-force-dashboard-${new Date().getTime()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            } catch (error) {
                console.error('Capture failed:', error);
                alert('이미지 저장 중 오류가 발생했습니다.');
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
                            playerName={playerName}
                        />
                    </div>

                    <div className="chart-section">
                        <StatisticsChart best39={best39} userResults={userResults} songs={songs} />
                    </div>
                </div >

                <div className="best39-section">
                    <Best39 best39={best39} />
                </div>

            </div>

            <FloatingButton
                onEditProfile={() => setShowProfileModal(true)}
                onCapture={handleCapture}
            />

            {/* Profile Edit Modal */}
            {
                showProfileModal && (
                    <div className="modal-overlay">
                        <div className="preview-modal" style={{ maxWidth: '400px' }}>
                            <h2>프로필 수정</h2>
                            <div className="profile-edit-form">
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
                                    <label>Twitter ID (Registerion at)</label>
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
