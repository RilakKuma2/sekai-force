import React, { useState, useEffect } from 'react';
import './AssetImageSelector.css';

interface AssetImageSelectorProps {
    onSelect: (url: string) => void;
    onClose: () => void;
}

const AssetImageSelector: React.FC<AssetImageSelectorProps> = ({ onSelect, onClose }) => {
    const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
    const [images, setImages] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState('');

    const CACHE_KEY_PREFIX = 'asset_selector_cache_';

    // Character IDs 01 to 26
    const charIds = Array.from({ length: 26 }, (_, i) => (i + 1).toString().padStart(2, '0'));

    useEffect(() => {
        if (selectedCharId) {
            fetchImages(selectedCharId);
        } else {
            setImages([]);
        }
    }, [selectedCharId]);

    const fetchImages = async (charId: string) => {
        setLoading(true);
        setImages([]);

        // Load cache
        const cacheKey = CACHE_KEY_PREFIX + charId;
        const cachedData = localStorage.getItem(cacheKey);
        let foundImages: string[] = [];
        let startIndex = 47; // Default start index as requested

        if (cachedData) {
            try {
                const parsed = JSON.parse(cachedData);
                if (parsed.images && Array.isArray(parsed.images)) {
                    foundImages = parsed.images;
                }
                if (parsed.lastChecked && typeof parsed.lastChecked === 'number') {
                    startIndex = parsed.lastChecked + 1;
                }
            } catch (e) {
                console.error("Failed to parse asset cache", e);
            }
        } else {
            // If no cache, pre-populate 001-046 assuming they exist (based on user request to start searching from 047)
            // We blindly add normal and after_training for 001-046 to the list?
            // User said "047부터 검색하게 하고" (Make it search from 047).
            // This implies we should skip checking 1-46. But we need the URLs in the list.
            // Let's assume 1-46 exist and add them.
            for (let i = 1; i < 47; i++) {
                const cardId = i.toString().padStart(3, '0');
                foundImages.push(`https://asset.rilaksekai.com/face/${charId}/${cardId}_normal.webp`);
                foundImages.push(`https://asset.rilaksekai.com/face/${charId}/${cardId}_after_training.webp`);
                // Note: blindly adding after_training might result in broken images if it doesn't exist.
                // But checking 46 * 2 images takes time.
                // Let's check them quickly? Or just trust the user?
                // Given "too slow", let's trust the user but maybe add an error handler on the img tag to hide broken ones?
                // For now, let's just add them.
            }
        }

        // Loop limit 150
        let lastChecked = startIndex - 1;
        for (let i = startIndex; i <= 150; i++) {
            const cardId = i.toString().padStart(3, '0');
            setProgress(`Checking card ${cardId}...`);

            const normalUrl = `https://asset.rilaksekai.com/face/${charId}/${cardId}_normal.webp`;
            const afterUrl = `https://asset.rilaksekai.com/face/${charId}/${cardId}_after_training.webp`;

            const normalExists = await checkImageExists(normalUrl);

            // Stop condition: cardId >= 30 AND normal image does not exist
            // (Since we start at 47, this condition is always active for the loop)
            if (i >= 30 && !normalExists) {
                lastChecked = i - 1; // The last valid one was previous
                break;
            }

            if (normalExists) {
                foundImages.push(normalUrl);
                // Check after_training only if normal exists
                const afterExists = await checkImageExists(afterUrl);
                if (afterExists) {
                    foundImages.push(afterUrl);
                }
            }
            lastChecked = i;
        }

        // Save to cache
        localStorage.setItem(cacheKey, JSON.stringify({
            lastChecked: lastChecked,
            images: foundImages
        }));

        setImages(foundImages);
        setLoading(false);
    };

    const checkImageExists = (url: string): Promise<boolean> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
        });
    };

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
                    {loading ? (
                        <div className="loading-container">
                            <div className="loading-spinner"></div>
                            <div>{progress}</div>
                        </div>
                    ) : (
                        selectedCharId ? (
                            <div className="card-grid">
                                {images.map((url, index) => (
                                    <div key={index} className="card-item" onClick={() => onSelect(url)}>
                                        <img
                                            src={url}
                                            alt="Card"
                                            loading="lazy"
                                            onError={(e) => {
                                                // Hide broken images if we blindly added them
                                                (e.target as HTMLImageElement).style.display = 'none';
                                                (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                                            }}
                                        />
                                    </div>
                                ))}
                                {images.length === 0 && !loading && (
                                    <div style={{ color: '#aaa', gridColumn: '1/-1', textAlign: 'center' }}>
                                        이미지가 없습니다.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="char-grid">
                                {charIds.map(id => (
                                    <div key={id} className="char-item" onClick={() => handleCharClick(id)}>
                                        <img
                                            src={`https://asset.rilaksekai.com/face/${id}/001_normal.webp`}
                                            alt={`Char ${id}`}
                                            loading="lazy"
                                        />
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default AssetImageSelector;
