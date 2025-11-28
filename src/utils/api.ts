import axios from 'axios';

export interface SongLevel {
    easy: number | null;
    normal: number | null;
    hard: number | null;
    expert: number | null;
    master: number | null;
    append: number | null;
}

export interface Song {
    id: string;
    title_ko: string;
    title_jp: string;
    unit_code: string;
    release_date: string;
    bpm: number | string;
    levels: SongLevel;
    length: string;
    mv_type: string;
    composer: string;
    composer_jp: string;
    classification: string;
    ver: string;
    apd: string;
    mas_diff?: number;
    apd_diff?: number;
}

export const fetchSongs = async (): Promise<Song[]> => {
    const response = await axios.get<Song[]>('/api/songs');
    return response.data;
};
