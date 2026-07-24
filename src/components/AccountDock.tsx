import { useEffect, useMemo, useRef, useState } from 'react';
import {
    AccountPanel,
    useAuth,
    type AccountStateSyncStatus,
} from '../login';
import './AccountDock.css';

interface AccountDockProps {
    syncStatuses: AccountStateSyncStatus[];
}

const getCombinedStatus = (statuses: AccountStateSyncStatus[]) => {
    if (statuses.includes('error')) return { label: '동기화 오류', className: 'error' };
    if (statuses.includes('conflict')) return { label: '데이터 선택 필요', className: 'warning' };
    if (statuses.includes('saving')) return { label: '저장 중', className: 'working' };
    if (statuses.includes('loading')) return { label: '불러오는 중', className: 'working' };
    if (statuses.every(status => status === 'ready')) {
        return { label: '동기화됨', className: 'ready' };
    }
    return { label: '로컬 저장', className: 'local' };
};

const AccountDock = ({ syncStatuses }: AccountDockProps) => {
    const { user, loading, refreshSession } = useAuth();
    const [open, setOpen] = useState(false);
    const [checkingExistingSession, setCheckingExistingSession] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const checkedExistingSessionRef = useRef(Boolean(user));
    const syncStatus = useMemo(() => getCombinedStatus(syncStatuses), [syncStatuses]);

    useEffect(() => {
        if (user) checkedExistingSessionRef.current = true;
    }, [user]);

    useEffect(() => {
        const handlePointerDown = (event: PointerEvent) => {
            if (
                event.target instanceof Element
                && event.target.closest('[data-auth-overlay="true"]')
            ) return;
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('pointerdown', handlePointerDown);
        return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, []);

    const handleToggle = () => {
        const nextOpen = !open;
        setOpen(nextOpen);
        if (
            nextOpen
            && !user
            && !loading
            && !checkedExistingSessionRef.current
        ) {
            checkedExistingSessionRef.current = true;
            setCheckingExistingSession(true);
            void refreshSession().finally(() => setCheckingExistingSession(false));
        }
    };

    return (
        <div className="force-account-dock" ref={containerRef}>
            <button
                type="button"
                className={`force-account-trigger ${user ? 'logged-in' : 'logged-out'} ${open ? 'active' : ''}`}
                onClick={handleToggle}
                aria-expanded={open}
                aria-haspopup="dialog"
            >
                <span className="force-account-icon" aria-hidden="true">
                    <span className="mdi mdi-account-circle-outline" />
                </span>
                {user ? (
                    <span className="force-account-trigger-copy">
                        <strong>{user.username}</strong>
                        <small className={syncStatus.className}>{syncStatus.label}</small>
                    </span>
                ) : (
                    <span className="force-account-trigger-copy">
                        <strong>로그인 · 기록 동기화</strong>
                        <small>성과와 정확도를 여러 기기에서 사용</small>
                    </span>
                )}
                <span className={`mdi mdi-chevron-down force-account-chevron ${open ? 'open' : ''}`} aria-hidden="true" />
            </button>

            {open && (
                <section className="force-account-popover" aria-label="계정">
                    <div className="force-account-popover-heading">
                        <span>셐포스 계정</span>
                        {user && <em className={syncStatus.className}>{syncStatus.label}</em>}
                    </div>
                    {checkingExistingSession && !user ? (
                        <div className="force-account-checking">
                            <span className="force-account-spinner" aria-hidden="true" />
                            기존 로그인 확인 중…
                        </div>
                    ) : (
                        <AccountPanel onLogout={() => setOpen(false)} />
                    )}
                    <p className="force-account-privacy">
                        로그인하지 않으면 서버 요청 없이 이 브라우저에만 저장됩니다.
                    </p>
                </section>
            )}
        </div>
    );
};

export default AccountDock;
