/* eslint-disable react-refresh/only-export-components, @typescript-eslint/no-explicit-any */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { createPortal } from 'react-dom';
import './login.css';

export type AuthUser = {
  id: string;
  username: string;
  email: string | null;
  role: 'user' | 'admin';
  mustChangePassword: boolean;
  canAccessModeling: boolean;
  friendCode?: string | null;
  saveFriendCode?: boolean;
};

export type AuthResult = {
  message: string;
  status?: 'active' | 'pending';
  user?: AuthUser;
};

export type RegisterInput = {
  username: string;
  email?: string;
  password: string;
  inviteCode?: string;
};

export type ProfileInput = {
  email?: string;
  inviteCode?: string;
  currentPassword?: string;
};

export type AutoSavePreferenceControl = {
  enabled: boolean;
  disabled?: boolean;
  onChange: (enabled: boolean) => void | Promise<void>;
};

type AuthClient = ReturnType<typeof createAuthClient>;
type StorageClient = ReturnType<typeof createStorageClient>;

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<AuthResult>;
  register: (input: RegisterInput) => Promise<AuthResult>;
  recoverPassword: (identifier: string) => Promise<AuthResult>;
  changePassword: (newPassword: string) => Promise<AuthResult>;
  updateProfile: (input: ProfileInput) => Promise<AuthResult>;
  updateFriendCode: (friendCode: string | null, saveFriendCode: boolean) => Promise<AuthResult>;
  deleteAccount: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

type LoginLocale = 'ko' | 'ja' | 'en';

type LoginText = {
  localeBadge: string;
  accountNoun: string;
  close: string;
  authTabsLabel: string;
  loginTitle: string;
  registerTitle: string;
  recoverTitle: string;
  changeTitle: string;
  loginDescription: string;
  registerDescription: string;
  recoverDescription: string;
  changeDescription: string;
  usernameLabel: string;
  usernamePlaceholder: string;
  emailLabel: string;
  emailOptionalHint: string;
  loginIdentifierLabel: string;
  recoverIdentifierLabel: string;
  loginIdentifierPlaceholder: string;
  recoverIdentifierPlaceholder: string;
  passwordLabel: string;
  newPasswordLabel: string;
  passwordPlaceholder: string;
  newPasswordPlaceholder: string;
  passwordConfirmLabel: string;
  newPasswordConfirmLabel: string;
  passwordConfirmPlaceholder: string;
  inviteCodeLabel: string;
  optionalShort: string;
  inviteCodePlaceholder: string;
  loading: string;
  editProfile: string;
  logout: string;
  accountCopy: string;
  authButton: string;
  forgotPassword: string;
  backToLogin: string;
  loginAction: string;
  registerAction: string;
  recoverAction: string;
  changePasswordAction: string;
  processing: string;
  saveAction: string;
  saving: string;
  profileTitle: string;
  profileDescriptionWithInvite: string;
  profileDescriptionEmailOnly: string;
  autoSaveLabel: string;
  autoSaveHint: string;
  inviteCodeRegistered: string;
  conflictMessage: string;
  conflictLocal: string;
  conflictRemote: string;
  conflictMerge: string;
  conflictUseRemote: string;
  conflictUploadLocal: string;
  conflictOverwriteWarningRemote: string;
  conflictOverwriteWarningLocal: string;
  passwordMismatchError: string;
  tempPasswordNotice: string;
  genericRequestError: string;
  profileSaveError: string;
  invalidStorageTokenError: string;
  storageApiMissingError: string;
  storageSyncError: string;
  deleteAccountAction: string;
  deleteAccountTitle: string;
  deleteAccountDescription: string;
  deleteAccountConfirm: string;
  termsAgreement: string;
  termsLink: string;
};

type LoginUiOptions = {
  showInviteCode: boolean;
  locale: LoginLocale;
  text: LoginText;
};

