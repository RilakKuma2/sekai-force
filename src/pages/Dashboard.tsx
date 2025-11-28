import React, { useState, useEffect } from 'react';
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
    const [showProfileModal, setShowProfileModal] = useState(false);

    // Load profile from local storage
    useEffect(() => {
        const savedProfile = localStorage.getItem('userProfile');
        if (savedProfile) {
            try {
                const parsed = JSON.parse(savedProfile);
                setSekaiRank(parsed.sekaiRank || '399');
                setPlayerId(parsed.playerId || '6393939393939393');
                setTwitterId(parsed.twitterId || '');
            } catch (e) {
                console.error("Failed to load profile", e);
            }
        }
    }, []);

    const handleSaveProfile = () => {
        const profile = { sekaiRank, playerId, twitterId };
        localStorage.setItem('userProfile', JSON.stringify(profile));
        setShowProfileModal(false);
    };

    const handleResetProfile = () => {
        if (window.confirm('프로필을 초기화하시겠습니까?')) {
            setSekaiRank('399');
            setPlayerId('6393939393939393');
            setTwitterId('');
            localStorage.removeItem('userProfile');
            setShowProfileModal(false);
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
            <div className="dashboard-layout">
                <div className="left-panel-wrapper">
                    <div className="profile-section">
                        <Summary
                            best39={best39}
                            userResults={userResults}
                            totalR={totalR}
                            sekaiRank={sekaiRank}
                            playerId={playerId}
                            twitterId={twitterId}
                        />
                    </div>

                    <div className="chart-section">
                        <StatisticsChart best39={best39} userResults={userResults} songs={songs} />
                    </div>
                </div>

                <div className="best39-section">
                    <Best39 best39={best39} />
                </div>

                <FloatingButton onEditProfile={() => setShowProfileModal(true)} />
            </div>

            {/* Profile Edit Modal */}
            {showProfileModal && (
                <div className="modal-overlay">
                    <div className="preview-modal" style={{ maxWidth: '400px' }}>
                        <h2>프로필 수정</h2>
                        <div className="profile-edit-form">
                            <div className="form-group">
                                <label>셐붕이 랭크</label>
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
            )}
        </div>
    );
};

export default Dashboard;
