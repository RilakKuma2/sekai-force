import React from 'react';
import './ConfirmModal.css';

interface ConfirmModalProps {
    isOpen: boolean;
    title?: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    showCancel?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, title = "확인", message, onConfirm, onCancel, showCancel = true }) => {
    if (!isOpen) return null;

    return (
        <div className="confirm-modal-overlay" onClick={onCancel}>
            <div className="confirm-modal-content" onClick={e => e.stopPropagation()}>
                <h3 className="confirm-modal-title">{title}</h3>
                <div className="confirm-modal-message">
                    {message.split('\n').map((line, i) => (
                        <p key={i}>{line}</p>
                    ))}
                </div>
                <div className="confirm-modal-actions">
                    {showCancel && <button className="confirm-modal-btn cancel" onClick={onCancel}>취소</button>}
                    <button className="confirm-modal-btn confirm" onClick={onConfirm}>확인</button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