const LOGIN_TEXT: Record<LoginLocale, LoginText> = {
  ko: {
    localeBadge: 'KO',
    accountNoun: '계정',
    close: '닫기',
    authTabsLabel: '인증 방식',
    loginTitle: '로그인',
    registerTitle: '회원가입',
    recoverTitle: '비밀번호 찾기',
    changeTitle: '새 비밀번호 설정',
    loginDescription: '아이디 또는 등록한 이메일로 로그인할 수 있습니다.',
    registerDescription: '아이디와 비밀번호만 필수이며 이메일은 선택입니다.',
    recoverDescription: '이메일을 등록한 계정에 30분 동안 유효한 임시 비밀번호를 보냅니다.',
    changeDescription: '계속하려면 사용할 새 비밀번호를 설정해 주세요.',
    usernameLabel: '아이디',
    usernamePlaceholder: '영문, 숫자, _',
    emailLabel: '이메일',
    emailOptionalHint: '선택 · 로그인/비밀번호 찾기용',
    loginIdentifierLabel: '아이디 또는 이메일',
    recoverIdentifierLabel: '아이디 또는 등록 이메일',
    loginIdentifierPlaceholder: '아이디 또는 이메일',
    recoverIdentifierPlaceholder: '계정 찾기',
    passwordLabel: '비밀번호',
    newPasswordLabel: '새 비밀번호',
    passwordPlaceholder: '비밀번호',
    newPasswordPlaceholder: '10자 이상',
    passwordConfirmLabel: '비밀번호 확인',
    newPasswordConfirmLabel: '새 비밀번호 확인',
    passwordConfirmPlaceholder: '비밀번호 다시 입력',
    inviteCodeLabel: '초대코드',
    optionalShort: '선택',
    inviteCodePlaceholder: '초대코드 입력',
    loading: '로그인 상태 확인 중…',
    editProfile: '정보 수정',
    logout: '로그아웃',
    accountCopy: '로그인하면 이 사이트의 저장 데이터를 계정과 동기화할 수 있어요.',
    authButton: '로그인 · 회원가입',
    forgotPassword: '비밀번호를 잊으셨나요?',
    backToLogin: '로그인으로 돌아가기',
    loginAction: '로그인',
    registerAction: '가입하기',
    recoverAction: '임시 비밀번호 받기',
    changePasswordAction: '비밀번호 변경',
    processing: '처리 중…',
    saveAction: '저장',
    saving: '저장 중…',
    profileTitle: '정보 수정',
    profileDescriptionWithInvite: '이메일과 초대코드를 등록하거나 변경할 수 있습니다.',
    profileDescriptionEmailOnly: '이메일을 등록하거나 변경할 수 있습니다.',
    autoSaveLabel: '자동저장',
    autoSaveHint: '',
    inviteCodeRegistered: '초대코드 등록 완료',
    conflictMessage: '로그인 계정 데이터와 이 브라우저의 로컬 데이터가 다릅니다. 사용할 데이터를 선택해 주세요.',
    conflictLocal: '로컬',
    conflictRemote: '클라우드',
    conflictMerge: '가져오기 (데이터 합치기)',
    conflictUseRemote: '클라우드 데이터 사용',
    conflictUploadLocal: '로컬 데이터 사용',
    conflictOverwriteWarningRemote: '정말로 기존 로컬 데이터를 클라우드 데이터로 덮어씌우시겠습니까?\n기존 로컬 데이터는 모두 삭제되며 되돌릴 수 없습니다.',
    conflictOverwriteWarningLocal: '정말로 기존 클라우드 데이터를 로컬 데이터로 덮어씌우시겠습니까?\n기존 클라우드 데이터는 모두 삭제되며 되돌릴 수 없습니다.',
    termsAgreement: '에 동의합니다.',
    termsLink: '개인정보처리방침',
    passwordMismatchError: '비밀번호 확인이 일치하지 않습니다.',
    tempPasswordNotice: '임시 비밀번호로 로그인했습니다. 새 비밀번호를 설정해 주세요.',
    genericRequestError: '요청을 처리하지 못했습니다.',
    profileSaveError: '정보를 저장하지 못했습니다.',
    invalidStorageTokenError: '저장 서버 인증 응답이 올바르지 않습니다.',
    storageApiMissingError: '계정 저장 API 주소가 설정되지 않았습니다.',
    storageSyncError: '사용자 데이터를 동기화하지 못했습니다.',
    deleteAccountAction: '회원 탈퇴',
    deleteAccountTitle: '계정 삭제',
    deleteAccountDescription: '계정을 삭제하려면 비밀번호를 입력해 주세요. 이 작업은 되돌릴 수 없습니다.',
    deleteAccountConfirm: '정말 삭제하시겠습니까?',
  },
  ja: {
    localeBadge: 'JA',
    accountNoun: 'アカウント',
    close: '閉じる',
    authTabsLabel: '認証方法',
    loginTitle: 'ログイン',
    registerTitle: '新規登録',
    recoverTitle: 'パスワード再発行',
    changeTitle: '新しいパスワード設定',
    loginDescription: 'ユーザー名または登録済みメールアドレスでログインできます。',
    registerDescription: '必須項目はユーザー名とパスワードのみで、メールアドレスは任意です。',
    recoverDescription: 'メールアドレスが登録されたアカウントに、30分有効な仮パスワードを送信します。',
    changeDescription: '続行するには、新しいパスワードを設定してください。',
    usernameLabel: 'ユーザー名',
    usernamePlaceholder: '英字、数字、_',
    emailLabel: 'メールアドレス',
    emailOptionalHint: '任意・ログイン/再発行用',
    loginIdentifierLabel: 'ユーザー名またはメールアドレス',
    recoverIdentifierLabel: 'ユーザー名または登録済みメールアドレス',
    loginIdentifierPlaceholder: 'ユーザー名またはメールアドレス',
    recoverIdentifierPlaceholder: 'アカウント検索',
    passwordLabel: 'パスワード',
    newPasswordLabel: '新しいパスワード',
    passwordPlaceholder: 'パスワード',
    newPasswordPlaceholder: '10文字以上',
    passwordConfirmLabel: 'パスワード確認',
    newPasswordConfirmLabel: '新しいパスワード確認',
    passwordConfirmPlaceholder: 'もう一度入力',
    inviteCodeLabel: '招待コード',
    optionalShort: '任意',
    inviteCodePlaceholder: '招待コードを入力',
    loading: 'ログイン状態を確認中…',
    editProfile: '情報修正',
    logout: 'ログアウト',
    accountCopy: 'ログインすると、このサイトの保存データをアカウントと同期できます。',
    authButton: 'ログイン・新規登録',
    forgotPassword: 'パスワードをお忘れですか？',
    backToLogin: 'ログインに戻る',
    loginAction: 'ログイン',
    registerAction: '登録する',
    recoverAction: '仮パスワードを受け取る',
    changePasswordAction: 'パスワード変更',
    processing: '処理中…',
    saveAction: '保存',
    saving: '保存中…',
    profileTitle: '情報修正',
    profileDescriptionWithInvite: 'メールアドレスと招待コードを登録または変更できます。',
    profileDescriptionEmailOnly: 'メールアドレスを登録または変更できます。',
    autoSaveLabel: '自動保存',
    autoSaveHint: '',
    inviteCodeRegistered: '招待コード登録済み',
    conflictMessage: 'ログイン中のアカウントデータとこのブラウザのローカルデータが異なります。使用するデータを選んでください。',
    conflictLocal: 'ローカル',
    conflictRemote: 'クラウド',
    conflictMerge: '取得する (データを統合)',
    conflictUseRemote: 'クラウドデータを使用',
    conflictUploadLocal: 'ローカルデータを使用',
    conflictOverwriteWarningRemote: '本当に既存のローカルデータをクラウドデータで上書きしますか？\n既存のローカルデータはすべて削除され、元に戻すことはできません。',
    conflictOverwriteWarningLocal: '本当に既存のクラウドデータをローカルデータで上書きしますか？\n既存のクラウドデータはすべて削除され、元に戻すことはできません。',
    termsAgreement: 'に同意します。',
    termsLink: 'プライバシーポリシー',
    passwordMismatchError: 'パスワード確認が一致しません。',
    tempPasswordNotice: '仮パスワードでログインしました。新しいパスワードを設定してください。',
    genericRequestError: 'リクエストを処理できませんでした。',
    profileSaveError: '情報を保存できませんでした。',
    invalidStorageTokenError: '保存サーバーの認証応答が正しくありません。',
    storageApiMissingError: 'アカウント保存 API アドレスが設定されていません。',
    storageSyncError: 'ユーザーデータを同期できませんでした。',
    deleteAccountAction: '退会する',
    deleteAccountTitle: 'アカウント削除',
    deleteAccountDescription: 'アカウントを削除するにはパスワードを入力してください。この操作は取り消せません。',
    deleteAccountConfirm: '本当に削除しますか？',
  },
  en: {
    localeBadge: 'EN',
    accountNoun: 'account',
    close: 'Close',
    authTabsLabel: 'Auth mode',
    loginTitle: 'Sign in',
    registerTitle: 'Create account',
    recoverTitle: 'Reset password',
    changeTitle: 'Set new password',
    loginDescription: 'You can sign in with your username or registered email address.',
    registerDescription: 'Only a username and password are required. Email is optional.',
    recoverDescription: 'A temporary password valid for 30 minutes will be sent to the email linked to this account.',
    changeDescription: 'Set a new password to continue.',
    usernameLabel: 'Username',
    usernamePlaceholder: 'Letters, numbers, _',
    emailLabel: 'Email',
    emailOptionalHint: 'Optional · sign-in/password reset',
    loginIdentifierLabel: 'Username or email',
    recoverIdentifierLabel: 'Username or registered email',
    loginIdentifierPlaceholder: 'Username or email',
    recoverIdentifierPlaceholder: 'Find account',
    passwordLabel: 'Password',
    newPasswordLabel: 'New password',
    passwordPlaceholder: 'Password',
    newPasswordPlaceholder: '10 characters or more',
    passwordConfirmLabel: 'Confirm password',
    newPasswordConfirmLabel: 'Confirm new password',
    passwordConfirmPlaceholder: 'Enter it again',
    inviteCodeLabel: 'Invite code',
    optionalShort: 'Optional',
    inviteCodePlaceholder: 'Enter invite code',
    loading: 'Checking sign-in status…',
    editProfile: 'Edit profile',
    logout: 'Sign out',
    accountCopy: 'Sign in to sync this site’s saved data with your account.',
    authButton: 'Sign in · Create account',
    forgotPassword: 'Forgot your password?',
    backToLogin: 'Back to sign in',
    loginAction: 'Sign in',
    registerAction: 'Create account',
    recoverAction: 'Send temporary password',
    changePasswordAction: 'Change password',
    processing: 'Processing…',
    saveAction: 'Save',
    saving: 'Saving…',
    profileTitle: 'Edit profile',
    profileDescriptionWithInvite: 'You can add or update your email and invite code.',
    profileDescriptionEmailOnly: 'You can add or update your email.',
    autoSaveLabel: 'Auto save',
    autoSaveHint: '',
    inviteCodeRegistered: 'Invite code registered',
    conflictMessage: 'Your signed-in account data and this browser’s local data are different. Choose which data to use.',
    conflictLocal: 'Local',
    conflictRemote: 'Cloud',
    conflictMerge: 'Fetch (Merge data)',
    conflictUseRemote: 'Use cloud data',
    conflictUploadLocal: 'Use local data',
    conflictOverwriteWarningRemote: 'Are you sure you want to overwrite your local data with the cloud data?\nYour existing local data will be deleted and cannot be recovered.',
    conflictOverwriteWarningLocal: 'Are you sure you want to overwrite your cloud data with your local data?\nYour existing cloud data will be deleted and cannot be recovered.',
    termsAgreement: ' I agree to the ',
    termsLink: 'Privacy Policy',
    passwordMismatchError: 'The password confirmation does not match.',
    tempPasswordNotice: 'You signed in with a temporary password. Please set a new one.',
    genericRequestError: 'The request could not be completed.',
    profileSaveError: 'Your profile could not be saved.',
    invalidStorageTokenError: 'The storage server authentication response was invalid.',
    storageApiMissingError: 'The account storage API URL is not configured.',
    storageSyncError: 'User data could not be synchronized.',
    deleteAccountAction: 'Delete account',
    deleteAccountTitle: 'Delete account',
    deleteAccountDescription: 'Enter your password to delete your account. This action cannot be undone.',
    deleteAccountConfirm: 'Are you sure you want to delete?',
  },
};

