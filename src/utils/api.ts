import axios from 'axios';

export interface SongLevel {
    easy: number | null;
    normal: number | null;
    hard: number | null;
    expert: number | null;
    master: number | null;
    append: number | null;
}

export interface Card {
    id: number;
    title: string;
    card_image_id: string;
    character: string;
    unit: string;
    support_unit: string | null;
    type: string;
    attribute: string;
    rarity: number;
    power: number;
    available_from: string;
    event: string | null;
    skill_effect: string;
    title_kr: string;
}

export interface Song {
    id: string;
    title_ko: string;
    title_jp: string;
    title_hi?: string;
    title_hangul?: string;
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

    ex_diff?: number;
    ex_fc?: number;
    mas_fc?: number;
    apd_fc?: number;
    mas_ap?: number;
    apd_ap?: number;
    ex_ap?: number;
}

export const fetchSongs = async (): Promise<Song[]> => {
    try {
        const response = await axios.get<Song[]>('https://api.rilaksekai.com/api/songs');
        if (Array.isArray(response.data)) {
            return response.data;
        } else {
            console.error("API response is not an array:", response.data);
            return [];
        }
    } catch (error) {
        console.error("Failed to fetch songs:", error);
        return [];
    }
};

export const fetchCards = async (): Promise<Card[]> => {
    try {
        const response = await axios.get<Card[]>('https://api.rilaksekai.com/api/cards');
        if (Array.isArray(response.data)) {
            return response.data;
        } else {
            console.error("API response is not an array:", response.data);
            return [];
        }
    } catch (error) {
        console.error("Failed to fetch cards:", error);
        return [];
    }
};
