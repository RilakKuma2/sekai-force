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
        let isActive = true;

        const loadImages = async () => {
            if (!selectedCharId) {
                setImages([]);
                return;
            }

            setLoading(true); // Keep loading true initially just to reset state, but we won't block UI
            // Actually, we can just use loading for the "Checking..." text at the bottom if we want,
            // or remove it entirely. Let's keep it false mostly or use it for the small indicator.

            // Load cache
            const cacheKey = CACHE_KEY_PREFIX + selectedCharId;
            const cachedData = localStorage.getItem(cacheKey);
            let foundImages: string[] = [];
            let startIndex = 47;

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
                // Pre-populate 001-046
                for (let i = 1; i < 47; i++) {
                    const cardId = i.toString().padStart(3, '0');
                    foundImages.push(`https://asset.rilaksekai.com/face/res0${selectedCharId}_no${cardId}_normal.webp`);
                    foundImages.push(`https://asset.rilaksekai.com/face/res_0${selectedCharId}_no${cardId}_after_training.webp`);
                }
            }

            if (!isActive) return;
            setImages(foundImages); // Render immediately
            setLoading(true); // Show indicator

            // Background Check Loop
            let lastChecked = startIndex - 1;
            const BATCH_SIZE = 5;
            let shouldStop = false;

            for (let i = startIndex; i <= 150; i += BATCH_SIZE) {
                if (!isActive || shouldStop) break;

                const batchPromises = [];
                const currentBatchIds: number[] = [];

                for (let j = 0; j < BATCH_SIZE; j++) {
                    const currentId = i + j;
                    if (currentId > 150) break;
                    currentBatchIds.push(currentId);

                    const cardId = currentId.toString().padStart(3, '0');
                    const normalUrl = `https://asset.rilaksekai.com/face/res0${selectedCharId}_no${cardId}_normal.webp`;
                    const afterUrl = `https://asset.rilaksekai.com/face/res0${selectedCharId}_no${cardId}_after_training.webp`;

                    batchPromises.push(async () => {
                        const normalExists = await checkImageExists(normalUrl);
                        let afterExists = false;
                        if (normalExists) {
                            afterExists = await checkImageExists(afterUrl);
                        }
                        return { id: currentId, normalUrl, afterUrl, normalExists, afterExists };
                    });
                }

                setProgress(`Checking ${currentBatchIds[0]}...`);

                const results = await Promise.all(batchPromises.map(p => p()));
                if (!isActive) break;

                const newImages: string[] = [];

                for (const res of results) {
                    if (res.id >= 30 && !res.normalExists) {
                        shouldStop = true;
                        break;
                    }

                    if (res.normalExists) {
                        newImages.push(res.normalUrl);
                        if (res.afterExists) {
                            newImages.push(res.afterUrl);
                        }
                    }
                    lastChecked = res.id;
                }

                if (newImages.length > 0) {
                    setImages(prev => {
                        const existing = new Set(prev);
                        const uniqueToAdd = newImages.filter(url => !existing.has(url));
                        return [...prev, ...uniqueToAdd];
                    });
                    foundImages.push(...newImages); // Keep local copy for cache
                }
            }

            if (isActive) {
                // Deduplicate before saving to cache
                const uniqueFoundImages = Array.from(new Set(foundImages));
                localStorage.setItem(cacheKey, JSON.stringify({
                    lastChecked: lastChecked,
                    images: uniqueFoundImages
                }));
                setLoading(false);
            }
        };

        loadImages();

        return () => { isActive = false; };
    }, [selectedCharId]);

    // Removed separate fetchImages function

    const checkImageExists = async (url: string): Promise<boolean> => {
        const urlWithTimestamp = `${url}?t=${Date.now()}`;
        try {
            const response = await fetch(urlWithTimestamp, { method: 'HEAD' });
            return response.ok;
        } catch (e) {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve(true);
                img.onerror = () => resolve(false);
                img.src = urlWithTimestamp;
            });
        }
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
                    {loading && (
                        <div className="loading-indicator-small" style={{ position: 'absolute', bottom: '10px', right: '10px', fontSize: '12px', color: '#aaa', backgroundColor: 'rgba(0,0,0,0.7)', padding: '4px 8px', borderRadius: '4px', zIndex: 10 }}>
                            {progress}
                        </div>
                    )}

                    {selectedCharId ? (
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