const normalizeLoginLocale = (locale?: string): LoginLocale => {
  const normalized = locale?.toLowerCase();
  if (normalized === 'jp' || normalized?.startsWith('ja')) return 'ja';
  if (normalized?.startsWith('en')) return 'en';
  return 'ko';
};

const AuthContext = createContext<AuthContextValue | null>(null);
const StorageContext = createContext<StorageClient | null>(null);
const LoginUiContext = createContext<LoginUiOptions>({
  showInviteCode: true,
  locale: 'ko',
  text: LOGIN_TEXT.ko,
});
const DEFAULT_AUTH_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const TOKEN_REFRESH_SKEW_MS = 60_000;

export function createAuthClient(
  baseUrl: string,
  text: LoginText = LOGIN_TEXT.ko,
  fetchImpl: typeof fetch = fetch,
) {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
  const url = (path: string) => `${normalizedBaseUrl}${path}`;
  const request = async <T,>(path: string, init?: RequestInit): Promise<T> => {
    const response = await fetchImpl(url(path), {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.message || text.genericRequestError);
    return body as T;
  };

  return {
    url,
    request,
    getSession: () => request<{ user: AuthUser | null }>('/api/auth/session'),
    login: (identifier: string, password: string) => request<AuthResult>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    }),
    register: (input: RegisterInput) => request<AuthResult>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
    recoverPassword: (identifier: string) => request<AuthResult>('/api/auth/recover', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    }),
    changePassword: (newPassword: string) => request<AuthResult>('/api/auth/password', {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }),
    updateProfile: (input: ProfileInput) => request<AuthResult>('/api/account/profile', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
    deleteAccount: (password: string) => request<unknown>('/api/account/delete', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
    logout: () => request<unknown>('/api/auth/logout', {
      method: 'POST',
      body: '{}',
    }),
  };
}

