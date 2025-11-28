import React from 'react';
import { useNavigate } from 'react-router-dom';

interface FloatingButtonProps {
    onEditProfile?: () => void;
}

const FloatingButton: React.FC<FloatingButtonProps> = ({ onEditProfile }) => {
    const navigate = useNavigate();

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '0',
                left: '0',
                width: '100%',
                height: '0', // Zero height to not block content
                display: 'flex',
                justifyContent: 'center',
                zIndex: 1000,
                pointerEvents: 'none' // Let clicks pass through the wrapper
            }}
        >
            <div style={{ width: '100%', maxWidth: '1400px', position: 'relative', margin: '0 auto' }}>
                <div style={{ position: 'absolute', right: '20px', bottom: '20px', pointerEvents: 'auto', display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {onEditProfile && (
                        <button
                            onClick={onEditProfile}
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                color: 'white',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backdropFilter: 'blur(4px)',
                                transition: 'transform 0.2s, background-color 0.2s'
                            }}
                            title="프로필 수정"
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'scale(1.05)';
                                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                            }}
                        >
                            <span className="mdi mdi-account-edit" style={{ fontSize: '20px' }}></span>
                        </button>
                    )}
                    <button
                        onClick={() => navigate('/input')}
                        style={{
                            padding: '12px 24px',
                            borderRadius: '30px',
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            color: 'white',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            backdropFilter: 'blur(4px)',
                            transition: 'transform 0.2s, background-color 0.2s'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'scale(1.05)';
                            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                        }}
                    >
                        성과 입력
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FloatingButton;
