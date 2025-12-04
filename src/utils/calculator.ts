import type { Song } from './api';

export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert' | 'master' | 'append';
export type Rank = 'P' | 'F' | 'C' | '';

export interface UserMusicResult {
    musicId: string;
    musicDifficulty: Difficulty;
    playResult: 'full_perfect' | 'full_combo' | 'clear';
    score: number;
    createdAt: number; // timestamp
    updatedAt: number; // timestamp
}

export interface MusicDifficultyStatus {
    musicId: string;
    musicDifficulty: Difficulty;
    playLevel: number;
    baseLevel: number;
    rank: Rank;
    r: number;
    title: string;
    title_ko: string;
    title_jp: string;
    isExact: boolean;
}

export const calculateR = (playLevel: number, rank: Rank): number => {
    // Based on Musics.vue logic:
    // 'P': 8.0 * (musicDifficulty.playLevel + (musicDifficulty.fullPerfectAdjust || 0)),
    // 'F': 7.5 * (musicDifficulty.playLevel + (musicDifficulty.fullComboAdjust || 0)),
    // 'C': 5.0 * (musicDifficulty.playLevel + (musicDifficulty.playLevelAdjust || 0)),
    // Note: Adjusts are set to 0 as per recent changes in sekai.js

    switch (rank) {
        case 'P':
            return 8.0 * playLevel;
        case 'F':
            return 7.5 * playLevel;
        case 'C':
            return 5.0 * playLevel;
        default:
            return 0.0;
    }
};

export const processUserBest = (songs: Song[], userResults: UserMusicResult[]): { best39: MusicDifficultyStatus[], bestAppend: MusicDifficultyStatus[] } => {
    const others: MusicDifficultyStatus[] = [];
    const appends: MusicDifficultyStatus[] = [];

    // Create a map for quick song lookup
    const songMap = new Map<string, Song>();
    songs.forEach(song => songMap.set(song.id, song));

    userResults.forEach(result => {
        const song = songMap.get(result.musicId);
        if (!song) return;

        let rank: Rank = '';
        if (result.playResult === 'full_perfect') rank = 'P';
        else if (result.playResult === 'full_combo') rank = 'F';
        else if (result.playResult === 'clear') rank = 'C';

        const originalLevel = song.levels[result.musicDifficulty];
        let playLevel = originalLevel;
        let isExact = false;

        // Use precise difficulty values if available, prioritizing specific rank constants
        if (result.musicDifficulty === 'master') {
            if (rank === 'P' && song.mas_ap != null && song.mas_ap > 0) {
                playLevel = Number(song.mas_ap);
                isExact = true;
            } else if (rank === 'F' && song.mas_fc != null && song.mas_fc > 0) {
                playLevel = Number(song.mas_fc);
                isExact = true;
            }
        } else if (result.musicDifficulty === 'append') {
            if (rank === 'P' && song.apd_ap != null && song.apd_ap > 0) {
                playLevel = Number(song.apd_ap);
                isExact = true;
            } else if (rank === 'F' && song.apd_fc != null && song.apd_fc > 0) {
                playLevel = Number(song.apd_fc);
                isExact = true;
            }
        } else if (result.musicDifficulty === 'expert') {
            if (rank === 'P' && song.ex_ap != null && song.ex_ap > 0) {
                playLevel = Number(song.ex_ap);
                isExact = true;
            } else if (rank === 'F' && song.ex_fc != null && song.ex_fc > 0) {
                playLevel = Number(song.ex_fc);
                isExact = true;
            } else if (song.ex_diff != null && song.ex_diff > 0) {
                playLevel = Number(song.ex_diff);
                isExact = true;
            }
        }

        if (playLevel === null || isNaN(playLevel)) return;

        // Ensure originalLevel is treated as number for baseLevel, defaulting to floor of playLevel
        const baseLevel = originalLevel !== null ? originalLevel : Math.floor(playLevel + (isExact ? 0.4 : 0));

        const r = calculateR(playLevel, rank);

        const status: MusicDifficultyStatus = {
            musicId: result.musicId,
            musicDifficulty: result.musicDifficulty,
            playLevel: playLevel,
            baseLevel: baseLevel,
            rank: rank,
            r: r,
            title: song.title_ko || song.title_jp,
            title_ko: song.title_ko,
            title_jp: song.title_jp,
            isExact: isExact
        };

        if (result.musicDifficulty === 'append') {
            appends.push(status);
        } else {
            others.push(status);
        }
    });

    // Sort by R descending
    const best39 = others.filter(s => s.r > 0).sort((a, b) => b.r - a.r).slice(0, 39);
    const bestAppend = appends.filter(s => s.r > 0).sort((a, b) => b.r - a.r).slice(0, 13);

    return { best39, bestAppend };
};



export const calculateTotalR = (best39: MusicDifficultyStatus[]): number => {
    return best39.reduce((sum, status) => sum + Math.round(status.r), 0);
};

export const calculateAppendR = (bestAppend: MusicDifficultyStatus[]): number => {
    const sumAppend = bestAppend.reduce((sum, status) => sum + Math.round(status.r), 0);
    return sumAppend * 3;
};