function createStorageClient(
  authClient: AuthClient,
  storageBaseUrl: string,
  text: LoginText = LOGIN_TEXT.ko,
) {
  const baseUrl = storageBaseUrl.replace(/\/$/, '');
  let cachedToken: { accessToken: string; userId: string; refreshAt: number } | null = null;
  let tokenRequest: { userId: string; promise: Promise<string> } | null = null;

  const requestToken = async (userId: string, forceRefresh = false) => {
    if (
      !forceRefresh
      && cachedToken?.userId === userId
      && cachedToken.refreshAt > Date.now()
    ) {
      return cachedToken.accessToken;
    }

    if (!tokenRequest || tokenRequest.userId !== userId || forceRefresh) {
      const promise = authClient.request<{
        accessToken: string;
        expiresIn: number;
        userId: string;
      }>('/api/auth/storage-token', {
        method: 'POST',
        body: '{}',
      }).then((token) => {
        if (
          typeof token.accessToken !== 'string'
          || typeof token.expiresIn !== 'number'
          || token.userId !== userId
        ) {
          throw new Error(text.invalidStorageTokenError);
        }
        cachedToken = {
          accessToken: token.accessToken,
          userId,
          refreshAt: Date.now() + Math.max(
            1_000,
            token.expiresIn * 1000 - TOKEN_REFRESH_SKEW_MS,
          ),
        };
        return token.accessToken;
      });
      tokenRequest = { userId, promise };
      void promise.then(() => {
        if (tokenRequest?.promise === promise) tokenRequest = null;
      }, () => {
        if (tokenRequest?.promise === promise) tokenRequest = null;
      });
    }
    return tokenRequest.promise;
  };

  const request = async <T,>(
    path: string,
    userId: string,
    init?: RequestInit,
    retry = true,
  ): Promise<T> => {
    if (!baseUrl) throw new Error(text.storageApiMissingError);
    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${await requestToken(userId, !retry)}`);
    if (init?.body !== undefined && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
    if (response.status === 401 && retry) {
      cachedToken = null;
      return request<T>(path, userId, init, false);
    }
    const body = response.status === 204
      ? null
      : await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body?.message || text.storageSyncError);
    }
    return body as T;
  };

  return {
    configured: Boolean(baseUrl),
    getState: async <T,>(namespace: string, userId: string) => {
      const result = await request<{ state: RemoteUserState<T> | null }>(
        `/v1/states/${encodeURIComponent(namespace)}`,
        userId,
      );
      return result.state;
    },
    putState: async <T,>(namespace: string, data: T, userId: string) => {
      const result = await request<{ state: RemoteUserState<T> }>(
        `/v1/states/${encodeURIComponent(namespace)}`,
        userId,
        { method: 'PUT', body: JSON.stringify({ data }) },
      );
      return result.state;
    },
  };
}

function createSessionCache(key: string, ttlMs: number) {
  const read = () => {
    if (typeof window === 'undefined') return null;
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) || 'null');
      if (!parsed || parsed.expiresAt <= Date.now()) {
        window.localStorage.removeItem(key);
        return null;
      }
      return parsed as { user: AuthUser | null; expiresAt: number };
    } catch {
      window.localStorage.removeItem(key);
      return null;
    }
  };
  const write = (user: AuthUser | null) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify({
      user,
      expiresAt: Date.now() + ttlMs,
    }));
  };
  const clear = () => {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key);
  };
  return { key, read, write, clear };
}

type LoginProviderProps = {
  children: ReactNode;
  authBaseUrl: string;
  storageBaseUrl: string;
  cacheKey?: string;
  cacheTtlMs?: number;
  showInviteCode?: boolean;
  locale?: string;
};

export function LoginProvider({
  children,
  authBaseUrl,
  storageBaseUrl,
  cacheKey = 'sekai-auth-cache-v1',
  cacheTtlMs = DEFAULT_AUTH_CACHE_TTL_MS,
  showInviteCode = true,
  locale = 'ko',
}: LoginProviderProps) {
  const resolvedLocale = useMemo(() => normalizeLoginLocale(locale), [locale]);
  const text = useMemo(() => LOGIN_TEXT[resolvedLocale], [resolvedLocale]);
  const authClient = useMemo(() => createAuthClient(authBaseUrl, text), [authBaseUrl, text]);
  const storageClient = useMemo(
    () => createStorageClient(authClient, storageBaseUrl, text),
    [authClient, storageBaseUrl, text],
  );
  const cache = useMemo(() => createSessionCache(cacheKey, cacheTtlMs), [cacheKey, cacheTtlMs]);
  const uiOptions = useMemo<LoginUiOptions>(() => ({
    showInviteCode,
    locale: resolvedLocale,
    text,
  }), [resolvedLocale, showInviteCode, text]);
  const initialCacheRef = useRef(cache.read());
  const [user, setUser] = useState<AuthUser | null>(initialCacheRef.current?.user || null);
  const [loading, setLoading] = useState(Boolean(initialCacheRef.current));

  const commitUser = useCallback((nextUser: AuthUser | null) => {
    setUser(nextUser);
    cache.write(nextUser);
  }, [cache]);

  const refreshSession = useCallback(async () => {
    try {
      const result = await authClient.getSession();
      if (result.user) commitUser(result.user);
      else {
        cache.clear();
        setUser(null);
      }
    } catch {
      // Keep the last verified local user during transient deploy/network
      // failures. A successful { user: null } response still signs out below.
    } finally {
      setLoading(false);
    }
  }, [authClient, cache, commitUser]);

  useEffect(() => {
    if (initialCacheRef.current) void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== cache.key) return;
      setUser(cache.read()?.user || null);
      setLoading(false);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [cache]);

  const login = useCallback(async (identifier: string, password: string) => {
    const result = await authClient.login(identifier, password);
    commitUser(result.user || null);
    return result;
  }, [authClient, commitUser]);
  const register = useCallback(async (input: RegisterInput) => {
    const result = await authClient.register(input);
    if (result.user) commitUser(result.user);
    return result;
  }, [authClient, commitUser]);
  const recoverPassword = useCallback(
    (identifier: string) => authClient.recoverPassword(identifier),
    [authClient],
  );
  const changePassword = useCallback(async (newPassword: string) => {
    const result = await authClient.changePassword(newPassword);
    if (result.user) commitUser(result.user);
    return result;
  }, [authClient, commitUser]);
  const updateProfile = useCallback(async (input: ProfileInput) => {
    const result = await authClient.updateProfile(input);
    if (result.user) commitUser(result.user);
    return result;
  }, [authClient, commitUser]);
  const updateFriendCode = useCallback(async (friendCode: string | null, saveFriendCode: boolean): Promise<AuthResult> => {
    const result = await authClient.request<AuthResult>('/api/account/friend-code', {
      method: 'POST',
      body: JSON.stringify({ friendCode, saveFriendCode }),
    });
    if (result.user) commitUser(result.user);
    return result;
  }, [authClient, commitUser]);
  const deleteAccount = useCallback(async (password: string) => {
    await authClient.deleteAccount(password);
    cache.clear();
    setUser(null);
  }, [authClient, cache]);
  const logout = useCallback(async () => {
    try {
      await authClient.logout();
    } finally {
      cache.clear();
      setUser(null);
    }
  }, [authClient, cache]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    login,
    register,
    recoverPassword,
    changePassword,
    updateProfile,
    updateFriendCode,
    deleteAccount,
    logout,
    refreshSession,
  }), [
    user,
    loading,
    login,
    register,
    recoverPassword,
    changePassword,
    updateProfile,
    updateFriendCode,
    deleteAccount,
    logout,
    refreshSession,
  ]);

  return (
    <LoginUiContext.Provider value={uiOptions}>
      <StorageContext.Provider value={storageClient}>
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
      </StorageContext.Provider>
    </LoginUiContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within LoginProvider');
  return context;
}

function useLoginUiOptions() {
  return useContext(LoginUiContext);
}

export function useUserStateApi() {
  const storageClient = useContext(StorageContext);
  if (!storageClient) throw new Error('useUserStateApi must be used within LoginProvider');
  return useMemo(() => ({
    isUserStateSyncConfigured: () => storageClient.configured,
    getUserState: storageClient.getState,
    putUserState: storageClient.putState,
  }), [storageClient]);
}

export type LocalStateAdapter<T> = {
  keys: string[];
  dirtyKey?: string;
  read: () => T;
  write: (value: T) => void;
};

export type AccountStateConflictChoice = 'merge' | 'remote' | 'local';
export type AccountStateSyncStatus =
  | 'local-only'
  | 'loading'
  | 'ready'
  | 'conflict'
  | 'saving'
  | 'error';

export type RemoteUserState<T> = {
  namespace: string;
  data: T;
  revision: number;
  updatedAt: string;
};

export function createJsonLocalStorageAdapter<T>({
  key,
  fallback,
  normalize = (value) => value,
}: {
  key: string;
  fallback: T;
  normalize?: (value: T) => T;
}): LocalStateAdapter<T> {
  return {
    keys: [key],
    dirtyKey: `${key}:account-dirty`,
    read: () => {
      if (typeof window === 'undefined') return normalize(fallback);
      try {
        const raw = window.localStorage.getItem(key);
        return raw ? normalize(JSON.parse(raw) as T) : normalize(fallback);
      } catch {
        return normalize(fallback);
      }
    },
    write: (value) => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(normalize(value)));
      }
    },
  };
}

type UseAccountStateOptions<T> = {
  namespace: string;
  storage: LocalStateAdapter<T>;
  normalize?: (value: T) => T;
  validate?: (value: unknown) => value is T;
  isEmpty: (value: T) => boolean;
  hasLocalOnly: (local: T, remote: T, dirty: boolean) => boolean;
  isConflict?: (local: T, remote: T, dirty: boolean) => boolean;
  merge: (local: T, remote: T) => T;
  enabled?: boolean;
  saveDelayMs?: number;
  retryDelayMs?: number;
  localPollMs?: number;
  refreshOnFocus?: boolean;
  refreshDelayMs?: number;
  refreshMinIntervalMs?: number;
  flushOnHide?: boolean;
  onExternalStateApplied?: (source: 'remote' | 'merge') => void;
  logLabel?: string;
};

const identity = <T,>(value: T) => value;

const getLoginInstanceId = () => {
  if (typeof window === 'undefined') return '';
  let id = window.localStorage.getItem('login-instance-id');
  if (!id) {
    id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
    window.localStorage.setItem('login-instance-id', id);
  }
  return id;
};

export function useAccountState<T>(options: UseAccountStateOptions<T>) {
  const { user } = useAuth();
  const storageClient = useContext(StorageContext);
  if (!storageClient) throw new Error('useAccountState must be used within LoginProvider');
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const normalizeInitial = options.normalize || identity<T>;
  const [value, setValueState] = useState<T>(() => normalizeInitial(options.storage.read()));
  const valueRef = useRef(value);
  const changeVersionRef = useRef(0);
  const uploadChainRef = useRef<Promise<void>>(Promise.resolve());
  const pendingUploadsRef = useRef<Map<string, Promise<void>>>(new Map());
  const saveTimerRef = useRef<number | undefined>(undefined);
  const lastRemoteAttemptAtRef = useRef(0);
  const syncReadyRef = useRef(false);
  const lastSyncedRef = useRef('');
  const [syncEpoch, setSyncEpoch] = useState(0);
  const [retryEpoch, setRetryEpoch] = useState(0);
  const [conflict, setConflict] = useState<{ local: T; remote: T } | null>(null);
  const [status, setStatus] = useState<AccountStateSyncStatus>(user ? 'loading' : 'local-only');
  const normalize = useCallback(
    (next: T) => (optionsRef.current.normalize || identity<T>)(next),
    [],
  );
  const serialize = useCallback((next: T) => JSON.stringify(normalize(next)), [normalize]);
  const dirtyKey = options.storage.dirtyKey
    || `${options.storage.keys[0] || options.namespace}:account-dirty`;

  const writeLocal = useCallback((next: T, markDirty: boolean) => {
    const normalized = normalize(next);
    valueRef.current = normalized;
    optionsRef.current.storage.write(normalized);
    if (markDirty && typeof window !== 'undefined') {
      window.localStorage.setItem(dirtyKey, '1');
      changeVersionRef.current += 1;
    }
    setValueState(normalized);
    return normalized;
  }, [dirtyKey, normalize]);

  const setValue = useCallback((action: SetStateAction<T>) => {
    const next = typeof action === 'function'
      ? (action as (previous: T) => T)(valueRef.current)
      : action;
    writeLocal(next, true);
  }, [writeLocal]);

  const finishBootstrap = useCallback((syncedValue: T) => {
    lastSyncedRef.current = serialize(syncedValue);
    syncReadyRef.current = true;
    setStatus('ready');
    setSyncEpoch((epoch) => epoch + 1);
  }, [serialize]);

  const upload = useCallback(async (next: T) => {
    if (!user) return;
    const normalized = normalize(next);
    const serialized = serialize(normalized);
    const pendingUpload = pendingUploadsRef.current.get(serialized);
    if (pendingUpload) {
      await pendingUpload;
      return;
    }
    const savingVersion = changeVersionRef.current;
    setStatus('saving');

    const operation = uploadChainRef.current.catch(() => undefined).then(async () => {
      const payload = {
        __wrapped: true,
        instanceId: getLoginInstanceId(),
        updatedAt: new Date().toISOString(),
        payload: normalized,
      };

      await storageClient.putState(optionsRef.current.namespace, payload as unknown as T, user.id);
      lastSyncedRef.current = serialized;
      if (savingVersion === changeVersionRef.current) window.localStorage.removeItem(dirtyKey);
      finishBootstrap(normalized);
    });

    uploadChainRef.current = operation;
    pendingUploadsRef.current.set(serialized, operation);
    try {
      await operation;
    } finally {
      if (pendingUploadsRef.current.get(serialized) === operation) {
        pendingUploadsRef.current.delete(serialized);
      }
    }
  }, [dirtyKey, finishBootstrap, normalize, serialize, storageClient, user]);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: number | undefined;
    syncReadyRef.current = false;
    setConflict(null);
    const current = optionsRef.current;
    if (current.enabled === false || !user || !storageClient.configured) {
      setStatus('local-only');
      return undefined;
    }
    setStatus('loading');
    const bootstrap = async () => {
      lastRemoteAttemptAtRef.current = Date.now();
      try {
        const remoteState = await storageClient.getState<unknown>(current.namespace, user.id);
        if (cancelled) return;
        const storedLocal = normalize(current.storage.read());
        const local = serialize(storedLocal) === serialize(valueRef.current)
          ? storedLocal
          : writeLocal(storedLocal, true);
        if (!remoteState) {
          await upload(local);
          return;
        }
        let remotePayload = remoteState.data;
        let remoteInstanceId = null;

        if (remotePayload && typeof remotePayload === 'object' && (remotePayload as any).__wrapped) {
          remoteInstanceId = (remotePayload as any).instanceId;
          remotePayload = (remotePayload as any).payload;
        }

        if (current.validate && !current.validate(remotePayload)) {
          throw new Error(`${current.logLabel || current.namespace} 데이터 형식이 올바르지 않습니다.`);
        }
        const remote = normalize(remotePayload as T);
        const localSerialized = serialize(local);
        const remoteSerialized = serialize(remote);
        const dirty = window.localStorage.getItem(dirtyKey) === '1';

        if (current.isEmpty(remote)) {
          await upload(local);
        } else if (localSerialized === remoteSerialized) {
          window.localStorage.removeItem(dirtyKey);
          finishBootstrap(remote);
        } else {
          const instanceId = getLoginInstanceId();
          if (remoteInstanceId === instanceId) {
            if (dirty) {
              await upload(local);
            } else {
              writeLocal(remote, false);
              window.localStorage.removeItem(dirtyKey);
              finishBootstrap(remote);
              current.onExternalStateApplied?.('remote');
            }
          } else {
            if (!dirty || current.isEmpty(local)) {
              writeLocal(remote, false);
              window.localStorage.removeItem(dirtyKey);
              finishBootstrap(remote);
              current.onExternalStateApplied?.('remote');
            } else {
              if (current.isConflict ? current.isConflict(local, remote, dirty) : (current.hasLocalOnly(local, remote, dirty) || dirty)) {
                setConflict({ local, remote });
                setStatus('conflict');
              } else if (dirty || current.hasLocalOnly(local, remote, dirty)) {
                const merged = current.merge(local, remote);
                writeLocal(merged, false);
                await upload(merged);
                current.onExternalStateApplied?.('merge');
              } else {
                writeLocal(remote, false);
                window.localStorage.removeItem(dirtyKey);
                finishBootstrap(remote);
                current.onExternalStateApplied?.('remote');
              }
            }
          }
        }
      } catch (error) {
        if (cancelled) return;
        console.warn(`${current.logLabel || current.namespace} 계정 동기화 실패:`, error);
        setStatus('error');
        retryTimer = window.setTimeout(
          () => setRetryEpoch((epoch) => epoch + 1),
          current.retryDelayMs ?? 10_000,
        );
      }
    };
    void bootstrap();
    return () => {
      cancelled = true;
      syncReadyRef.current = false;
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, [
    dirtyKey,
    finishBootstrap,
    normalize,
    options.enabled,
    options.namespace,
    retryEpoch,
    serialize,
    storageClient,
    upload,
    user,
    writeLocal,
  ]);

  useEffect(() => {
    const current = optionsRef.current;
    if (
      current.enabled === false
      || !user
      || !syncReadyRef.current
      || !storageClient.configured
    ) return undefined;
    const serialized = serialize(value);
    if (serialized === lastSyncedRef.current) return undefined;
    const timer = window.setTimeout(() => {
      if (saveTimerRef.current === timer) saveTimerRef.current = undefined;
      const latest = valueRef.current;
      if (serialize(latest) === lastSyncedRef.current) return;
      // Serialize PUTs so older snapshots cannot finish after newer ones.
      void upload(latest)
        .catch((error) => {
          console.warn(`${current.logLabel || current.namespace} 계정 저장 실패:`, error);
          setStatus('error');
        });
    }, current.saveDelayMs ?? 3_000);
    saveTimerRef.current = timer;
    return () => {
      window.clearTimeout(timer);
      if (saveTimerRef.current === timer) saveTimerRef.current = undefined;
    };
  }, [
    dirtyKey,
    normalize,
    options.enabled,
    options.namespace,
    serialize,
    storageClient,
    syncEpoch,
    upload,
    user,
    value,
  ]);

  useEffect(() => {
    const current = optionsRef.current;
    if (
      !current.flushOnHide
      || current.enabled === false
      || !user
      || !storageClient.configured
    ) return undefined;

    const flushPendingState = () => {
      if (
        document.visibilityState !== 'hidden'
        || !syncReadyRef.current
        || window.localStorage.getItem(dirtyKey) !== '1'
      ) return;
      if (saveTimerRef.current !== undefined) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = undefined;
      }
      const latest = valueRef.current;
      if (serialize(latest) === lastSyncedRef.current) return;
      void upload(latest).catch((error) => {
        console.warn(`${current.logLabel || current.namespace} 계정 저장 실패:`, error);
        setStatus('error');
      });
    };

    document.addEventListener('visibilitychange', flushPendingState);
    return () => document.removeEventListener('visibilitychange', flushPendingState);
  }, [
    dirtyKey,
    options.enabled,
    options.flushOnHide,
    serialize,
    storageClient,
    upload,
    user,
  ]);

  useEffect(() => {
    const current = optionsRef.current;
    if (
      !current.refreshOnFocus
      || current.enabled === false
      || !user
      || !storageClient.configured
    ) return undefined;

    let refreshTimer: number | undefined;
    const scheduleRefresh = () => {
      if (document.visibilityState === 'hidden') return;
      if (
        Date.now() - lastRemoteAttemptAtRef.current
        < (current.refreshMinIntervalMs ?? 1_000)
      ) return;
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        refreshTimer = undefined;
        void (async () => {
          if (window.localStorage.getItem(dirtyKey) === '1') {
            if (!syncReadyRef.current) return;
            try {
              await upload(valueRef.current);
            } catch (error) {
              console.warn(`${current.logLabel || current.namespace} 계정 저장 실패:`, error);
              setStatus('error');
              return;
            }
          }
          setRetryEpoch((epoch) => epoch + 1);
        })();
      }, current.refreshDelayMs ?? 750);
    };

    window.addEventListener('focus', scheduleRefresh);
    document.addEventListener('visibilitychange', scheduleRefresh);
    return () => {
      window.removeEventListener('focus', scheduleRefresh);
      document.removeEventListener('visibilitychange', scheduleRefresh);
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
    };
  }, [
    dirtyKey,
    options.enabled,
    options.refreshDelayMs,
    options.refreshMinIntervalMs,
    options.refreshOnFocus,
    storageClient,
    upload,
    user,
  ]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || !optionsRef.current.storage.keys.includes(event.key)) return;
      writeLocal(optionsRef.current.storage.read(), true);
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [writeLocal]);

  useEffect(() => {
    const pollMs = optionsRef.current.localPollMs;
    if (!pollMs || pollMs < 250) return undefined;
    const timer = window.setInterval(() => {
      const next = normalize(optionsRef.current.storage.read());
      if (serialize(next) === serialize(valueRef.current)) return;
      writeLocal(next, true);
      setConflict((current) => current ? { ...current, local: next } : current);
    }, pollMs);
    return () => window.clearInterval(timer);
  }, [normalize, options.localPollMs, serialize, writeLocal]);

  const resolveConflict = useCallback(async (choice: AccountStateConflictChoice) => {
    if (!conflict || !user || status === 'saving') return;
    try {
      if (choice === 'remote') {
        writeLocal(conflict.remote, false);
        window.localStorage.removeItem(dirtyKey);
        finishBootstrap(conflict.remote);
        optionsRef.current.onExternalStateApplied?.('remote');
      } else {
        const next = choice === 'merge'
          ? normalize(optionsRef.current.merge(conflict.local, conflict.remote))
          : conflict.local;
        writeLocal(next, false);
        await upload(next);
        if (choice === 'merge') optionsRef.current.onExternalStateApplied?.('merge');
      }
      setConflict(null);
    } catch (error) {
      console.warn(`${optionsRef.current.logLabel || optionsRef.current.namespace} 충돌 처리 실패:`, error);
      setStatus('error');
    }
  }, [conflict, dirtyKey, finishBootstrap, normalize, status, upload, user, writeLocal]);

  return { value, setValue, conflict, resolveConflict, status };
}

type AuthMode = 'login' | 'register' | 'recover' | 'change';

function renderAuthOverlay(children: ReactElement) {
  if (typeof document === 'undefined') return children;
  return createPortal(children, document.body) as unknown as ReactElement;
}

export function AuthModal({
  initialMode = 'login',
  onClose,
  onAuthenticated,
}: {
  initialMode?: AuthMode;
  onClose: () => void;
  onAuthenticated?: () => void;
}) {
  const { user, login, register, recoverPassword, changePassword } = useAuth();
  const { showInviteCode, locale, text } = useLoginUiOptions();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showLegal, setShowLegal] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && mode !== 'change') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mode, onClose]);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError('');
    setNotice('');
    setPassword('');
    setPasswordConfirm('');
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if ((mode === 'register' || mode === 'change') && password !== passwordConfirm) {
      setError(text.passwordMismatchError);
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'login') {
        const result = await login(identifier, password);
        if (result.user?.mustChangePassword) {
          setMode('change');
          setPassword('');
          setPasswordConfirm('');
          setNotice(text.tempPasswordNotice);
          return;
        }
        onAuthenticated?.();
        if (!onAuthenticated) onClose();
      } else if (mode === 'recover') {
        setNotice((await recoverPassword(identifier)).message);
      } else if (mode === 'change') {
        await changePassword(password);
        onAuthenticated?.();
        if (!onAuthenticated) onClose();
      } else {
        const result = await register({
          username,
          email: email.trim() || undefined,
          password,
          inviteCode: showInviteCode ? inviteCode.trim() || undefined : undefined,
        });
        if (result.status === 'active') {
          onAuthenticated?.();
          if (!onAuthenticated) onClose();
        } else {
          setNotice(result.message);
          setPassword('');
          setPasswordConfirm('');
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : text.genericRequestError);
    } finally {
      setSubmitting(false);
    }
  };

  const title = mode === 'register'
    ? text.registerTitle
    : mode === 'recover'
      ? text.recoverTitle
      : mode === 'change'
        ? text.changeTitle
        : text.loginTitle;

  return renderAuthOverlay(
    <div className="login-modal-backdrop" data-auth-overlay="true" role="presentation" onMouseDown={mode === 'change' ? undefined : onClose}>
      <section className="login-modal" role="dialog" aria-modal="true" aria-labelledby="login-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        {mode !== 'change' && <button className="login-modal-close" type="button" onClick={onClose} aria-label={text.close}>×</button>}
        <div className="login-modal-brand" aria-hidden="true">
          <span className="login-modal-brand-letter">S</span>
          <span className="login-modal-brand-badge">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="8" />
              <path d="M4 12h16" />
              <path d="M12 4c2.5 2.2 4 5 4 8s-1.5 5.8-4 8c-2.5-2.2-4-5-4-8s1.5-5.8 4-8Z" />
            </svg>
            <span>{text.localeBadge}</span>
          </span>
        </div>
        <h2 id="login-modal-title">{title}</h2>
        <p className="login-modal-description">
          {mode === 'login' && text.loginDescription}
          {mode === 'register' && text.registerDescription}
          {mode === 'recover' && text.recoverDescription}
          {mode === 'change' && text.changeDescription}
        </p>
        {(mode === 'login' || mode === 'register') && (
          <div className="login-mode-tabs" role="tablist" aria-label={text.authTabsLabel}>
            <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>{text.loginTitle}</button>
            <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')}>{text.registerTitle}</button>
          </div>
        )}
        <form className="login-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <label>
                <span>{text.usernameLabel}</span>
                <input type="text" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" required placeholder={text.usernamePlaceholder} />
              </label>
            </>
          )}
          {(mode === 'login' || mode === 'recover') && (
            <label>
              <span>{mode === 'login' ? text.loginIdentifierLabel : text.recoverIdentifierLabel}</span>
              <input type="text" value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" maxLength={254} required placeholder={mode === 'login' ? text.loginIdentifierPlaceholder : text.recoverIdentifierPlaceholder} />
            </label>
          )}
          {mode !== 'recover' && (
            <label>
              <span>{mode === 'change' ? text.newPasswordLabel : text.passwordLabel}</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={10} maxLength={128} required placeholder={mode === 'login' ? text.passwordPlaceholder : text.newPasswordPlaceholder} />
            </label>
          )}
          {(mode === 'register' || mode === 'change') && (
            <label>
              <span>{mode === 'change' ? text.newPasswordConfirmLabel : text.passwordConfirmLabel}</span>
              <input type="password" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} autoComplete="new-password" minLength={10} maxLength={128} required placeholder={text.passwordConfirmPlaceholder} />
            </label>
          )}
          {mode === 'register' && showInviteCode && (
            <label>
              <span>{text.inviteCodeLabel} <small>{text.optionalShort}</small></span>
              <input type="text" value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} autoComplete="off" maxLength={80} placeholder={text.inviteCodePlaceholder} />
            </label>
          )}
          {mode === 'register' && (
            <label className="login-field-optional">
              <span>{text.emailLabel} <small>{text.emailOptionalHint}</small></span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength={254} placeholder="name@example.com" />
            </label>
          )}
          {mode === 'register' && (
            <label className="login-checkbox-field">
              <input type="checkbox" required />
              <span>
                {locale === 'en' && text.termsAgreement}
                <button type="button" className="login-text-button" onClick={() => setShowLegal(true)} style={{ padding: 0, textDecoration: 'underline', color: 'inherit' }}>{text.termsLink}</button>
                {locale !== 'en' && text.termsAgreement}
              </span>
            </label>
          )}
          {error && <p className="login-message error" role="alert">{error}</p>}
          {notice && <p className="login-message notice" role="status">{notice}</p>}
          <button className="login-submit" type="submit" disabled={submitting}>
            {submitting ? text.processing : mode === 'login' ? text.loginAction : mode === 'register' ? text.registerAction : mode === 'recover' ? text.recoverAction : text.changePasswordAction}
          </button>
          {mode === 'login' && <button className="login-text-button" type="button" onClick={() => switchMode('recover')}>{text.forgotPassword}</button>}
          {mode === 'recover' && <button className="login-text-button" type="button" onClick={() => switchMode('login')}>{text.backToLogin}</button>}
        </form>
        {mode === 'change' && user && <p className="login-change-account">{user.username} {text.accountNoun}</p>}
      </section>
      {showLegal && (
        <div className="login-conflict-backdrop" style={{ zIndex: 9999 }} onMouseDown={(e) => { e.stopPropagation(); setShowLegal(false); }}>
          <div className="login-modal" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '600px', height: '80vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--login-border, #eee)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--login-text-primary, #111)' }}>{text.termsLink}</h3>
              <button type="button" className="login-modal-close" onClick={() => setShowLegal(false)} style={{ position: 'static' }}>×</button>
            </div>
            <iframe src={`/legal_${locale}.html`} style={{ flex: 1, border: 'none', width: '100%', backgroundColor: 'var(--login-bg, #fff)' }} title="Legal terms" />
          </div>
        </div>
      )}
    </div>,
  );
}

export function ProfileModal({
  onClose,
}: {
  onClose: () => void;
  autoSavePreference?: AutoSavePreferenceControl;
}) {
  const { user, updateProfile, deleteAccount } = useAuth();
  const { showInviteCode, text } = useLoginUiOptions();
  const [email, setEmail] = useState(user?.email || '');
  const [inviteCode, setInviteCode] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  if (!user) return null;
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      if (isDeleting) {
        await deleteAccount(deletePassword);
        onClose();
        return;
      }
      const result = await updateProfile({
        email: email.trim() || undefined,
        inviteCode: showInviteCode ? inviteCode.trim() || undefined : undefined,
        currentPassword: email.trim().toLowerCase() !== (user.email || '').toLowerCase()
          ? currentPassword
          : undefined,
      });
      setNotice(result.message);
      setInviteCode('');
      setCurrentPassword('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : text.profileSaveError);
    } finally {
      setSubmitting(false);
    }
  };
  return renderAuthOverlay(
    <div className="login-modal-backdrop" data-auth-overlay="true" role="presentation" onMouseDown={onClose}>
      <section className="login-modal" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="login-modal-close" type="button" onClick={onClose} aria-label={text.close}>×</button>
        <h2 id="profile-modal-title">{isDeleting ? text.deleteAccountTitle : text.profileTitle}</h2>
        <p className="login-modal-description">{isDeleting ? text.deleteAccountDescription : (showInviteCode ? text.profileDescriptionWithInvite : text.profileDescriptionEmailOnly)}</p>
        <form className="login-form" onSubmit={handleSubmit}>
          {isDeleting ? (
            <>
              <label>
                <span>{text.passwordLabel}</span>
                <input type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} minLength={1} maxLength={128} required placeholder={text.passwordPlaceholder} />
              </label>
              {error && <p className="login-message error" role="alert">{error}</p>}
              <button className="login-submit danger" type="submit" disabled={submitting}>{submitting ? text.processing : text.deleteAccountConfirm}</button>
              <button className="login-text-button" type="button" disabled={submitting} onClick={() => { setIsDeleting(false); setError(''); }}>{text.close}</button>
            </>
          ) : (
            <>
              <label><span>{text.usernameLabel}</span><input type="text" value={user.username} disabled /></label>
              {showInviteCode && (user.canAccessModeling ? (
                <p className="login-message notice">{text.inviteCodeRegistered}</p>
              ) : (
                <label>
                  <span>{text.inviteCodeLabel} <small>{text.optionalShort}</small></span>
                  <input type="text" value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} autoComplete="off" maxLength={80} placeholder={text.inviteCodePlaceholder} />
                </label>
              ))}
              <label className="login-field-optional">
                <span>{text.emailLabel} <small>{text.emailOptionalHint}</small></span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength={254} placeholder="name@example.com" />
              </label>
              {email.trim().toLowerCase() !== (user.email || '').toLowerCase() && (
                <label>
                  <span>{text.passwordLabel}</span>
                  <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" minLength={1} maxLength={128} required placeholder={text.passwordPlaceholder} />
                </label>
              )}
              {error && <p className="login-message error" role="alert">{error}</p>}
              {notice && <p className="login-message notice" role="status">{notice}</p>}
              <button className="login-submit" type="submit" disabled={submitting}>{submitting ? text.saving : text.saveAction}</button>
              <button className="login-text-button danger" type="button" disabled={submitting} onClick={() => { setIsDeleting(true); setError(''); setNotice(''); }}>{text.deleteAccountAction}</button>
            </>
          )}
        </form>
      </section>
    </div>,
  );
}

export function AccountPanel({
  onLogout,
  autoSavePreference,
}: {
  onLogout?: () => void;
  autoSavePreference?: AutoSavePreferenceControl;
} = {}) {
  const { user, loading, logout } = useAuth();
  const { text } = useLoginUiOptions();
  const [authOpen, setAuthOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      onLogout?.();
    }
  };
  return (
    <>
      {loading ? (
        <div className="login-account-muted">{text.loading}</div>
      ) : user ? (
        <>
          <div className="login-profile">
            <span className="login-avatar">{user.username.slice(0, 1).toUpperCase()}</span>
            <span><strong>{user.username}</strong>{user.email && <small>{user.email}</small>}</span>
          </div>
          {autoSavePreference && (
            <label className="login-checkbox-field" style={{ margin: '20px 0 16px 0', width: '100%', justifyContent: 'flex-start', gap: '8px' }}>
              <input
                type="checkbox"
                checked={autoSavePreference.enabled}
                disabled={autoSavePreference.disabled}
                onChange={(event) => autoSavePreference.onChange(event.target.checked)}
              />
              <span>
                <strong>{text.autoSaveLabel}</strong>
              </span>
            </label>
          )}
          <button type="button" className="login-account-action" onClick={() => setProfileOpen(true)}>{text.editProfile}</button>
          <button type="button" className="login-account-action danger" onClick={handleLogout}>{text.logout}</button>
        </>
      ) : (
        <>
          <p className="login-account-copy">{text.accountCopy}</p>
          <button type="button" className="login-account-button" onClick={() => setAuthOpen(true)}>{text.authButton}</button>
        </>
      )}
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
      {profileOpen && (
        <ProfileModal
          onClose={() => setProfileOpen(false)}
          autoSavePreference={autoSavePreference}
        />
      )}
    </>
  );
}

export function AccountStateConflictDialog({
  open,
  title,
  localSummary,
  remoteSummary,
  busy = false,
  mergeHint,
  onChoose,
}: {
  open: boolean;
  title: string;
  localSummary: string;
  remoteSummary: string;
  busy?: boolean;
  mergeHint?: string;
  onChoose: (choice: AccountStateConflictChoice) => void;
}) {
  const { text } = useLoginUiOptions();
  const [confirmChoice, setConfirmChoice] = useState<AccountStateConflictChoice | null>(null);

  if (!open) {
    if (confirmChoice) setConfirmChoice(null);
    return null;
  }

  const handleConfirm = () => {
    if (confirmChoice) {
      onChoose(confirmChoice);
      setConfirmChoice(null);
    }
  };

  const renderWarningText = (raw: string) => {
    let elements: React.ReactNode[] = [raw];
    const highlight = (phrase: string) => {
      elements = elements.flatMap((el, idx) => {
        if (typeof el !== 'string') return [el];
        const split = el.split(phrase);
        const result: React.ReactNode[] = [];
        for (let i = 0; i < split.length; i++) {
          result.push(split[i]);
          if (i < split.length - 1) {
            result.push(<strong key={`${idx}-${i}-${phrase}`} style={{ color: 'var(--login-error, #d32f2f)' }}>{phrase}</strong>);
          }
        }
        return result;
      });
    };
    
    highlight('로컬 데이터');
    highlight('클라우드 데이터');
    highlight('ローカルデータ');
    highlight('クラウドデータ');
    highlight('local data');
    highlight('cloud data');
    return elements;
  };

  if (confirmChoice) {
    const isRemote = confirmChoice === 'remote';
    const warningText = isRemote ? text.conflictOverwriteWarningRemote : text.conflictOverwriteWarningLocal;
    return renderAuthOverlay(
      <div className="login-conflict-backdrop" data-auth-overlay="true" role="dialog" aria-modal="true">
        <div className="login-conflict-dialog" style={{ maxWidth: '400px' }}>
          <h3 style={{ color: 'var(--login-error, #d32f2f)', marginTop: 0 }}>{text.deleteAccountConfirm || 'Confirm Overwrite'}</h3>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
            {renderWarningText(warningText)}
          </p>
          <div className="login-conflict-actions" style={{ marginTop: '1.5rem', display: 'flex', gap: '8px' }}>
            <button type="button" disabled={busy} onClick={() => setConfirmChoice(null)} style={{ flex: 1 }}>{text.close || 'Cancel'}</button>
            <button type="button" className="danger" disabled={busy} onClick={handleConfirm} style={{ flex: 1, backgroundColor: 'var(--login-error, #d32f2f)', color: '#fff', border: 'none' }}>
              {isRemote ? text.conflictUseRemote : text.conflictUploadLocal}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return renderAuthOverlay(
    <div className="login-conflict-backdrop" data-auth-overlay="true" role="dialog" aria-modal="true" aria-label={title}>
      <div className="login-conflict-dialog">
        <h3>{title}</h3>
        <p>{text.conflictMessage}</p>
        <div className="login-conflict-summary">
          <div><strong>{text.conflictLocal}</strong>{localSummary}</div>
          <div><strong>{text.conflictRemote}</strong>{remoteSummary}</div>
        </div>
        {mergeHint && <p className="login-conflict-hint">{mergeHint}</p>}
        <div className="login-conflict-actions">
          <button type="button" className="primary" disabled={busy} onClick={() => onChoose('merge')}>{busy ? text.processing : text.conflictMerge}</button>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button type="button" disabled={busy} onClick={() => setConfirmChoice('remote')} style={{ flex: 1 }}>{text.conflictUseRemote}</button>
            <button type="button" disabled={busy} onClick={() => setConfirmChoice('local')} style={{ flex: 1 }}>{text.conflictUploadLocal}</button>
          </div>
        </div>
      </div>
    </div>,
  );
}
