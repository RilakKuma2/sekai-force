import React, { useState, useEffect } from 'react';
import { fetchCards, type Card } from '../utils/api';
import './AssetImageSelector.css';

interface AssetImageSelectorProps {
    onSelect: (url: string) => void;
    onClose: () => void;
}

const ID_TO_NAME: Record<string, string> = {
    "01": "이치카", "02": "사키", "03": "호나미", "04": "시호",
    "05": "미노리", "06": "하루카", "07": "아이리", "08": "시즈쿠",
    "09": "코하네", "10": "안", "11": "아키토", "12": "토우야",
    "13": "츠카사", "14": "에무", "15": "네네", "16": "루이",
    "17": "카나데", "18": "마후유", "19": "에나", "20": "미즈키",
    "21": "미쿠", "22": "린", "23": "렌", "24": "루카",
    "25": "메이코", "26": "카이토"
};

const AssetImageSelector: React.FC<AssetImageSelectorProps> = ({ onSelect, onClose }) => {
    const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
    const [allCards, setAllCards] = useState<Card[]>([]);
    const [images, setImages] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    // Character IDs 01 to 26
    const charIds = Array.from({ length: 26 }, (_, i) => (i + 1).toString().padStart(2, '0'));

    useEffect(() => {
        const loadCards = async () => {
            setLoading(true);
            const cards = await fetchCards();
            setAllCards(cards);
            setLoading(false);
        };
        loadCards();
    }, []);

    useEffect(() => {
        if (!selectedCharId) {
            setImages([]);
            return;
        }

        const charName = ID_TO_NAME[selectedCharId];
        if (!charName) return;

        // Filter cards for the selected character
        // Note: VS characters might require checking unit specific logic if needed, 
        // but typically name is sufficient if API normalizes it. 
        // Based on sample, "character": "이치카".
        const charCards = allCards.filter(card => card.character === charName);

        const newImages: string[] = [];

        // Sort cards by ID or release date if possible, but default order is often fine.
        // Let's sort by card_image_id to be safe.
        charCards.sort((a, b) => a.card_image_id.localeCompare(b.card_image_id));

        charCards.forEach(card => {
            // URL Format: https://asset.rilaksekai.com/face/res{charId}_no{cardImageId}_{type}.webp
            // charId in asset URL is 2 digits for characters 1-9? No, typically it matches the ID directly.
            // BUT, the current code used `res0${selectedCharId}` which implies 3 digits if selectedCharId is 2 digits?
            // Wait, previous code: `res0${selectedCharId}`. 
            // If selectedCharId is "01", result is "res001".
            // If selectedCharId is "26", result is "res026".
            // So it seems it expects a 3-digit number.

            // Let's verify: 
            // selectedCharId is "01" to "26".
            // constructing res0${id} -> res001. 
            // So the format is `res{3-digit-char-id}`.
            const resId = `0${selectedCharId}`;

            const normalUrl = `https://asset.rilaksekai.com/face/res${resId}_no${card.card_image_id}_normal.webp`;
            newImages.push(normalUrl);

            // Add after training if rarity >= 3
            if (card.rarity >= 3) {
                const afterUrl = `https://asset.rilaksekai.com/face/res${resId}_no${card.card_image_id}_after_training.webp`;
                newImages.push(afterUrl);
            }
        });

        setImages(newImages);

    }, [selectedCharId, allCards]);

    const handleCharClick = (charId: string) => {
        setSelectedCharId(charId);
    };

    const handleBack = () => {
        setSelectedCharId(null);
    };

    return (
        <div className="asset-selector-overlay" onClick={onClose}>
            <div className="asset-selector-modal" onClick={e => e.stopPropagation()}>
                <div className="asset-selector-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {selectedCharId && (
                            <button className="back-btn" onClick={handleBack}>&lt; 뒤로</button>
                        )}
                        <h3>{selectedCharId ? '카드 선택' : '캐릭터 선택'}</h3>
                    </div>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="asset-selector-content">
                    {loading && !allCards.length && (
                        <div style={{
                            position: 'absolute',
                            top: '50%', left: '50%',
                            transform: 'translate(-50%, -50%)',
                            color: '#fff'
                        }}>
                            데이터 로딩 중...
                        </div>
                    )}

                    {!loading && selectedCharId ? (
                        <div className="card-grid">
                            {images.map((url, index) => (
                                <div key={index} className="card-item" onClick={() => onSelect(url)}>
                                    <img
                                        src={url}
                                        alt="Card"
                                        loading="lazy"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                            (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                                        }}
                                    />
                                </div>
                            ))}
                            {images.length === 0 && (
                                <div style={{ color: '#aaa', gridColumn: '1/-1', textAlign: 'center', marginTop: '20px' }}>
                                    이미지를 찾을 수 없습니다.
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="char-grid">
                            {charIds.map(id => (
                                <div key={id} className="char-item" onClick={() => handleCharClick(id)}>
                                    <img
                                        src={`https://asset.rilaksekai.com/face/res0${id}_no001_normal.webp`}
                                        alt={`Char ${id}`}
                                        loading="lazy"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AssetImageSelector;
